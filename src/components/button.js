import { CONFIG, getColor, getRGB } from '../config.js'

// ============================================
// УНИВЕРСАЛЬНАЯ КНОПКА ДЛЯ МЕНЮ
// ============================================

/**
 * Создаёт кнопку с текстом и анимациями
 * @param {Object} k - Kaplay инстанс
 * @param {Object} config - Конфигурация кнопки
 * @param {string} config.text - Текст на кнопке
 * @param {number} config.x - Позиция X (центр кнопки)
 * @param {number} config.y - Позиция Y (центр кнопки)
 * @param {number} [config.width=450] - Ширина кнопки
 * @param {number} [config.height=90] - Высота кнопки
 * @param {string} [config.targetScene] - Целевая сцена (если null, используется onClick)
 * @param {Function} [config.onClick] - Callback при клике
 * @param {number} [config.textOffsetY=0] - Смещение текста по вертикали
 * @returns {Object} Объект с элементами кнопки (button, text, shadow)
 */
export function create(k, config) {
  const {
    text,
    x,
    y,
    width = 450,
    height = 90,
    targetScene = null,
    onClick = null,
    textOffsetY = 0,
  } = config
  
  // Общие параметры для всех кнопок
  const fontSize = CONFIG.visual.buttonFontSize
  const buttonColor = CONFIG.colors.start.button
  const textColor = CONFIG.colors.start.buttonText
  const outlineColor = CONFIG.colors.start.buttonOutline
  const pulse = true
  const colorShift = true
  
  // Тень кнопки
  const buttonShadow = k.add([
    k.rect(width, height, { radius: 12 }),
    k.pos(x + 4, y + 4),
    k.anchor("center"),
    getColor(k, [0, 0, 0]),
    k.opacity(0.3),
    k.z(0),
  ])
  
  // Фон кнопки
  const button = k.add([
    k.rect(width, height, { radius: 12 }),
    k.pos(x, y),
    k.anchor("center"),
    getColor(k, buttonColor),
    k.outline(6, getRGB(k, outlineColor)),
    k.area(),
    k.scale(1),
    k.z(1),
    "button",
  ])
  
  // Текст на кнопке
  const buttonText = k.add([
    k.text(text, { size: fontSize }),
    k.pos(x, y + textOffsetY),
    k.anchor("center"),
    getColor(k, textColor),
    k.outline(3, getRGB(k, outlineColor)),
    k.z(2),
  ])
  
  // Переменные для плавной анимации scale
  let targetScale = 1
  let currentScale = 1
  
  // Эффект hover
  button.onHoverUpdate(() => {
    targetScale = CONFIG.visual.menu.buttonHoverScale
    k.setCursor("pointer")
  })
  
  button.onHoverEnd(() => {
    targetScale = 1
    k.setCursor("default")
  })
  
  // Клик по кнопке
  button.onClick(() => {
    if (targetScene) {
      k.go(targetScene)
    } else if (onClick) {
      onClick()
    }
  })
  
  // Анимация пульсации и плавное изменение scale
  k.onUpdate(() => {
    // Определяем базовый targetScale
    let baseTargetScale = targetScale
    
    // Добавляем пульсацию только если не наведена мышь
    if (!button.isHovering() && pulse) {
      const pulseValue = 1.0 + Math.sin(k.time() * CONFIG.visual.menu.titlePulseSpeed) * CONFIG.visual.menu.buttonPulseAmount
      baseTargetScale = pulseValue
    }
    
    // Плавно интерполируем к целевому scale
    currentScale = k.lerp(currentScale, baseTargetScale, 0.2)
    
    // Применяем scale ко всем элементам
    button.scale = k.vec2(currentScale)
    buttonText.scale = k.vec2(currentScale)
    buttonShadow.scale = k.vec2(currentScale)
    
    // Анимация цвета
    if (colorShift) {
      const shift = Math.sin(k.time() * 2) * 30
      button.color = getRGB(k, [buttonColor[0], buttonColor[1] + shift, buttonColor[2]])
    }
  })
  
  return {
    button,
    text: buttonText,
    shadow: buttonShadow
  }
}

