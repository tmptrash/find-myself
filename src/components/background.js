import { CONFIG, getColor } from '../config.js'

// ============================================
// УНИВЕРСАЛЬНЫЙ ФОН ДЛЯ ВСЕХ СЦЕН
// ============================================

/**
 * Добавляет фон в сцену
 * @param {Object} k - Kaplay инстанс
 * @param {Array} color - Цвет фона в формате [r, g, b]
 * @returns {Object} Объект фона
 */
export function addBackground(k, color) {
  return k.add([
    k.rect(k.width(), k.height()),
    getColor(k, color),
    k.pos(0, 0),
    k.fixed(),
    k.z(CONFIG.visual.zIndex.background)
  ])
}

