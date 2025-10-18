// ============================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================

// Парсинг hex строки в RGB компоненты
function parseHex(colorHex) {
  // Проверка типа и конвертация
  if (typeof colorHex !== 'string') {
    console.error('parseHex: expected string, got', typeof colorHex, colorHex)
    // Если это массив, возвращаем его как есть
    if (Array.isArray(colorHex) && colorHex.length === 3) {
      return colorHex
    }
    throw new Error(`parseHex: colorHex must be a string, got ${typeof colorHex}`)
  }
  
  const hex = colorHex.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  return [r, g, b]
}

// Получить цвет как объект Kaplay
export function getColor(k, colorHex) {
  const [r, g, b] = parseHex(colorHex)
  return k.color(r, g, b)
}

// Получить RGB цвет как объект Kaplay
export function getRGB(k, colorHex) {
  const [r, g, b] = parseHex(colorHex)
  return k.rgb(r, g, b)
}

// Получить hex строку цвета для Canvas API
export function getHex(colorHex) {
  // Проверка типа
  if (typeof colorHex !== 'string') {
    console.error('getHex: expected string, got', typeof colorHex, colorHex)
    // Если это массив RGB, конвертируем в hex
    if (Array.isArray(colorHex) && colorHex.length === 3) {
      const r = colorHex[0].toString(16).padStart(2, '0')
      const g = colorHex[1].toString(16).padStart(2, '0')
      const b = colorHex[2].toString(16).padStart(2, '0')
      return `#${r}${g}${b}`
    }
    throw new Error(`getHex: colorHex must be a string, got ${typeof colorHex}`)
  }
  
  return `#${colorHex.replace('#', '')}`
}

// Проверить нажата ли одна из клавиш
export function isAnyKeyDown(k, keys) {
  return keys.some(key => k.isKeyDown(key))
}

// Проверить нажата ли одна из клавиш (press)
export function isAnyKeyPressed(k, keys) {
  return keys.some(key => k.isKeyPressed(key))
}

