import { CONFIG, getHex } from '../config.js'

// ============================================
// УНИВЕРСАЛЬНАЯ ФУНКЦИЯ ДЛЯ СОЗДАНИЯ ПЕРСОНАЖА
// ============================================
// Одна функция для героя и анти-героя
// type: 'hero' или 'antihero'
// animation: 'idle', 'run', 'jump'
// frame: номер кадра (для анимаций)
// eyeOffsetX, eyeOffsetY: смещение зрачков

function createCharacterFrame(type = 'hero', animation = 'idle', frame = 0, eyeOffsetX = 0, eyeOffsetY = 0) {
  // Выбираем цветовую схему на основе типа
  const colors = type === 'hero' ? CONFIG.colors.hero : CONFIG.colors.antiHero
  
  const size = 32
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  
  ctx.clearRect(0, 0, size, size)
  
  // Базовые параметры для разных анимаций
  let headY = 6
  let bodyY = 14
  let headX = 12
  let bodyX = 10
  let leftArmY = 15
  let rightArmY = 15
  let leftLegY = 22
  let rightLegY = 22
  let leftArmX = 9
  let rightArmX = 21
  let leftLegX = 12
  let rightLegX = 17
  
  // Анимация бега (6 кадров)
  if (animation === 'run') {
    if (frame === 0) {
      leftLegY = 20
      rightLegY = 22
      leftLegX = 10
      rightLegX = 18
    } else if (frame === 1) {
      leftLegY = 18
      rightLegY = 22
      leftLegX = 12
      rightLegX = 17
    } else if (frame === 2) {
      leftLegY = 20
      rightLegY = 20
      leftLegX = 14
      rightLegX = 14
    } else if (frame === 3) {
      leftLegY = 22
      rightLegY = 20
      leftLegX = 18
      rightLegX = 10
    } else if (frame === 4) {
      leftLegY = 22
      rightLegY = 18
      leftLegX = 17
      rightLegX = 12
    } else if (frame === 5) {
      leftLegY = 20
      rightLegY = 20
      leftLegX = 14
      rightLegX = 14
    }
  }
  
  // Анимация прыжка - боковой вид, короткие ноги
  if (animation === 'jump') {
    headY = 6
    bodyY = 14
    headX = 12
    bodyX = 10
    leftArmY = 15
    rightArmY = 15
    leftLegY = 22
    rightLegY = 22
    leftArmX = 9
    rightArmX = 21
    leftLegX = 11
    rightLegX = 17
  }
  
  // Черный контур (универсальный)
  ctx.fillStyle = getHex(colors.outline)
  ctx.fillRect(headX - 1, headY - 1, 10, 10)
  
  // Контур тела - при прыжке рисуем нижнюю линию с пропусками для ног
  if (animation === 'jump') {
    ctx.fillRect(bodyX - 1, bodyY - 1, 1, 9)
    ctx.fillRect(bodyX - 1, bodyY - 1, 14, 1)
    ctx.fillRect(bodyX + 12, bodyY - 1, 1, 9)
    ctx.fillRect(bodyX - 1, bodyY + 7, 2, 1)
    ctx.fillRect(leftLegX, bodyY + 7, 1, 1)
    ctx.fillRect(leftLegX + 3, bodyY + 7, 1, 1)
    ctx.fillRect(rightLegX - 1, bodyY + 7, 1, 1)
    ctx.fillRect(rightLegX + 2, bodyY + 7, 1, 1)
    ctx.fillRect(rightLegX + 3, bodyY + 7, 2, 1)
  } else {
    ctx.fillRect(bodyX - 1, bodyY - 1, 14, 10)
  }
  
  // Контуры рук - не рисуем при беге и прыжке
  if (animation !== 'run' && animation !== 'jump') {
    ctx.fillRect(leftArmX - 1, leftArmY - 1, 4, 9)
    ctx.fillRect(rightArmX - 1, rightArmY - 1, 4, 9)
  }
  
  // Контуры ног
  if (animation === 'jump') {
    ctx.fillRect(leftLegX - 1, leftLegY - 1, 5, 6)
    ctx.fillRect(rightLegX - 1, rightLegY - 1, 5, 6)
  } else {
    ctx.fillRect(leftLegX - 1, leftLegY - 1, 5, 8)
    ctx.fillRect(rightLegX - 1, rightLegY - 1, 5, 8)
  }
  
  // Голова (универсальный цвет тела)
  ctx.fillStyle = getHex(colors.body)
  ctx.fillRect(headX, headY, 8, 8)
  
  // Глаза - для бега и прыжка рисуем только ОДИН глаз (боковой вид)
  ctx.fillStyle = getHex(colors.eyeWhite)
  if (animation === 'run' || animation === 'jump') {
    ctx.fillRect(headX + 6, headY + 2, 3, 3)
  } else {
    ctx.fillRect(headX + 1, headY + 2, 3, 3)
    ctx.fillRect(headX + 6, headY + 2, 3, 3)
  }
  
  // Зрачки (универсальный цвет)
  ctx.fillStyle = getHex(colors.outline)
  if (animation === 'run' || animation === 'jump') {
    ctx.fillRect(headX + 7, headY + 3, 1, 1)
  } else {
    ctx.fillRect(headX + 2 + eyeOffsetX, headY + 3 + eyeOffsetY, 1, 1)
    ctx.fillRect(headX + 7 + eyeOffsetX, headY + 3 + eyeOffsetY, 1, 1)
  }
  
  // Тело (универсальный цвет)
  ctx.fillStyle = getHex(colors.body)
  ctx.fillRect(bodyX, bodyY, 12, 8)
  
  // Руки - не рисуем при беге и прыжке
  if (animation !== 'run' && animation !== 'jump') {
    ctx.fillRect(leftArmX, leftArmY, 2, 7)
    ctx.fillRect(rightArmX, rightArmY, 2, 7)
  }
  
  // Ноги
  if (animation === 'jump') {
    ctx.fillRect(leftLegX, leftLegY, 3, 4)
    ctx.fillRect(rightLegX, rightLegY, 3, 4)
    
    // Горизонтальная линия между туловищем и ногами
    ctx.fillStyle = getHex(colors.outline)
    ctx.fillRect(bodyX - 1, leftLegY - 1, 14, 1)
  } else {
    ctx.fillRect(leftLegX, leftLegY, 3, 6)
    ctx.fillRect(rightLegX, rightLegY, 3, 6)
  }
  
  return canvas.toDataURL()
}

// ============================================
// ЭКСПОРТИРУЕМЫЕ ФУНКЦИИ ДЛЯ ГЕРОЯ
// ============================================

export function createHeroSprite(k) {
  return createCharacterFrame('hero', 'idle', 0)
}

export function createHeroIdleSprite() {
  return createCharacterFrame('hero', 'idle', 0)
}

export function createHeroJumpSprite() {
  return createCharacterFrame('hero', 'jump', 0)
}

export function createHeroWithEyes(k, eyeOffsetX = 0, eyeOffsetY = 0) {
  return createCharacterFrame('hero', 'idle', 0, eyeOffsetX, eyeOffsetY)
}

export function createHeroRunSprite(frame, eyeOffsetX = 0, eyeOffsetY = 0) {
  return createCharacterFrame('hero', 'run', frame, eyeOffsetX, eyeOffsetY)
}

// ============================================
// ЭКСПОРТИРУЕМЫЕ ФУНКЦИИ ДЛЯ АНТИ-ГЕРОЯ
// ============================================

export function createAntiHeroSprite(k) {
  return createCharacterFrame('antihero', 'idle', 0)
}

export function createAntiHeroWithEyes(k, eyeOffsetX = 0, eyeOffsetY = 0) {
  return createCharacterFrame('antihero', 'idle', 0, eyeOffsetX, eyeOffsetY)
}

export function createAntiHeroRunSprite(frame, eyeOffsetX = 0, eyeOffsetY = 0) {
  return createCharacterFrame('antihero', 'run', frame, eyeOffsetX, eyeOffsetY)
}

export function createAntiHeroJumpSpriteWithEyes(eyeOffsetX = 0, eyeOffsetY = 0) {
  return createCharacterFrame('antihero', 'jump', 0, eyeOffsetX, eyeOffsetY)
}
