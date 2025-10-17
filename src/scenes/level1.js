import { CONFIG, getColor } from '../config.js'
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
    
    // Добавляем героя (падает на нижнюю платформу)
    const startX = CONFIG.levels.level1.startPosX === 'center' ? k.width() / 2 : CONFIG.levels.level1.startPosX
    const player = Hero.create(k, {
      x: startX,
      y: CONFIG.levels.level1.startPosY,
      type: 'hero',
      controllable: true,
      sfx: sfx
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
    
    // ============================================
    // АННИГИЛЯЦИЯ при столкновении
    // ============================================
    
    // Добавляем тег для столкновения к анти-герою
    antiHero.use("annihilationTarget")
    
    // Настраиваем эффект аннигиляции
    Hero.setupAnnihilation(k, player, antiHero, sfx, () => {
      k.go("level2")
    })
    
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
      
      // Обновляем дебаг текст (только если дебаг режим включен)
      if (debugMode) {
        debugText.text = `Pos: ${Math.round(player.pos.x)}, ${Math.round(player.pos.y)}\nVel: ${Math.round(player.vel?.x || 0)}, ${Math.round(player.vel?.y || 0)}\nCan Jump: ${player.canJump}`
      } else {
        debugText.text = ""
      }
    })
    
    // Возврат в меню (используем общий модуль)
    setupBackToMenu(k)
  })
}

