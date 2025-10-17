import { CONFIG, getColor } from '../config.js'

// ============================================
// ИНСТРУКЦИИ ПО УПРАВЛЕНИЮ ДЛЯ УРОВНЕЙ
// ============================================

/**
 * Добавляет инструкции по управлению на экран
 * @param {Object} k - Kaplay инстанс
 * @param {Object} [options] - Дополнительные опции
 * @param {boolean} [options.showDebugHint=true] - Показывать ли подсказку про F1
 * @returns {Object} Созданный объект с инструкциями
 */
export function addInstructions(k, options = {}) {
  const { showDebugHint = true } = options
  
  // Базовый текст инструкций (без пробелов между стрелками)
  const baseText = "WASD/←↑→ - move\nSpace - jump\nESC - menu"
  const fullText = showDebugHint 
    ? `${baseText}\nF1 - debug info` 
    : baseText
  
  return k.add([
    k.text(fullText, {
      size: CONFIG.visual.instructionsFontSize,
      width: k.width() - 40
    }),
    k.pos(CONFIG.visual.instructionsX, CONFIG.visual.instructionsY),
    getColor(k, CONFIG.colors.level1.instructions),
    k.z(CONFIG.visual.zIndex.ui),
    k.fixed()
  ])
}

// ============================================
// НАВИГАЦИЯ
// ============================================

/**
 * Настраивает возврат в меню по нажатию ESC
 * @param {Object} k - Kaplay инстанс
 */
export function setupBackToMenu(k) {
  CONFIG.controls.backToMenu.forEach(key => {
    k.onKeyPress(key, () => {
      k.go("menu")
    })
  })
}

