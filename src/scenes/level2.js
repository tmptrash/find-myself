import { CONFIG, getColor } from '../config.js'
import * as SFX from '../audio/sfx.js'
import { addBackground } from '../components/background.js'
import * as Hero from '../components/hero.js'

export function level2Scene(k) {
  k.scene("level2", () => {
    // ========================================
    // TIME-BASED СИСТЕМА: независима от FPS
    // ========================================
    
    k.setGravity(CONFIG.gameplay.gravity)
    
    // Создаём инстанс звуковых эффектов (получаем AudioContext)
    const sfx = SFX.create()
    
    // Фон - используем общий модуль
    addBackground(k, CONFIG.colors.level1.background)
    
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
          player = Hero.create(k, {
            x: startX,
            y: startY,
            type: 'hero',
            controllable: true,
            sfx: sfx
          })
        }
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

