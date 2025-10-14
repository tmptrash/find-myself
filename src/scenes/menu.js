import { AmbientMusic } from "../audio/ambient.js"

export function menuScene(k) {
  k.scene("menu", () => {
    const centerX = k.width() / 2
    const centerY = k.height() / 2
    
    // Запускаем ambient музыку
    const ambientMusic = new AmbientMusic()
    ambientMusic.start()
    
    // Переменные для анимации глаз
    let eyeOffsetX = 0
    let eyeOffsetY = 0
    let targetEyeX = 0
    let targetEyeY = 0
    let eyeTimer = 0
    
    // Переменные для анимации фона
    let bgOffset = 0
    let glitchTimer = 0
    let titleGlitchTimer = 0
    let bgShiftTimer = 0
    let targetBgShift = 0
    let currentBgShift = 0
    
    // Массив глюков на фоне
    let glitches = []
    
    // Переменные для глючной линии разделения
    let lineGlitchTimer = 0
    
    // Создаём случайные глюки на фоне
    function createGlitch() {
      const side = k.rand(0, 1) > 0.5 ? "left" : "right"
      const boundary = centerX + currentBgShift
      const x = side === "left" ? k.rand(0, boundary) : k.rand(boundary, k.width())
      const y = k.rand(0, k.height())
      const width = k.rand(20, 100)
      const height = k.rand(5, 30)
      
      return {
        x, y, width, height, side,
        lifetime: k.rand(0.1, 0.5),
        age: 0
      }
    }
    
    // Фоновый слой с анимацией
    k.onDraw(() => {
      // Движущийся фон - простая волнообразная траектория
      bgOffset += k.dt() * 10
      const waveX = Math.sin(bgOffset * 0.1) * 5
      const waveY = Math.cos(bgOffset * 0.15) * 5
      
      // Плавная интерполяция к целевому смещению
      currentBgShift = k.lerp(currentBgShift, targetBgShift, 0.05)
      
      // Добавляем запас для движения фона (padding)
      const padding = 20
      
      // Левая сторона - светлый персиковый
      k.drawRect({
        pos: k.vec2(waveX - padding, waveY - padding),
        width: centerX + currentBgShift + padding * 2,
        height: k.height() + padding * 2,
        color: k.rgb(255, 218, 185), // Светлый персиковый
      })
      
      // Правая сторона - темно-коричневый
      k.drawRect({
        pos: k.vec2(centerX + currentBgShift - waveX - padding, -waveY - padding),
        width: centerX - currentBgShift + padding * 2,
        height: k.height() + padding * 2,
        color: k.rgb(62, 39, 35), // Темно-коричневый
      })
      
      // Глючная ломаная линия разделения
      const segments = []
      const segmentHeight = 15
      const numSegments = Math.ceil(k.height() / segmentHeight)
      
      for (let i = 0; i < numSegments; i++) {
        const y = i * segmentHeight
        // Каждый сегмент имеет своё смещение с разной частотой
        const glitchX = Math.sin(bgOffset * 5 + i * 0.5) * 8 + 
                       Math.sin(bgOffset * 12 + i) * 4 +
                       (k.rand(0, 1) > 0.95 ? k.rand(-20, 20) : 0) // Случайные резкие скачки
        
        segments.push({
          x: centerX + currentBgShift + glitchX - 22, // Сдвиг на 22 пикселя левее
          y: y
        })
      }
      
      // Рисуем ломаную линию
      for (let i = 0; i < segments.length - 1; i++) {
        const current = segments[i]
        const next = segments[i + 1]
        
        // Случайный глюк цвета в оранжевой палитре
        const hasColorGlitch = k.rand(0, 1) > 0.97
        const lineColor = hasColorGlitch 
          ? k.choose([k.rgb(255, 165, 0), k.rgb(255, 140, 0), k.rgb(255, 200, 100)])
          : k.rgb(255, 140, 0) // Темно-оранжевый по умолчанию
        
        // Рисуем линию между сегментами
        k.drawLine({
          p1: k.vec2(current.x, current.y),
          p2: k.vec2(next.x, next.y),
          width: k.rand(0, 1) > 0.95 ? k.rand(2, 8) : 3, // Случайная толщина
          color: lineColor,
          opacity: 0.7 + k.rand(0, 0.3)
        })
        
        // Дополнительные глюк-артефакты на линии в оранжевой палитре
        if (k.rand(0, 1) > 0.9) {
          k.drawRect({
            pos: k.vec2(current.x - 5, current.y),
            width: k.rand(5, 15),
            height: k.rand(2, 5),
            color: k.choose([k.rgb(255, 165, 0), k.rgb(255, 140, 0), k.rgb(255, 200, 100)]),
            opacity: 0.5
          })
        }
      }
      
      // Рисуем глюки в оранжевой палитре
      for (const glitch of glitches) {
        const isLeft = glitch.side === "left"
        // Глюки: разные оттенки оранжевого
        const colorType = k.rand(0, 3)
        const glitchColor = colorType < 1 
          ? k.rgb(255, 165, 0)     // Оранжевый
          : colorType < 2 
          ? k.rgb(255, 140, 0)     // Темно-оранжевый
          : k.rgb(255, 200, 100)   // Светло-оранжевый
        
        k.drawRect({
          pos: k.vec2(glitch.x, glitch.y),
          width: glitch.width,
          height: glitch.height,
          color: glitchColor,
          opacity: 0.3 + k.rand(0, 0.3)
        })
      }
      
      // Линия разделения убрана - остались только дергающиеся сегменты фона
    })
    
    // Обновление глюков и анимаций
    k.onUpdate(() => {
      glitchTimer += k.dt()
      bgShiftTimer += k.dt()
      
      // Создаём новые глюки
      if (glitchTimer > 0.1) {
        if (k.rand(0, 1) > 0.7) {
          glitches.push(createGlitch())
        }
        glitchTimer = 0
      }
      
      // Удаляем старые глюки
      glitches = glitches.filter(g => {
        g.age += k.dt()
        return g.age < g.lifetime
      })
      
      // Случайное смещение фона влево-вправо
      if (bgShiftTimer > k.rand(0.3, 1.5)) {
        // Сильный глюк - редко, большое смещение
        if (k.rand(0, 1) > 0.85) {
          targetBgShift = k.rand(-150, 150)
        } 
        // Средний глюк
        else if (k.rand(0, 1) > 0.6) {
          targetBgShift = k.rand(-60, 60)
        }
        // Слабый глюк - чаще, маленькое смещение
        else {
          targetBgShift = k.rand(-25, 25)
        }
        bgShiftTimer = 0
      }
    })
    
    // Левый герой (нормальный - желтый) - начинаем с центральным взглядом
    const leftHero = k.add([
      k.sprite("hero_0_0"),
      k.pos(centerX * 0.5, centerY),
      k.anchor("center"),
      k.scale(3),
      k.opacity(1),
    ])
    
    // Правый герой (антиверсия - черный) - начинаем с центральным взглядом
    const rightHero = k.add([
      k.sprite("antihero_0_0"),
      k.pos(centerX * 1.5, centerY),
      k.anchor("center"),
      k.scale(3),
      k.opacity(1),
    ])
    
    // Анимация героев - плавное покачивание и движение глаз
    k.onUpdate(() => {
      const wave = Math.sin(k.time() * 2) * 10
      leftHero.pos.y = centerY + wave
      rightHero.pos.y = centerY - wave // Противофазно
      
      // Мерцание
      leftHero.opacity = 0.9 + Math.sin(k.time() * 3) * 0.1
      rightHero.opacity = 0.9 + Math.cos(k.time() * 3) * 0.1
      
      // Анимация глаз - плавное движение
      eyeTimer += k.dt()
      
      // Выбираем новую целевую позицию каждые 1.5-3.5 секунды
      if (eyeTimer > k.rand(1.5, 3.5)) {
        targetEyeX = k.choose([-1, 0, 1])
        targetEyeY = k.choose([-1, 0, 1])
        eyeTimer = 0
      }
      
      // Плавно интерполируем к целевой позиции
      eyeOffsetX = k.lerp(eyeOffsetX, targetEyeX, 0.1)
      eyeOffsetY = k.lerp(eyeOffsetY, targetEyeY, 0.1)
      
      // Округляем для пиксель-арт стиля
      const roundedX = Math.round(eyeOffsetX)
      const roundedY = Math.round(eyeOffsetY)
      
      // Переключаем на предзагруженный спрайт
      const heroSpriteName = `hero_${roundedX}_${roundedY}`
      const antiHeroSpriteName = `antihero_${roundedX}_${roundedY}`
      
      // Сохраняем текущий спрайт для проверки изменений
      if (!leftHero.currentEyeSprite || leftHero.currentEyeSprite !== heroSpriteName) {
        leftHero.use(k.sprite(heroSpriteName))
        leftHero.currentEyeSprite = heroSpriteName
      }
      if (!rightHero.currentEyeSprite || rightHero.currentEyeSprite !== antiHeroSpriteName) {
        rightHero.use(k.sprite(antiHeroSpriteName))
        rightHero.currentEyeSprite = antiHeroSpriteName
      }
    })
    
    // Название игры с глюк-эффектами
    const titleLetters = "FIND YOURSELF".split("")
    const titleObjects = []
    
    titleLetters.forEach((letter, i) => {
      const isSpace = letter === " "
      const spacing = 30
      const totalWidth = titleLetters.length * spacing
      const startX = centerX - totalWidth / 2
      
      const letterObj = k.add([
        k.text(letter, { size: isSpace ? 20 : 48 }),
        k.pos(startX + i * spacing, 80),
        k.anchor("center"),
        k.opacity(1),
        k.color(255, 140, 0), // Темно-оранжевый по умолчанию
        {
          baseX: startX + i * spacing,
          baseY: 80,
          index: i,
          glitchOffsetX: 0,
          glitchOffsetY: 0,
        }
      ])
      
      titleObjects.push(letterObj)
    })
    
    // Глюк-эффекты для названия
    k.onUpdate(() => {
      titleGlitchTimer += k.dt()
      
      if (titleGlitchTimer > 0.05) {
        titleObjects.forEach((obj, i) => {
          // Случайные смещения
          if (k.rand(0, 1) > 0.8) {
            obj.glitchOffsetX = k.rand(-5, 5)
            obj.glitchOffsetY = k.rand(-3, 3)
          } else {
            obj.glitchOffsetX *= 0.9
            obj.glitchOffsetY *= 0.9
          }
          
          obj.pos.x = obj.baseX + obj.glitchOffsetX
          obj.pos.y = obj.baseY + obj.glitchOffsetY
          
          // Случайное изменение цвета - оранжевая палитра
          if (k.rand(0, 1) > 0.97) {
            const colors = [
              k.rgb(255, 140, 0),   // Темно-оранжевый (основной)
              k.rgb(255, 165, 0),   // Оранжевый
              k.rgb(62, 39, 35),    // Темно-коричневый фон
              k.rgb(255, 100, 50),  // Красно-оранжевый акцент
              k.rgb(255, 218, 185), // Светлый персиковый
            ]
            obj.color = k.choose(colors)
          }
          
          // Случайное мерцание
          if (k.rand(0, 1) > 0.9) {
            obj.opacity = k.rand(0.5, 1)
          } else {
            obj.opacity = k.lerp(obj.opacity, 1, 0.1)
          }
        })
        
        titleGlitchTimer = 0
      }
      
      // Плавная волна через все буквы
      titleObjects.forEach((obj, i) => {
        obj.pos.y = obj.baseY + obj.glitchOffsetY + Math.sin(k.time() * 2 + i * 0.3) * 5
      })
    })
    
    // Подсказка для начала игры
    const startText = k.add([
      k.text("PRESS SPACE TO BEGIN", { size: 24 }),
      k.pos(centerX, k.height() - 80),
      k.anchor("center"),
      k.opacity(1),
      k.color(255, 100, 50), // Красно-оранжевый акцент
      k.outline(4, k.rgb(62, 39, 35)),
    ])
    
    // Подсказка о звуке
    const muteText = k.add([
      k.text("Press M to mute/unmute", { size: 16 }),
      k.pos(centerX, k.height() - 50),
      k.anchor("center"),
      k.opacity(1),
      k.color(255, 165, 0), // Оранжевый
      k.outline(3, k.rgb(62, 39, 35)),
    ])
    
    // Мигание подсказки
    k.onUpdate(() => {
      startText.opacity = 0.5 + Math.sin(k.time() * 3) * 0.5
    })
    
    // Переход к игре
    k.onKeyPress("space", () => {
      ambientMusic.stop()
      k.go("game")
    })
    
    // Дополнительно: управление громкостью (опционально)
    k.onKeyPress("m", () => {
      if (ambientMusic.masterGain && ambientMusic.masterGain.gain.value > 0) {
        ambientMusic.setVolume(0)
      } else {
        ambientMusic.setVolume(0.15)
      }
    })
    
    // Остановка музыки при выходе из сцены
    k.onSceneLeave(() => {
      ambientMusic.stop()
    })
  })
}

