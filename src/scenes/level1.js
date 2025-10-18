import { CONFIG } from '../config.js'
import { getColor } from '../utils/helpers.js'
import * as SFX from '../audio/sfx.js'
import { addBackground } from '../components/background.js'
import { addInstructions, setupBackToMenu } from '../components/instructions.js'
import * as Hero from '../components/hero.js'

export function level1Scene(k) {
  k.scene("level1", () => {
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
    // ГЕРОЙ появляется с эффектом сборки
    // ============================================
    // Получаем координаты из конфига
    const heroStartX = CONFIG.levels.level1.heroSpawn.x
    const heroStartY = CONFIG.levels.level1.heroSpawn.onPlatform
      ? k.height() - platformHeight - (CONFIG.gameplay.collisionHeight / 2) * CONFIG.gameplay.heroScale
      : CONFIG.levels.level1.heroSpawn.y
    
    let player = null
    Hero.spawnWithAssembly(k, {
      x: heroStartX,
      y: heroStartY,
      type: 'hero',
      controllable: true,
      sfx: sfx,
      onComplete: (character) => {
        player = character
        
        // Настраиваем эффект аннигиляции после создания героя
        Hero.setupAnnihilation(k, player, antiHero, sfx, () => {
          k.go("level2")
        })
      }
    })
    
    // ============================================
    // АНТИ-ГЕРОЙ в правом нижнем углу
    // ============================================
    // Вычисляем Y координату так, чтобы анти-герой стоял НА платформе
    const antiHeroY = k.height() - platformHeight - (CONFIG.gameplay.collisionHeight / 2) * CONFIG.gameplay.heroScale
    
    const antiHero = Hero.create(k, {
      x: k.width() - 100,
      y: antiHeroY,
      type: 'antihero',
      controllable: false,
      sfx: sfx
    })
    
    // Добавляем тег для столкновения к анти-герою
    antiHero.use("annihilationTarget")
    
    // Инструкции (используем общий модуль)
    const instructions = addInstructions(k, { showDebugHint: true })
    
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
      
      // Обновляем дебаг текст (только если дебаг режим включен и герой создан)
      if (debugMode && player) {
        debugText.text = `Pos: ${Math.round(player.pos.x)}, ${Math.round(player.pos.y)}\nVel: ${Math.round(player.vel?.x || 0)}, ${Math.round(player.vel?.y || 0)}\nCan Jump: ${player.canJump}`
      } else {
        debugText.text = ""
      }
    })
    
    // Возврат в меню (используем общий модуль)
    setupBackToMenu(k)
  })
}

