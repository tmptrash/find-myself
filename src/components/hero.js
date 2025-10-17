import { CONFIG, getHex, isAnyKeyDown } from '../config.js'
import * as SFX from '../audio/sfx.js'

// ============================================
// УНИВЕРСАЛЬНАЯ ФУНКЦИЯ ДЛЯ СОЗДАНИЯ ПЕРСОНАЖА
// ============================================
// Одна функция для героя и анти-героя
// type: 'hero' или 'antihero'
// animation: 'idle', 'run', 'jump'
// frame: номер кадра (для анимаций)
// eyeOffsetX, eyeOffsetY: смещение зрачков

function createCharacterFrame(type = 'hero', animation = 'idle', frame = 0, eyeOffsetX = 0, eyeOffsetY = 0) {
  // Выбираем цветовую схему на основе типа
  const colors = type === 'hero' ? CONFIG.colors.hero : CONFIG.colors.antiHero
  
  const size = 32
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  
  ctx.clearRect(0, 0, size, size)
  
  // Базовые параметры для разных анимаций
  let headY = 6
  let bodyY = 14
  let headX = 12
  let bodyX = 10
  let leftArmY = 15
  let rightArmY = 15
  let leftLegY = 22
  let rightLegY = 22
  let leftArmX = 9
  let rightArmX = 21
  let leftLegX = 12
  let rightLegX = 17
  
  // Анимация бега (6 кадров)
  if (animation === 'run') {
    if (frame === 0) {
      leftLegY = 20
      rightLegY = 22
      leftLegX = 10
      rightLegX = 18
    } else if (frame === 1) {
      leftLegY = 18
      rightLegY = 22
      leftLegX = 12
      rightLegX = 17
    } else if (frame === 2) {
      leftLegY = 20
      rightLegY = 20
      leftLegX = 14
      rightLegX = 14
    } else if (frame === 3) {
      leftLegY = 22
      rightLegY = 20
      leftLegX = 18
      rightLegX = 10
    } else if (frame === 4) {
      leftLegY = 22
      rightLegY = 18
      leftLegX = 17
      rightLegX = 12
    } else if (frame === 5) {
      leftLegY = 20
      rightLegY = 20
      leftLegX = 14
      rightLegX = 14
    }
  }
  
  // Анимация прыжка - боковой вид, ноги согнуты и разведены
  if (animation === 'jump') {
    headY = 6
    bodyY = 14
    headX = 12
    bodyX = 10
    leftArmY = 15
    rightArmY = 15
    // Правая нога спереди - согнута сильнее (выше)
    rightLegY = 20
    rightLegX = 18
    // Левая нога сзади - согнута меньше (ниже)
    leftLegY = 22
    leftLegX = 10
    leftArmX = 9
    rightArmX = 21
  }
  
  // Черный контур (универсальный)
  ctx.fillStyle = getHex(colors.outline)
  ctx.fillRect(headX - 1, headY - 1, 10, 10)
  
  // Контур тела (для всех анимаций одинаковый)
  ctx.fillRect(bodyX - 1, bodyY - 1, 14, 10)
  
  // Контуры рук - не рисуем при беге и прыжке
  if (animation !== 'run' && animation !== 'jump') {
    ctx.fillRect(leftArmX - 1, leftArmY - 1, 4, 9)
    ctx.fillRect(rightArmX - 1, rightArmY - 1, 4, 9)
  }
  
  // Контуры ног (для всех анимаций одинаковые)
  ctx.fillRect(leftLegX - 1, leftLegY - 1, 5, 8)
  ctx.fillRect(rightLegX - 1, rightLegY - 1, 5, 8)
  
  // Голова (универсальный цвет тела)
  ctx.fillStyle = getHex(colors.body)
  ctx.fillRect(headX, headY, 8, 8)
  
  // Глаза - для бега и прыжка рисуем только ОДИН глаз (боковой вид)
  ctx.fillStyle = getHex(colors.eyeWhite)
  if (animation === 'run' || animation === 'jump') {
    ctx.fillRect(headX + 6, headY + 2, 3, 3)
  } else {
    ctx.fillRect(headX + 1, headY + 2, 3, 3)
    ctx.fillRect(headX + 6, headY + 2, 3, 3)
  }
  
  // Зрачки (универсальный цвет)
  ctx.fillStyle = getHex(colors.outline)
  if (animation === 'run' || animation === 'jump') {
    ctx.fillRect(headX + 7, headY + 3, 1, 1)
  } else {
    ctx.fillRect(headX + 2 + eyeOffsetX, headY + 3 + eyeOffsetY, 1, 1)
    ctx.fillRect(headX + 7 + eyeOffsetX, headY + 3 + eyeOffsetY, 1, 1)
  }
  
  // Тело (универсальный цвет)
  ctx.fillStyle = getHex(colors.body)
  ctx.fillRect(bodyX, bodyY, 12, 8)
  
  // Руки - не рисуем при беге и прыжке
  if (animation !== 'run' && animation !== 'jump') {
    ctx.fillRect(leftArmX, leftArmY, 2, 7)
    ctx.fillRect(rightArmX, rightArmY, 2, 7)
  }
  
  // Ноги (для всех анимаций одинаковые)
  ctx.fillRect(leftLegX, leftLegY, 3, 6)
  ctx.fillRect(rightLegX, rightLegY, 3, 6)
  
  return canvas.toDataURL()
}

// ============================================
// ЗАГРУЗКА ВСЕХ СПРАЙТОВ
// ============================================

/**
 * Загружает все спрайты для героя и анти-героя
 * Должна быть вызвана один раз при инициализации игры
 * @param {Object} k - Kaplay инстанс
 */
export function loadAllSprites(k) {
  // Загружаем спрайты для обоих персонажей
  const types = ['hero', 'antihero']
  
  types.forEach(type => {
    const prefix = type
    
    // Загружаем все варианты глаз (9 позиций) для idle анимации
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        const spriteName = `${prefix}_${x}_${y}`
        const spriteData = createCharacterFrame(type, 'idle', 0, x, y)
        k.loadSprite(spriteName, spriteData)
      }
    }
    
    // Загружаем анимацию прыжка
    k.loadSprite(`${prefix}-jump`, createCharacterFrame(type, 'jump', 0))
    
    // Загружаем кадры бега (6 кадров)
    for (let frame = 0; frame < CONFIG.gameplay.runFrameCount; frame++) {
      k.loadSprite(`${prefix}-run-${frame}`, createCharacterFrame(type, 'run', frame))
    }
  })
}

// ============================================
// ЭКСПОРТИРУЕМЫЕ ФУНКЦИИ ДЛЯ ГЕРОЯ
// ============================================

export function createHeroSprite(k) {
  return createCharacterFrame('hero', 'idle', 0)
}

export function createHeroIdleSprite() {
  return createCharacterFrame('hero', 'idle', 0)
}

export function createHeroJumpSprite() {
  return createCharacterFrame('hero', 'jump', 0)
}

export function createHeroWithEyes(k, eyeOffsetX = 0, eyeOffsetY = 0) {
  return createCharacterFrame('hero', 'idle', 0, eyeOffsetX, eyeOffsetY)
}

export function createHeroRunSprite(frame, eyeOffsetX = 0, eyeOffsetY = 0) {
  return createCharacterFrame('hero', 'run', frame, eyeOffsetX, eyeOffsetY)
}

// ============================================
// ЭКСПОРТИРУЕМЫЕ ФУНКЦИИ ДЛЯ АНТИ-ГЕРОЯ
// ============================================

export function createAntiHeroSprite(k) {
  return createCharacterFrame('antihero', 'idle', 0)
}

export function createAntiHeroWithEyes(k, eyeOffsetX = 0, eyeOffsetY = 0) {
  return createCharacterFrame('antihero', 'idle', 0, eyeOffsetX, eyeOffsetY)
}

export function createAntiHeroRunSprite(frame, eyeOffsetX = 0, eyeOffsetY = 0) {
  return createCharacterFrame('antihero', 'run', frame, eyeOffsetX, eyeOffsetY)
}

export function createAntiHeroJumpSpriteWithEyes(eyeOffsetX = 0, eyeOffsetY = 0) {
  return createCharacterFrame('antihero', 'jump', 0, eyeOffsetX, eyeOffsetY)
}

// ============================================
// СОЗДАНИЕ ИГРОВОГО ОБЪЕКТА ГЕРОЯ
// ============================================

/**
 * Создаёт героя или анти-героя с полной настройкой логики
 * @param {Object} k - Kaplay инстанс
 * @param {Object} config - Конфигурация героя
 * @param {number} config.x - Позиция X
 * @param {number} config.y - Позиция Y
 * @param {string} [config.type='hero'] - Тип персонажа ('hero' или 'antihero')
 * @param {boolean} [config.controllable=true] - Управляется ли клавиатурой
 * @param {Object} [config.sfx] - AudioContext для звуковых эффектов
 * @returns {Object} Созданный объект героя
 */
export function create(k, config) {
  const {
    x,
    y,
    type = 'hero',
    controllable = true,
    sfx = null
  } = config
  
  const MOVE_SPEED = CONFIG.gameplay.moveSpeed
  const JUMP_FORCE = CONFIG.gameplay.jumpForce
  const RUN_ANIM_SPEED = CONFIG.gameplay.runAnimSpeed
  
  // Определяем имя спрайта в зависимости от типа
  const spritePrefix = type === 'hero' ? 'hero' : 'antihero'
  
  // Создаём объект героя
  const character = k.add([
    k.sprite(`${spritePrefix}_0_0`),
    k.pos(x, y),
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
  
  // Добавляем кастомные свойства
  character.speed = MOVE_SPEED
  character.myJumpForce = JUMP_FORCE
  character.runFrame = 0
  character.runTimer = 0
  character.direction = 1 // 1 = вправо, -1 = влево
  character.canJump = true
  character.isRunning = false
  character.wasJumping = false
  character.type = type
  
  // Переменные для анимации глаз
  character.eyeOffsetX = 0
  character.eyeOffsetY = 0
  character.targetEyeX = 0
  character.targetEyeY = 0
  character.eyeTimer = 0
  character.currentEyeSprite = null
  
  // ============================================
  // ОБРАБОТЧИКИ СТОЛКНОВЕНИЙ
  // ============================================
  
  // Проверка касания земли через столкновения
  character.onCollide("platform", () => {
    character.canJump = true
    // Если был в прыжке, мгновенно переключаемся на idle
    if (character.wasJumping && sfx) {
      character.wasJumping = false
      SFX.playLandSound(sfx) // Звук приземления
      const roundedX = Math.round(character.eyeOffsetX)
      const roundedY = Math.round(character.eyeOffsetY)
      const spriteName = `${spritePrefix}_${roundedX}_${roundedY}`
      character.use(k.sprite(spriteName))
      character.currentEyeSprite = spriteName
    }
  })
  
  // ============================================
  // УПРАВЛЕНИЕ (если персонаж управляем)
  // ============================================
  
  if (controllable) {
    // Управление движением влево
    CONFIG.controls.moveLeft.forEach(key => {
      k.onKeyDown(key, () => {
        character.move(-character.speed, 0)
        character.direction = -1
      })
    })
    
    // Управление движением вправо
    CONFIG.controls.moveRight.forEach(key => {
      k.onKeyDown(key, () => {
        character.move(character.speed, 0)
        character.direction = 1
      })
    })
    
    // Прыжок
    CONFIG.controls.jump.forEach(key => {
      k.onKeyPress(key, () => {
        if (character.canJump) {
          character.vel.y = -character.myJumpForce
          character.canJump = false
        }
      })
    })
  }
  
  // ============================================
  // ОБНОВЛЕНИЕ АНИМАЦИЙ
  // ============================================
  
  character.onUpdate(() => {
    // Определяем состояние движения (только для управляемых персонажей)
    const isMoving = controllable && (
      isAnyKeyDown(k, CONFIG.controls.moveLeft) || 
      isAnyKeyDown(k, CONFIG.controls.moveRight)
    )
    
    // Проверяем, на земле ли персонаж
    const isGrounded = character.canJump && Math.abs(character.vel.y) < 10
    
    if (!isGrounded) {
      // В прыжке
      character.use(k.sprite(`${spritePrefix}-jump`))
      character.runFrame = 0
      character.runTimer = 0
      character.isRunning = false
      character.wasJumping = true
    } else if (isMoving) {
      // Бег - переключаем кадры плавно (time-based анимация)
      character.isRunning = true
      character.runTimer += k.dt()
      if (character.runTimer > RUN_ANIM_SPEED) {
        character.runFrame = (character.runFrame + 1) % CONFIG.gameplay.runFrameCount
        character.use(k.sprite(`${spritePrefix}-run-${character.runFrame}`))
        character.runTimer = 0
        
        // Звук шага на кадрах 0 и 3 (когда нога касается земли)
        if (sfx && (character.runFrame === 0 || character.runFrame === 3)) {
          SFX.playStepSound(sfx)
        }
      }
    } else {
      // Idle - с анимацией глаз
      
      // Если только что закончили бег, мгновенно переключаемся на idle
      if (character.isRunning) {
        character.isRunning = false
        character.runFrame = 0
        character.runTimer = 0
        // Мгновенно переключаемся на текущий idle спрайт
        const roundedX = Math.round(character.eyeOffsetX)
        const roundedY = Math.round(character.eyeOffsetY)
        const spriteName = `${spritePrefix}_${roundedX}_${roundedY}`
        character.use(k.sprite(spriteName))
        character.currentEyeSprite = spriteName
      }
      
      // Анимация глаз - плавное движение
      character.eyeTimer += k.dt()
      
      // Выбираем новую целевую позицию
      if (character.eyeTimer > k.rand(CONFIG.gameplay.eyeAnimMinDelay, CONFIG.gameplay.eyeAnimMaxDelay)) {
        character.targetEyeX = k.choose([-1, 0, 1])
        character.targetEyeY = k.choose([-1, 0, 1])
        character.eyeTimer = 0
      }
      
      // Плавно интерполируем к целевой позиции
      character.eyeOffsetX = k.lerp(character.eyeOffsetX, character.targetEyeX, CONFIG.gameplay.eyeLerpSpeed)
      character.eyeOffsetY = k.lerp(character.eyeOffsetY, character.targetEyeY, CONFIG.gameplay.eyeLerpSpeed)
      
      // Округляем для пиксель-арт стиля
      const roundedX = Math.round(character.eyeOffsetX)
      const roundedY = Math.round(character.eyeOffsetY)
      
      // Переключаем на предзагруженный спрайт с глазами
      const spriteName = `${spritePrefix}_${roundedX}_${roundedY}`
      
      // Обновляем спрайт только если позиция глаз изменилась
      if (character.currentEyeSprite !== spriteName) {
        character.use(k.sprite(spriteName))
        character.currentEyeSprite = spriteName
      }
    }
    
    // Отзеркаливание в зависимости от направления
    character.flipX = character.direction === -1
    
    // Ограничиваем персонажа в пределах экрана (только для управляемых)
    if (controllable) {
      const leftBound = CONFIG.visual.playerBounds.leftOffset
      const rightBound = k.width() - CONFIG.visual.playerBounds.rightOffset
      const topBound = CONFIG.visual.playerBounds.topOffset
      const bottomBound = k.height() - CONFIG.visual.playerBounds.bottomOffset
      
      // Ограничиваем по X
      if (character.pos.x < leftBound) {
        character.pos.x = leftBound
      }
      if (character.pos.x > rightBound) {
        character.pos.x = rightBound
      }
      
      // Ограничиваем по Y
      if (character.pos.y < topBound) {
        character.pos.y = topBound
      }
      if (character.pos.y > bottomBound) {
        character.pos.y = bottomBound
      }
    }
  })
  
  return character
}

// ============================================
// ЭФФЕКТ СБОРКИ ГЕРОЯ ИЗ ЧАСТИЦ
// ============================================

/**
 * Создаёт эффект сборки героя из частиц
 * @param {Object} k - Kaplay инстанс
 * @param {Object} config - Конфигурация
 * @param {number} config.x - Позиция X для появления
 * @param {number} config.y - Позиция Y для появления
 * @param {string} [config.type='hero'] - Тип персонажа ('hero' или 'antihero')
 * @param {boolean} [config.controllable=true] - Управляется ли клавиатурой
 * @param {Object} [config.sfx] - AudioContext для звуковых эффектов
 * @param {Function} [config.onComplete] - Callback с созданным героем после завершения
 * @returns {Object} Объект с методом cancel() для прерывания эффекта
 */
export function spawnWithAssembly(k, config) {
  const {
    x,
    y,
    type = 'hero',
    controllable = true,
    sfx = null,
    onComplete = null
  } = config
  
  // Определяем цвет частиц в зависимости от типа
  const particleColor = type === 'hero' ? CONFIG.colors.hero.body : CONFIG.colors.antiHero.body
  
  // Создаем частицы для эффекта сборки
  const particles = []
  const particleCount = 20
  
  for (let i = 0; i < particleCount; i++) {
    const particle = k.add([
      k.rect(6, 6),
      k.pos(
        x + k.rand(-100, 100),
        y + k.rand(-100, 100)
      ),
      k.color(particleColor[0], particleColor[1], particleColor[2]),
      k.anchor("center"),
      k.z(CONFIG.visual.zIndex.player),
      "assemblyParticle"
    ])
    
    particle.targetX = x
    particle.targetY = y
    particle.speed = k.rand(200, 400)
    
    particles.push(particle)
  }
  
  // Анимируем частицы к центру
  let particlesGathered = false
  let character = null
  let cancelled = false
  
  const updateHandler = k.onUpdate(() => {
    if (cancelled) {
      // Если эффект отменен, удаляем все частицы
      particles.forEach(p => {
        if (p.exists()) k.destroy(p)
      })
      updateHandler.cancel()
      return
    }
    
    if (!particlesGathered) {
      let allGathered = true
      
      particles.forEach(particle => {
        if (!particle.exists()) return
        
        const dx = particle.targetX - particle.pos.x
        const dy = particle.targetY - particle.pos.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        
        if (dist > 5) {
          allGathered = false
          const moveSpeed = particle.speed * k.dt()
          particle.pos.x += (dx / dist) * moveSpeed
          particle.pos.y += (dy / dist) * moveSpeed
        }
      })
      
      if (allGathered && !character) {
        particlesGathered = true
        
        // Удаляем частицы
        particles.forEach(p => {
          if (p.exists()) k.destroy(p)
        })
        
        // Звук появления героя
        if (sfx) {
          SFX.playSpawnSound(sfx)
        }
        
        // Создаем героя
        character = create(k, {
          x,
          y,
          type,
          controllable,
          sfx
        })
        
        // Вызываем callback
        if (onComplete) {
          onComplete(character)
        }
        
        // Отменяем обновление
        updateHandler.cancel()
      }
    }
  })
  
  // Возвращаем объект с методом отмены
  return {
    cancel: () => {
      cancelled = true
    },
    getCharacter: () => character
  }
}

// ============================================
// ЭФФЕКТ АННИГИЛЯЦИИ
// ============================================

/**
 * Настраивает эффект аннигиляции между двумя персонажами
 * @param {Object} k - Kaplay инстанс
 * @param {Object} player - Первый персонаж (обычно герой)
 * @param {Object} target - Второй персонаж (обычно анти-герой)
 * @param {Object} sfx - AudioContext для звуковых эффектов
 * @param {Function} onComplete - Callback после завершения аннигиляции
 */
export function setupAnnihilation(k, player, target, sfx, onComplete) {
  let isAnnihilating = false
  
  player.onCollide("annihilationTarget", () => {
    if (!isAnnihilating) {
      isAnnihilating = true
      
      // Останавливаем управление
      player.paused = true
      target.paused = true
      
      // Центр между персонажами
      const centerX = (player.pos.x + target.pos.x) / 2
      const centerY = (player.pos.y + target.pos.y) / 2
      
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
          target.opacity = visible ? 1 : 0.3
        } else {
          player.opacity = 1
          target.opacity = 1
          blinkInterval.cancel()
          
          // ============================================
          // ФАЗА 2: ПРИТЯЖЕНИЕ К ЦЕНТРУ (0.25 сек)
          // ============================================
          const pullDuration = 0.25
          let pullTime = 0
          const startPlayerPos = k.vec2(player.pos.x, player.pos.y)
          const startTargetPos = k.vec2(target.pos.x, target.pos.y)
          
          const pullInterval = k.onUpdate(() => {
            pullTime += k.dt()
            const progress = Math.min(pullTime / pullDuration, 1)
            const easeProgress = 1 - Math.pow(1 - progress, 3) // Ease-out cubic
            
            player.pos.x = startPlayerPos.x + (centerX - startPlayerPos.x) * easeProgress
            player.pos.y = startPlayerPos.y + (centerY - startPlayerPos.y) * easeProgress
            target.pos.x = startTargetPos.x + (centerX - startTargetPos.x) * easeProgress
            target.pos.y = startTargetPos.y + (centerY - startTargetPos.y) * easeProgress
            
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
              // ЭФФЕКТ ЧАСТИЦ
              // ============================================
              
              const allColors = [
                CONFIG.colors.hero.body,
                CONFIG.colors.hero.outline,
                CONFIG.colors.antiHero.body,
                CONFIG.colors.antiHero.outline,
              ]
              
              // Пиксельный взрыв - мелкие вращающиеся квадраты
              const pixelCount = 24
              for (let i = 0; i < pixelCount; i++) {
                const angle = (Math.PI * 2 * i) / pixelCount + k.rand(-0.3, 0.3)
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
              
              // Скрываем персонажей
              k.destroy(player)
              k.destroy(target)
              
              // Вызываем callback после завершения
              k.wait(1.2, () => {
                if (onComplete) {
                  onComplete()
                }
              })
            }
          })
        }
      })
    }
  })
}
