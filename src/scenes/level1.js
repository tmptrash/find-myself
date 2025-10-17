import { CONFIG, getColor, isAnyKeyDown } from '../config.js'

export function level1Scene(k) {
  k.scene("level1", () => {
    // ========================================
    // TIME-BASED СИСТЕМА: независима от FPS
    // ========================================
    // Все параметры импортированы из глобального CONFIG
    
    const MOVE_SPEED = CONFIG.gameplay.moveSpeed
    const JUMP_FORCE = CONFIG.gameplay.jumpForce
    const GRAVITY = CONFIG.gameplay.gravity
    const RUN_ANIM_SPEED = CONFIG.gameplay.runAnimSpeed
    
    k.setGravity(GRAVITY)
    
    // Используем глобальный аудио контекст
    const audioContext = window.gameAudioContext
    
    // Функция для звука приземления
    function playLandSound() {
      const now = audioContext.currentTime
      
      // Легкий мягкий звук приземления
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(CONFIG.audio.sfx.landFreqStart, now)
      oscillator.frequency.exponentialRampToValueAtTime(CONFIG.audio.sfx.landFreqEnd, now + 0.08)
      
      gainNode.gain.setValueAtTime(CONFIG.audio.sfx.landVolume, now)
      gainNode.gain.exponentialRampToValueAtTime(CONFIG.audio.sfx.landFade, now + CONFIG.audio.sfx.landDuration)
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator.start(now)
      oscillator.stop(now + CONFIG.audio.sfx.landDuration)
    }
    
    // Функция для звука шагов при беге
    function playStepSound() {
      const now = audioContext.currentTime
      
      // Короткий щелчок для шага
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(CONFIG.audio.sfx.stepFreqStart, now)
      oscillator.frequency.exponentialRampToValueAtTime(CONFIG.audio.sfx.stepFreqEnd, now + 0.03)
      
      gainNode.gain.setValueAtTime(CONFIG.audio.sfx.stepVolume, now)
      gainNode.gain.exponentialRampToValueAtTime(CONFIG.audio.sfx.stepFade, now + CONFIG.audio.sfx.stepDuration)
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator.start(now)
      oscillator.stop(now + CONFIG.audio.sfx.stepDuration)
    }
    
    // Фон - фиксированный к камере
    k.add([
      k.rect(k.width(), k.height()),
      getColor(k, CONFIG.colors.level1.background),
      k.pos(0, 0),
      k.fixed(),
      k.z(CONFIG.visual.zIndex.background)
    ])
    
    // Создаем платформы
    function addPlatform(x, y, width, height) {
      return k.add([
        k.rect(width, height),
        k.pos(x, y),
        k.area(),
        k.body({ isStatic: true }),
        getColor(k, CONFIG.colors.level1.platform),
        "platform"
      ])
    }
    
    const platformHeight = CONFIG.visual.platformHeight
    const wallWidth = CONFIG.visual.wallWidth
    
    // Нижняя платформа (широкая)
    addPlatform(0, k.height() - platformHeight, k.width(), platformHeight)
    
    // Верхняя платформа (широкая, той же высоты)
    addPlatform(0, 0, k.width(), platformHeight)
    
    // Левая стена (коридор)
    addPlatform(0, platformHeight, wallWidth, k.height() - platformHeight * 2)
    
    // Правая стена (коридор)
    addPlatform(k.width() - wallWidth, platformHeight, wallWidth, k.height() - platformHeight * 2)
    
    // Добавляем героя (падает на нижнюю платформу)
    const startX = CONFIG.levels.level1.startPosX === 'center' ? k.width() / 2 : CONFIG.levels.level1.startPosX
    const player = k.add([
      k.sprite('hero_0_0'), // Используем спрайт с глазами
      k.pos(startX, CONFIG.levels.level1.startPosY),
      k.area({
        shape: new k.Rect(
          k.vec2(CONFIG.gameplay.collisionOffsetX, CONFIG.gameplay.collisionOffsetY), 
          CONFIG.gameplay.collisionWidth, 
          CONFIG.gameplay.collisionHeight
        ),
        collisionIgnore: []
      }),
      k.body(),
      k.anchor("center"),
      k.scale(CONFIG.gameplay.heroScale),
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
          player.runFrame = (player.runFrame + 1) % CONFIG.gameplay.runFrameCount
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
        
        // Выбираем новую целевую позицию
        if (player.eyeTimer > k.rand(CONFIG.gameplay.eyeAnimMinDelay, CONFIG.gameplay.eyeAnimMaxDelay)) {
          player.targetEyeX = k.choose([-1, 0, 1])
          player.targetEyeY = k.choose([-1, 0, 1])
          player.eyeTimer = 0
        }
        
        // Плавно интерполируем к целевой позиции
        player.eyeOffsetX = k.lerp(player.eyeOffsetX, player.targetEyeX, CONFIG.gameplay.eyeLerpSpeed)
        player.eyeOffsetY = k.lerp(player.eyeOffsetY, player.targetEyeY, CONFIG.gameplay.eyeLerpSpeed)
        
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
      
      // Ограничиваем игрока в пределах коридора (используем конфиг)
      const leftBound = CONFIG.visual.playerBounds.leftOffset
      const rightBound = k.width() - CONFIG.visual.playerBounds.rightOffset
      const topBound = CONFIG.visual.playerBounds.topOffset
      const bottomBound = k.height() - CONFIG.visual.playerBounds.bottomOffset
      
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
    
    // Управление движением (используем конфиг)
    CONFIG.controls.moveLeft.forEach(key => {
      k.onKeyDown(key, () => {
        player.move(-player.speed, 0)
        player.direction = -1
      })
    })
    
    CONFIG.controls.moveRight.forEach(key => {
      k.onKeyDown(key, () => {
        player.move(player.speed, 0)
        player.direction = 1
      })
    })
    
    // Прыжок (используем конфиг)
    CONFIG.controls.jump.forEach(key => {
      k.onKeyPress(key, () => {
        if (player.canJump) {
          player.vel.y = -player.myJumpForce
          player.canJump = false
        }
      })
    })
    
    // Инструкции
    const instructions = k.add([
      k.text("WASD/← ↑ → - Move\nSpace - jump\nESC - menu", {
        size: CONFIG.visual.instructionsFontSize,
        width: k.width() - 40
      }),
      k.pos(CONFIG.visual.instructionsX, CONFIG.visual.instructionsY),
      getColor(k, CONFIG.colors.level1.instructions),
      k.z(CONFIG.visual.zIndex.ui),
      k.fixed() // Фиксируем к экрану
    ])
    
    // Дебаг информация (в правом верхнем углу)
    const debugText = k.add([
      k.text("", { size: CONFIG.visual.debugFontSize }),
      k.pos(k.width() + CONFIG.visual.debugX, CONFIG.visual.debugY),
      getColor(k, CONFIG.colors.level1.debug),
      k.z(CONFIG.visual.zIndex.ui),
      k.fixed()
    ])
    
    // Инициализация дебаг режима из конфига
    let debugMode = CONFIG.debug.startInDebugMode
    
    // Переключение дебаг режима (используем конфиг)
    CONFIG.controls.toggleDebug.forEach(key => {
      k.onKeyPress(key, () => {
        debugMode = !debugMode
      })
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
    
    // Возврат в меню (используем конфиг)
    CONFIG.controls.backToMenu.forEach(key => {
      k.onKeyPress(key, () => {
        k.go("menu")
      })
    })
  })
}

