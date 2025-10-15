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
    
    // Переменные для вращения вертикальной границы
    let boundaryRotation = 0 // Текущий угол наклона
    let targetBoundaryRotation = 0 // Целевой угол
    let boundaryRotationTimer = 0
    
    // Переменные для плавного движения героев (независимые таймеры)
    let leftHeroTimer = 0
    let rightHeroTimer = 0
    let leftHeroTargetX = 0
    let leftHeroTargetY = 0
    let rightHeroTargetX = 0
    let rightHeroTargetY = 0
    
    // Переменные для энергетической связи между героями
    let connectionPulse = 0
    
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
      
      // Плавная интерполяция к целевому углу вращения границы
      boundaryRotation = k.lerp(boundaryRotation, targetBoundaryRotation, 0.03)
      
      // Добавляем запас для движения фона (padding)
      const padding = 20
      
      // Вычисляем смещение границы по вертикали из-за вращения
      const boundaryCenter = centerX + currentBgShift
      const rotationOffset = Math.tan(boundaryRotation) * (k.height() / 2)
      
      // Левая сторона - светлый персиковый (полигон)
      k.drawPolygon({
        pts: [
          k.vec2(waveX - padding, waveY - padding),
          k.vec2(boundaryCenter + rotationOffset + padding, waveY - padding),
          k.vec2(boundaryCenter - rotationOffset + padding, k.height() - waveY + padding),
          k.vec2(waveX - padding, k.height() - waveY + padding)
        ],
        color: k.rgb(255, 218, 185), // Светлый персиковый
      })
      
      // Правая сторона - темно-коричневый (полигон)
      k.drawPolygon({
        pts: [
          k.vec2(boundaryCenter + rotationOffset - padding, -waveY - padding),
          k.vec2(k.width() - waveX + padding, -waveY - padding),
          k.vec2(k.width() - waveX + padding, k.height() + waveY + padding),
          k.vec2(boundaryCenter - rotationOffset - padding, k.height() + waveY + padding)
        ],
        color: k.rgb(62, 39, 35), // Темно-коричневый
      })
      
      // Свечение вокруг правого героя для контраста (следует за героем)
      connectionPulse += k.dt() * 2
      const glowSize = 40 + Math.sin(connectionPulse) * 10
      const glowOpacity = 0.3 + Math.sin(connectionPulse * 1.5) * 0.15
      
      k.drawCircle({
        pos: k.vec2(rightHero.pos.x, rightHero.pos.y),
        radius: glowSize,
        color: k.rgb(255, 140, 0),
        opacity: glowOpacity
      })
      
      // Звуковая волна между героями (диагональная, выходит из-за них)
      const connectionSegments = []
      const segmentWidth = 8 // Меньшая ширина для более плавной волны
      const startX = leftHero.pos.x // Начало от центра левого героя
      const startY = leftHero.pos.y
      const endX = rightHero.pos.x // Конец в центре правого героя
      const endY = rightHero.pos.y
      const lineWidth = endX - startX
      const numConnectionSegments = Math.ceil(lineWidth / segmentWidth)
      
      for (let i = 0; i <= numConnectionSegments; i++) {
        const t = i / numConnectionSegments // Прогресс от 0 до 1
        const x = startX + (endX - startX) * t
        const baseY = startY + (endY - startY) * t // Линейная интерполяция по Y
        
        // Звуковая волна: несколько частот с переменной амплитудой
        const mainWave = Math.sin(k.time() * 4 + i * 0.5) * 12
        const harmonic1 = Math.sin(k.time() * 8 + i * 1.0) * 6
        const harmonic2 = Math.sin(k.time() * 12 + i * 1.5) * 3
        
        // Амплитудная модуляция (эффект "пульса")
        const amplitude = 0.8 + Math.sin(k.time() * 2) * 0.3
        
        // Случайные микроколебания для живости
        const noise = (k.rand(0, 1) - 0.5) * 2
        
        const waveY = (mainWave + harmonic1 + harmonic2 + noise) * amplitude
        
        connectionSegments.push({
          x: x,
          y: baseY + waveY
        })
      }
      
      // Рисуем несколько звуковых волн с разной толщиной
      for (let i = 0; i < connectionSegments.length - 1; i++) {
        const current = connectionSegments[i]
        const next = connectionSegments[i + 1]
        
        const lineColor = k.rand(0, 1) > 0.95 
          ? k.choose([k.rgb(255, 165, 0), k.rgb(255, 200, 100), k.rgb(255, 100, 50)]) 
          : k.rgb(255, 140, 0)
        
        // Основная волна
        k.drawLine({
          p1: k.vec2(current.x, current.y),
          p2: k.vec2(next.x, next.y),
          width: 4,
          color: lineColor,
          opacity: 0.7
        })
        
        // Вторая волна (толще, со смещением)
        const offset1 = Math.sin(k.time() * 5 + i * 0.3) * 5
        k.drawLine({
          p1: k.vec2(current.x, current.y + offset1),
          p2: k.vec2(next.x, next.y + offset1),
          width: 2,
          color: lineColor,
          opacity: 0.4
        })
        
        // Третья волна (тонкая, с другим смещением)
        const offset2 = Math.sin(k.time() * 7 + i * 0.6) * 8
        k.drawLine({
          p1: k.vec2(current.x, current.y + offset2),
          p2: k.vec2(next.x, next.y + offset2),
          width: 1,
          color: lineColor,
          opacity: 0.3
        })
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
      boundaryRotationTimer += k.dt()
      
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
      
      // Плавное вращение вертикальной границы
      if (boundaryRotationTimer > k.rand(3, 6)) {
        // Иногда поворачиваем границу
        if (k.rand(0, 1) > 0.3) {
          // Случайный угол в радианах (±15 градусов)
          targetBoundaryRotation = k.rand(-0.26, 0.26)
        } else {
          // Возвращаемся к вертикали
          targetBoundaryRotation = 0
        }
        boundaryRotationTimer = 0
      }
    })
    
    // Левый герой (нормальный - желтый) - начинаем с центральным взглядом
    const leftHero = k.add([
      k.sprite("hero_0_0"),
      k.pos(centerX * 0.5, centerY),
      k.anchor("center"),
      k.scale(3),
      k.opacity(1),
      k.z(10), // Рисуем поверх линии
      {
        baseX: centerX * 0.5,
        baseY: centerY,
        glitchOffsetX: 0,
        glitchOffsetY: 0,
      }
    ])
    
    // Правый герой (антиверсия - черный) - начинаем с центральным взглядом
    const rightHero = k.add([
      k.sprite("antihero_0_0"),
      k.pos(centerX * 1.5, centerY),
      k.anchor("center"),
      k.scale(3),
      k.opacity(1),
      k.z(10), // Рисуем поверх линии
      {
        baseX: centerX * 1.5,
        baseY: centerY,
        glitchOffsetX: 0,
        glitchOffsetY: 0,
      }
    ])
    
    // Анимация героев - плавное движение в случайные стороны
    k.onUpdate(() => {
      // Независимое движение левого героя
      leftHeroTimer += k.dt()
      if (leftHeroTimer > k.rand(1.5, 2.5)) { // Каждые 1.5-2.5 секунды новая цель
        leftHeroTargetX = k.rand(-100, 100)
        leftHeroTargetY = k.rand(-100, 100)
        leftHeroTimer = 0
      }
      
      // Независимое движение правого героя
      rightHeroTimer += k.dt()
      if (rightHeroTimer > k.rand(1.5, 2.5)) { // Каждые 1.5-2.5 секунды новая цель
        rightHeroTargetX = k.rand(-100, 100)
        rightHeroTargetY = k.rand(-100, 100)
        rightHeroTimer = 0
      }
      
      // Плавно двигаемся к целевым позициям
      leftHero.glitchOffsetX = k.lerp(leftHero.glitchOffsetX, leftHeroTargetX, 0.02)
      leftHero.glitchOffsetY = k.lerp(leftHero.glitchOffsetY, leftHeroTargetY, 0.02)
      
      rightHero.glitchOffsetX = k.lerp(rightHero.glitchOffsetX, rightHeroTargetX, 0.02)
      rightHero.glitchOffsetY = k.lerp(rightHero.glitchOffsetY, rightHeroTargetY, 0.02)
      
      // Герои полностью непрозрачные
      leftHero.opacity = 1
      rightHero.opacity = 1
      
      const wave = Math.sin(k.time() * 2) * 10
      leftHero.pos.y = centerY + wave + leftHero.glitchOffsetY
      leftHero.pos.x = leftHero.baseX + leftHero.glitchOffsetX
      rightHero.pos.y = centerY - wave + rightHero.glitchOffsetY
      rightHero.pos.x = rightHero.baseX + rightHero.glitchOffsetX
      
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
    const titleLetters = "FIND YOU".split("")
    const titleObjects = []
    
    titleLetters.forEach((letter, i) => {
      const isSpace = letter === " "
      const spacing = 30
      const totalWidth = titleLetters.length * spacing
      const startX = centerX - totalWidth / 2
      
      const letterObj = k.add([
        k.text(letter, { size: isSpace ? 20 : 48 }),
        k.pos(startX + i * spacing, centerY - 150),
        k.anchor("center"),
        k.opacity(1),
        k.color(255, 140, 0), // Темно-оранжевый по умолчанию
        {
          baseX: startX + i * spacing,
          baseY: centerY - 150,
          index: i,
          glitchOffsetX: 0,
          glitchOffsetY: 0,
        }
      ])
      
      titleObjects.push(letterObj)
    })
    
    // Глюк-эффекты для названия (более инертные)
    k.onUpdate(() => {
      titleGlitchTimer += k.dt()
      
      if (titleGlitchTimer > 0.08) { // Реже обновляем для большей инертности
        titleObjects.forEach((obj, i) => {
          // Мягкие случайные смещения
          if (k.rand(0, 1) > 0.92) { // Редкие глюки (8% шанс)
            obj.glitchOffsetX = k.rand(-5, 5) // Меньшая амплитуда
            obj.glitchOffsetY = k.rand(-3, 3)
          } else {
            // Плавное затухание
            obj.glitchOffsetX *= 0.9
            obj.glitchOffsetY *= 0.9
          }
          
          // Плавное движение к целевой позиции
          obj.pos.x = k.lerp(obj.pos.x, obj.baseX + obj.glitchOffsetX, 0.15)
          obj.pos.y = k.lerp(obj.pos.y, obj.baseY + obj.glitchOffsetY, 0.15)
          
          // Редкое изменение цвета - оранжевая палитра
          if (k.rand(0, 1) > 0.97) { // Реже меняем цвет
            const colors = [
              k.rgb(255, 140, 0),   // Темно-оранжевый (основной)
              k.rgb(255, 165, 0),   // Оранжевый
              k.rgb(62, 39, 35),    // Темно-коричневый фон
              k.rgb(255, 100, 50),  // Красно-оранжевый акцент
              k.rgb(255, 218, 185), // Светлый персиковый
              k.rgb(255, 200, 100), // Светло-оранжевый
            ]
            obj.color = k.choose(colors)
          }
          
          // Мягкое мерцание
          if (k.rand(0, 1) > 0.95) { // Редкое мерцание (5% шанс)
            obj.opacity = k.rand(0.6, 1) // Меньший диапазон
          } else {
            obj.opacity = k.lerp(obj.opacity, 1, 0.08)
          }
          
          // Очень редкое изменение размера
          if (k.rand(0, 1) > 0.98) {
            obj.scale = k.vec2(k.rand(0.9, 1.2), k.rand(0.9, 1.2)) // Меньший диапазон
          } else {
            if (obj.scale) {
              obj.scale = k.lerp(obj.scale, k.vec2(1, 1), 0.15)
            }
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
        ambientMusic.setVolume(0.4)
      }
    })
    
    // Остановка музыки при выходе из сцены
    k.onSceneLeave(() => {
      ambientMusic.stop()
    })
  })
}

