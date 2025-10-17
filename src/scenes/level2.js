import { CONFIG, getColor, isAnyKeyDown } from '../config.js'
import * as SFX from '../audio/sfx.js'

export function level2Scene(k) {
  k.scene("level2", () => {
    // ========================================
    // TIME-BASED СИСТЕМА: независима от FPS
    // ========================================
    
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
    
    // ============================================
    // ГЕРОЙ появляется слева с эффектом сборки
    // ============================================
    const startX = 150 // Левая часть экрана
    const startY = k.height() - platformHeight - (CONFIG.gameplay.collisionHeight / 2) * CONFIG.gameplay.heroScale
    
    // Создаем частицы для эффекта сборки
    const particles = []
    const particleCount = 20
    
    for (let i = 0; i < particleCount; i++) {
      const particle = k.add([
        k.rect(6, 6),
        k.pos(
          startX + k.rand(-100, 100),
          startY + k.rand(-100, 100)
        ),
        k.color(CONFIG.colors.hero.body[0], CONFIG.colors.hero.body[1], CONFIG.colors.hero.body[2]),
        k.anchor("center"),
        k.z(CONFIG.visual.zIndex.player),
        "particle"
      ])
      
      particle.targetX = startX
      particle.targetY = startY
      particle.speed = k.rand(200, 400)
      
      particles.push(particle)
    }
    
    // Анимируем частицы к центру
    let particlesGathered = false
    let player = null
    
    k.onUpdate(() => {
      if (!particlesGathered) {
        let allGathered = true
        
        particles.forEach(particle => {
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
        
        if (allGathered && !player) {
          particlesGathered = true
          
          // Удаляем частицы
          particles.forEach(p => k.destroy(p))
          
          // Звук появления героя
          SFX.playSpawnSound(sfx)
          
          // Создаем героя
          player = k.add([
            k.sprite('hero_0_0'),
            k.pos(startX, startY),
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
          player.speed = MOVE_SPEED
          player.myJumpForce = JUMP_FORCE
          player.runFrame = 0
          player.runTimer = 0
          player.direction = 1
          player.canJump = true
          player.isRunning = false
          player.wasJumping = false
          
          // Переменные для анимации глаз
          player.eyeOffsetX = 0
          player.eyeOffsetY = 0
          player.targetEyeX = 0
          player.targetEyeY = 0
          player.eyeTimer = 0
          player.currentEyeSprite = null
          
          // Проверка касания земли
          player.onCollide("platform", () => {
            player.canJump = true
            if (player.wasJumping) {
              player.wasJumping = false
              SFX.playLandSound(sfx)
              const roundedX = Math.round(player.eyeOffsetX)
              const roundedY = Math.round(player.eyeOffsetY)
              const heroSpriteName = `hero_${roundedX}_${roundedY}`
              player.use(k.sprite(heroSpriteName))
              player.currentEyeSprite = heroSpriteName
            }
          })
          
          // Управление движением
          CONFIG.controls.moveLeft.forEach(key => {
            k.onKeyDown(key, () => {
              if (player) {
                player.move(-player.speed, 0)
                player.direction = -1
              }
            })
          })
          
          CONFIG.controls.moveRight.forEach(key => {
            k.onKeyDown(key, () => {
              if (player) {
                player.move(player.speed, 0)
                player.direction = 1
              }
            })
          })
          
          // Прыжок
          CONFIG.controls.jump.forEach(key => {
            k.onKeyPress(key, () => {
              if (player && player.canJump) {
                player.vel.y = -player.myJumpForce
                player.canJump = false
              }
            })
          })
        }
      } else if (player) {
        // Анимация героя
        const isMoving = isAnyKeyDown(k, CONFIG.controls.moveLeft) || isAnyKeyDown(k, CONFIG.controls.moveRight)
        const isGrounded = player.canJump && Math.abs(player.vel.y) < 10
        
        if (!isGrounded) {
          player.use(k.sprite("hero-jump"))
          player.runFrame = 0
          player.runTimer = 0
          player.isRunning = false
          player.wasJumping = true
        } else if (isMoving) {
          player.isRunning = true
          player.runTimer += k.dt()
          if (player.runTimer > RUN_ANIM_SPEED) {
            player.runFrame = (player.runFrame + 1) % CONFIG.gameplay.runFrameCount
            player.use(k.sprite(`hero-run-${player.runFrame}`))
            player.runTimer = 0
            
            if (player.runFrame === 0 || player.runFrame === 3) {
              SFX.playStepSound(sfx)
            }
          }
        } else {
          if (player.isRunning) {
            player.isRunning = false
            player.runFrame = 0
            player.runTimer = 0
            const roundedX = Math.round(player.eyeOffsetX)
            const roundedY = Math.round(player.eyeOffsetY)
            const heroSpriteName = `hero_${roundedX}_${roundedY}`
            player.use(k.sprite(heroSpriteName))
            player.currentEyeSprite = heroSpriteName
          }
          
          // Анимация глаз
          player.eyeTimer += k.dt()
          
          if (player.eyeTimer > k.rand(CONFIG.gameplay.eyeAnimMinDelay, CONFIG.gameplay.eyeAnimMaxDelay)) {
            player.targetEyeX = k.choose([-1, 0, 1])
            player.targetEyeY = k.choose([-1, 0, 1])
            player.eyeTimer = 0
          }
          
          player.eyeOffsetX = k.lerp(player.eyeOffsetX, player.targetEyeX, CONFIG.gameplay.eyeLerpSpeed)
          player.eyeOffsetY = k.lerp(player.eyeOffsetY, player.targetEyeY, CONFIG.gameplay.eyeLerpSpeed)
          
          const roundedX = Math.round(player.eyeOffsetX)
          const roundedY = Math.round(player.eyeOffsetY)
          const heroSpriteName = `hero_${roundedX}_${roundedY}`
          
          if (player.currentEyeSprite !== heroSpriteName) {
            player.use(k.sprite(heroSpriteName))
            player.currentEyeSprite = heroSpriteName
          }
        }
        
        player.flipX = player.direction === -1
        
        // Ограничиваем игрока в пределах коридора
        const leftBound = CONFIG.visual.playerBounds.leftOffset
        const rightBound = k.width() - CONFIG.visual.playerBounds.rightOffset
        const topBound = CONFIG.visual.playerBounds.topOffset
        const bottomBound = k.height() - CONFIG.visual.playerBounds.bottomOffset
        
        if (player.pos.x < leftBound) player.pos.x = leftBound
        if (player.pos.x > rightBound) player.pos.x = rightBound
        if (player.pos.y < topBound) player.pos.y = topBound
        if (player.pos.y > bottomBound) player.pos.y = bottomBound
      }
    })
    
    // Камера
    k.onUpdate(() => {
      k.camPos(k.width() / 2, k.height() / 2)
    })
    
    // Инструкции
    k.add([
      k.text("LEVEL 2\nWASD/← ↑ → - Move\nSpace - jump\nESC - menu", {
        size: CONFIG.visual.instructionsFontSize,
        width: k.width() - 40
      }),
      k.pos(CONFIG.visual.instructionsX, CONFIG.visual.instructionsY),
      getColor(k, CONFIG.colors.level1.instructions),
      k.z(CONFIG.visual.zIndex.ui),
      k.fixed()
    ])
    
    // Возврат в меню
    CONFIG.controls.backToMenu.forEach(key => {
      k.onKeyPress(key, () => {
        k.go("menu")
      })
    })
  })
}

