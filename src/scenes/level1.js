import { CONFIG, getColor, isAnyKeyDown } from '../config.js'
import * as SFX from '../audio/sfx.js'

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
    
    // Создаём инстанс звуковых эффектов (получаем AudioContext)
    const sfx = SFX.create()
    
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
      k.z(CONFIG.visual.zIndex.player),
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
        SFX.playLandSound(sfx) // Звук приземления
        const roundedX = Math.round(player.eyeOffsetX)
        const roundedY = Math.round(player.eyeOffsetY)
        const heroSpriteName = `hero_${roundedX}_${roundedY}`
        player.use(k.sprite(heroSpriteName))
        player.currentEyeSprite = heroSpriteName
      }
    })
    
    // ============================================
    // АНТИ-ГЕРОЙ в правом нижнем углу
    // ============================================
    // Вычисляем Y координату так, чтобы анти-герой стоял НА платформе
    const antiHeroY = k.height() - platformHeight - (CONFIG.gameplay.collisionHeight / 2) * CONFIG.gameplay.heroScale
    
    const antiHero = k.add([
      k.sprite('antihero_0_0'), // Используем спрайт анти-героя с глазами
      k.pos(k.width() - 100, antiHeroY), // Правый нижний угол, стоит на платформе
      k.area({
        shape: new k.Rect(
          k.vec2(CONFIG.gameplay.collisionOffsetX, CONFIG.gameplay.collisionOffsetY), 
          CONFIG.gameplay.collisionWidth, 
          CONFIG.gameplay.collisionHeight
        ),
        collisionIgnore: []
      }),
      k.body(), // Добавляем физику - гравитация будет влиять
      k.anchor("center"),
      k.scale(CONFIG.gameplay.heroScale),
      k.z(CONFIG.visual.zIndex.player),
    ])
    
    // Переменные для анимации глаз анти-героя
    antiHero.eyeOffsetX = 0
    antiHero.eyeOffsetY = 0
    antiHero.targetEyeX = 0
    antiHero.targetEyeY = 0
    antiHero.eyeTimer = 0
    antiHero.currentEyeSprite = null
    
    // ============================================
    // АННИГИЛЯЦИЯ при столкновении
    // ============================================
    let isAnnihilating = false
    
    player.onCollide("annihilationTarget", () => {
      if (!isAnnihilating) {
        isAnnihilating = true
        
        // Останавливаем управление
        player.paused = true
        antiHero.paused = true
        
        // Центр между персонажами
        const centerX = (player.pos.x + antiHero.pos.x) / 2
        const centerY = (player.pos.y + antiHero.pos.y) / 2
        
        // ============================================
        // ФАЗА 1: МИГАНИЕ ПЕРСОНАЖЕЙ (0.3 сек)
        // ============================================
        let blinkTime = 0
        const blinkDuration = 0.3
        const blinkSpeed = 20 // Быстрое мигание
        
        const blinkInterval = k.onUpdate(() => {
          blinkTime += k.dt()
          if (blinkTime < blinkDuration) {
            const visible = Math.floor(blinkTime * blinkSpeed) % 2 === 0
            player.opacity = visible ? 1 : 0.3
            antiHero.opacity = visible ? 1 : 0.3
          } else {
            player.opacity = 1
            antiHero.opacity = 1
            blinkInterval.cancel()
            
            // ============================================
            // ФАЗА 2: ПРИТЯЖЕНИЕ К ЦЕНТРУ (0.25 сек)
            // ============================================
            const pullDuration = 0.25
            let pullTime = 0
            const startPlayerPos = k.vec2(player.pos.x, player.pos.y)
            const startAntiHeroPos = k.vec2(antiHero.pos.x, antiHero.pos.y)
            
            const pullInterval = k.onUpdate(() => {
              pullTime += k.dt()
              const progress = Math.min(pullTime / pullDuration, 1)
              const easeProgress = 1 - Math.pow(1 - progress, 3) // Ease-out cubic
              
              player.pos.x = startPlayerPos.x + (centerX - startPlayerPos.x) * easeProgress
              player.pos.y = startPlayerPos.y + (centerY - startPlayerPos.y) * easeProgress
              antiHero.pos.x = startAntiHeroPos.x + (centerX - startAntiHeroPos.x) * easeProgress
              antiHero.pos.y = startAntiHeroPos.y + (centerY - startAntiHeroPos.y) * easeProgress
              
              if (pullTime >= pullDuration) {
                pullInterval.cancel()
                
                // ============================================
                // ФАЗА 3: СХЛОПЫВАНИЕ И ЭФФЕКТЫ
                // ============================================
                
                // ЗВУК АННИГИЛЯЦИИ (низкий мощный)
                const now = sfx.currentTime
                
                // Глубокий бас
                const bass = sfx.createOscillator()
                const bassGain = sfx.createGain()
                bass.type = 'sine'
                bass.frequency.setValueAtTime(50, now)
                bass.frequency.exponentialRampToValueAtTime(20, now + 0.5)
                bassGain.gain.setValueAtTime(0.7, now)
                bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5)
                bass.connect(bassGain)
                bassGain.connect(sfx.destination)
                bass.start(now)
                bass.stop(now + 0.5)
                
                // Очень низкий "гул"
                const subBass = sfx.createOscillator()
                const subBassGain = sfx.createGain()
                subBass.type = 'sine'
                subBass.frequency.setValueAtTime(30, now)
                subBassGain.gain.setValueAtTime(0.6, now)
                subBassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6)
                subBass.connect(subBassGain)
                subBassGain.connect(sfx.destination)
                subBass.start(now)
                subBass.stop(now + 0.6)
                
                // ВСПЫШКА ЭКРАНА
                const screenFlash = k.add([
                  k.rect(k.width(), k.height()),
                  k.pos(0, 0),
                  k.color(255, 255, 255),
                  k.opacity(1),
                  k.fixed(),
                  k.z(CONFIG.visual.zIndex.ui + 1)
                ])
                
                let flashTime = 0
                screenFlash.onUpdate(() => {
                  flashTime += k.dt()
                  screenFlash.opacity = Math.max(0, 1 - flashTime * 8)
                  if (flashTime > 0.125) {
                    k.destroy(screenFlash)
                  }
                })
                
                // ТРЯСКА КАМЕРЫ
                let shakeTime = 0
                const shakeIntensity = 15
                const originalCamX = k.width() / 2
                const originalCamY = k.height() / 2
                
                const shakeInterval = k.onUpdate(() => {
                  shakeTime += k.dt()
                  if (shakeTime < 0.4) {
                    const intensity = shakeIntensity * (1 - shakeTime / 0.4)
                    k.camPos(
                      originalCamX + k.rand(-intensity, intensity),
                      originalCamY + k.rand(-intensity, intensity)
                    )
                  } else {
                    k.camPos(originalCamX, originalCamY)
                    shakeInterval.cancel()
                  }
                })
                
                // ============================================
                // ЧАСТИЦЫ - выберите один из вариантов:
                // ============================================
                
                const allColors = [
                  CONFIG.colors.hero.body,
                  CONFIG.colors.hero.outline,
                  CONFIG.colors.antiHero.body,
                  CONFIG.colors.antiHero.outline,
                ]
                
                // ВАРИАНТ 1: "ПИКСЕЛЬНЫЙ ВЗРЫВ" - много мелких квадратов
                // ============================================
                const pixelCount1 = 24
                for (let i = 0; i < pixelCount1; i++) {
                  const angle = (Math.PI * 2 * i) / pixelCount1 + k.rand(-0.3, 0.3)
                  const speed = k.rand(100, 400)
                  const size = k.rand(3, 7)
                  const color = k.choose(allColors)
                  
                  const pixel = k.add([
                    k.rect(size, size),
                    k.pos(centerX, centerY),
                    k.color(color[0], color[1], color[2]),
                    k.anchor("center"),
                    k.rotate(k.rand(0, 360)),
                    k.z(CONFIG.visual.zIndex.player)
                  ])
                  
                  pixel.vx = Math.cos(angle) * speed
                  pixel.vy = Math.sin(angle) * speed
                  pixel.lifetime = 0
                  pixel.rotSpeed = k.rand(-720, 720)
                  
                  pixel.onUpdate(() => {
                    pixel.lifetime += k.dt()
                    pixel.pos.x += pixel.vx * k.dt()
                    pixel.pos.y += pixel.vy * k.dt()
                    pixel.angle += pixel.rotSpeed * k.dt()
                    pixel.opacity = Math.max(0, 1 - pixel.lifetime * 2.5)
                    
                    if (pixel.lifetime > 0.4) {
                      k.destroy(pixel)
                    }
                  })
                }
                
                // ВАРИАНТ 2: "ВОЛНЫ" - 3 волны частиц с задержкой
                // ============================================
                for (let wave = 0; wave < 3; wave++) {
                  k.wait(wave * 0.1, () => {
                    const waveCount = 8
                    for (let i = 0; i < waveCount; i++) {
                      const angle = (Math.PI * 2 * i) / waveCount
                      const speed = 200 + wave * 100
                      const size = 8 - wave * 2
                      const color = k.choose(allColors)
                      
                      const pixel = k.add([
                        k.rect(size, size),
                        k.pos(centerX, centerY),
                        k.color(color[0], color[1], color[2]),
                        k.anchor("center"),
                        k.z(CONFIG.visual.zIndex.player)
                      ])
                      
                      pixel.vx = Math.cos(angle) * speed
                      pixel.vy = Math.sin(angle) * speed
                      pixel.lifetime = 0
                      
                      pixel.onUpdate(() => {
                        pixel.lifetime += k.dt()
                        pixel.pos.x += pixel.vx * k.dt()
                        pixel.pos.y += pixel.vy * k.dt()
                        pixel.opacity = Math.max(0, 1 - pixel.lifetime * 3)
                        
                        if (pixel.lifetime > 0.33) {
                          k.destroy(pixel)
                        }
                      })
                    }
                  })
                }
                
                // ВАРИАНТ 3: "КРЕСТ" - частицы строго по 4 направлениям
                // ============================================
                const directions = [
                  { x: 1, y: 0 },   // Вправо
                  { x: -1, y: 0 },  // Влево
                  { x: 0, y: -1 },  // Вверх
                  { x: 0, y: 1 },   // Вниз
                ]
                
                directions.forEach((dir, idx) => {
                  for (let j = 0; j < 5; j++) {
                    k.wait(j * 0.03, () => {
                      const speed = 200 + j * 50
                      const size = 8 - j
                      const color = allColors[idx % allColors.length]
                      
                      const pixel = k.add([
                        k.rect(size, size),
                        k.pos(centerX, centerY),
                        k.color(color[0], color[1], color[2]),
                        k.anchor("center"),
                        k.z(CONFIG.visual.zIndex.player)
                      ])
                      
                      pixel.vx = dir.x * speed
                      pixel.vy = dir.y * speed
                      pixel.lifetime = 0
                      
                      pixel.onUpdate(() => {
                        pixel.lifetime += k.dt()
                        pixel.pos.x += pixel.vx * k.dt()
                        pixel.pos.y += pixel.vy * k.dt()
                        pixel.opacity = Math.max(0, 1 - pixel.lifetime * 2.5)
                        
                        if (pixel.lifetime > 0.4) {
                          k.destroy(pixel)
                        }
                      })
                    })
                  }
                })
                
                // ВАРИАНТ 4: "ФЕЙЕРВЕРК" - вверх, потом в стороны
                // ============================================
                const sparkCount = 6
                for (let i = 0; i < sparkCount; i++) {
                  const upSpeed = k.rand(-400, -200)
                  const sideSpeed = k.rand(-50, 50)
                  const color = k.choose(allColors)
                  
                  const spark = k.add([
                    k.rect(6, 6),
                    k.pos(centerX, centerY),
                    k.color(color[0], color[1], color[2]),
                    k.anchor("center"),
                    k.z(CONFIG.visual.zIndex.player)
                  ])
                  
                  spark.vx = sideSpeed
                  spark.vy = upSpeed
                  spark.lifetime = 0
                  spark.hasExploded = false
                  
                  spark.onUpdate(() => {
                    spark.lifetime += k.dt()
                    
                    // Гравитация
                    spark.vy += CONFIG.gameplay.gravity * k.dt()
                    
                    spark.pos.x += spark.vx * k.dt()
                    spark.pos.y += spark.vy * k.dt()
                    
                    // Взрыв на вершине траектории
                    if (!spark.hasExploded && spark.vy > 0 && spark.lifetime > 0.15) {
                      spark.hasExploded = true
                      
                      // Мини-взрыв
                      for (let j = 0; j < 6; j++) {
                        const angle = (Math.PI * 2 * j) / 6
                        const miniSpeed = 100
                        const miniColor = k.choose(allColors)
                        
                        const mini = k.add([
                          k.rect(3, 3),
                          k.pos(spark.pos.x, spark.pos.y),
                          k.color(miniColor[0], miniColor[1], miniColor[2]),
                          k.anchor("center"),
                          k.z(CONFIG.visual.zIndex.player)
                        ])
                        
                        mini.vx = Math.cos(angle) * miniSpeed
                        mini.vy = Math.sin(angle) * miniSpeed
                        mini.lifetime = 0
                        
                        mini.onUpdate(() => {
                          mini.lifetime += k.dt()
                          mini.pos.x += mini.vx * k.dt()
                          mini.pos.y += mini.vy * k.dt()
                          mini.opacity = Math.max(0, 1 - mini.lifetime * 4)
                          
                          if (mini.lifetime > 0.25) {
                            k.destroy(mini)
                          }
                        })
                      }
                    }
                    
                    spark.opacity = Math.max(0, 1 - spark.lifetime * 2)
                    
                    if (spark.lifetime > 0.5) {
                      k.destroy(spark)
                    }
                  })
                }
                
                // Скрываем персонажей
                k.destroy(player)
                k.destroy(antiHero)
                
                // Переход на следующий уровень
                k.wait(1.2, () => {
                  k.go("level2")
                })
              }
            })
          }
        })
      }
    })
    
    // Добавляем тег для столкновения к анти-герою
    antiHero.use("annihilationTarget")
    
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
            SFX.playStepSound(sfx)
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
      
      // ============================================
      // АНИМАЦИЯ ГЛАЗ АНТИ-ГЕРОЯ (idle mode)
      // ============================================
      antiHero.eyeTimer += k.dt()
      
      // Выбираем новую целевую позицию для глаз анти-героя
      if (antiHero.eyeTimer > k.rand(CONFIG.gameplay.eyeAnimMinDelay, CONFIG.gameplay.eyeAnimMaxDelay)) {
        antiHero.targetEyeX = k.choose([-1, 0, 1])
        antiHero.targetEyeY = k.choose([-1, 0, 1])
        antiHero.eyeTimer = 0
      }
      
      // Плавно интерполируем к целевой позиции
      antiHero.eyeOffsetX = k.lerp(antiHero.eyeOffsetX, antiHero.targetEyeX, CONFIG.gameplay.eyeLerpSpeed)
      antiHero.eyeOffsetY = k.lerp(antiHero.eyeOffsetY, antiHero.targetEyeY, CONFIG.gameplay.eyeLerpSpeed)
      
      // Округляем для пиксель-арт стиля
      const antiHeroRoundedX = Math.round(antiHero.eyeOffsetX)
      const antiHeroRoundedY = Math.round(antiHero.eyeOffsetY)
      
      // Переключаем на предзагруженный спрайт анти-героя с глазами
      const antiHeroSpriteName = `antihero_${antiHeroRoundedX}_${antiHeroRoundedY}`
      
      // Обновляем спрайт только если позиция глаз изменилась
      if (antiHero.currentEyeSprite !== antiHeroSpriteName) {
        antiHero.use(k.sprite(antiHeroSpriteName))
        antiHero.currentEyeSprite = antiHeroSpriteName
      }
      
      // ============================================
      
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

