// Создание простого пиксель-арт героя (idle)
export function createHeroSprite(k) {
  return createHeroFrame('idle', 0)
}

// Создание кадра героя с разными позами
function createHeroFrame(animation, frame) {
  const size = 32
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  
  ctx.clearRect(0, 0, size, size)
  
  // Базовые параметры для разных анимаций
  let headY = 6
  let bodyY = 14
  let leftArmY = 15
  let rightArmY = 15
  let leftLegY = 22
  let rightLegY = 22
  let leftArmX = 9
  let rightArmX = 21
  let leftLegX = 12
  let rightLegX = 17
  
  // Анимация ходьбы (2 кадра)
  if (animation === 'walk') {
    if (frame === 0) {
      // Кадр 1: левая нога вперед, правая назад
      leftLegY = 21
      rightLegY = 23
      leftArmY = 16
      rightArmY = 14
    } else {
      // Кадр 2: правая нога вперед, левая назад
      leftLegY = 23
      rightLegY = 21
      leftArmY = 14
      rightArmY = 16
    }
  }
  
  // Анимация прыжка
  if (animation === 'jump') {
    headY = 5
    bodyY = 13
    leftArmY = 13
    rightArmY = 13
    leftLegY = 22
    rightLegY = 22
    // Руки вверх
    leftArmX = 8
    rightArmX = 22
  }
  
  // Черный контур
  ctx.fillStyle = '#000000'
  ctx.fillRect(11, headY - 1, 10, 10)
  ctx.fillRect(9, bodyY - 1, 14, 10)
  ctx.fillRect(leftArmX - 1, leftArmY - 1, 3, 8)
  ctx.fillRect(rightArmX, rightArmY - 1, 3, 8)
  ctx.fillRect(leftLegX - 1, leftLegY - 1, 5, 8)
  ctx.fillRect(rightLegX, rightLegY - 1, 5, 8)
  
  // Голова (оранжевая)
  ctx.fillStyle = '#FF8C00'
  ctx.fillRect(12, headY, 8, 8)
  
  // Глаза
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(13, headY + 2, 3, 3)
  ctx.fillRect(18, headY + 2, 3, 3)
  
  // Зрачки
  ctx.fillStyle = '#000000'
  ctx.fillRect(14, headY + 3, 1, 1)
  ctx.fillRect(19, headY + 3, 1, 1)
  
  // Тело (оранжевое)
  ctx.fillStyle = '#FF8C00'
  ctx.fillRect(10, bodyY, 12, 8)
  
  // Руки
  ctx.fillRect(leftArmX, leftArmY, 2, 7)
  ctx.fillRect(rightArmX, rightArmY, 2, 7)
  
  // Ноги
  ctx.fillRect(leftLegX, leftLegY, 3, 6)
  ctx.fillRect(rightLegX, rightLegY, 3, 6)
  
  return canvas.toDataURL()
}

// Экспорт функций для создания анимаций
export function createHeroIdleSprite() {
  return createHeroFrame('idle', 0)
}

export function createHeroWalkSprite(frame) {
  return createHeroFrame('walk', frame)
}

export function createHeroJumpSprite() {
  return createHeroFrame('jump', 0)
}

// Функция для создания спрайта с зрачками в определенной позиции
export function createHeroWithEyes(k, eyeOffsetX = 0, eyeOffsetY = 0) {
  const size = 32
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  
  ctx.clearRect(0, 0, size, size)
  
  // Рисуем базового героя
  ctx.fillStyle = '#000000'
  ctx.fillRect(11, 5, 10, 10)
  ctx.fillRect(9, 13, 14, 10)
  ctx.fillRect(8, 14, 3, 8)
  ctx.fillRect(21, 14, 3, 8)
  ctx.fillRect(11, 21, 5, 8)
  ctx.fillRect(16, 21, 5, 8)
  
  ctx.fillStyle = '#FF8C00'
  ctx.fillRect(12, 6, 8, 8)
  
  // Белки глаз
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(13, 8, 3, 3)
  ctx.fillRect(18, 8, 3, 3)
  
  // Зрачки (черные точки)
  ctx.fillStyle = '#000000'
  ctx.fillRect(14 + eyeOffsetX, 9 + eyeOffsetY, 1, 1)
  ctx.fillRect(19 + eyeOffsetX, 9 + eyeOffsetY, 1, 1)
  
  ctx.fillStyle = '#FF8C00'
  ctx.fillRect(10, 14, 12, 8)
  ctx.fillRect(9, 15, 2, 7)
  ctx.fillRect(21, 15, 2, 7)
  ctx.fillRect(12, 22, 3, 6)
  ctx.fillRect(17, 22, 3, 6)
  
  return canvas.toDataURL()
}

export function createAntiHeroWithEyes(k, eyeOffsetX = 0, eyeOffsetY = 0) {
  const size = 32
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  
  ctx.clearRect(0, 0, size, size)
  
  // Рисуем базового антигероя
  ctx.fillStyle = '#FF8C00'
  ctx.fillRect(11, 5, 10, 10)
  ctx.fillRect(9, 13, 14, 10)
  ctx.fillRect(8, 14, 3, 8)
  ctx.fillRect(21, 14, 3, 8)
  ctx.fillRect(11, 21, 5, 8)
  ctx.fillRect(16, 21, 5, 8)
  
  ctx.fillStyle = '#3E2723'
  ctx.fillRect(12, 6, 8, 8)
  
  // Белки глаз
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(13, 8, 3, 3)
  ctx.fillRect(18, 8, 3, 3)
  
  // Зрачки (черные точки - для контраста)
  ctx.fillStyle = '#000000'
  ctx.fillRect(14 + eyeOffsetX, 9 + eyeOffsetY, 1, 1)
  ctx.fillRect(19 + eyeOffsetX, 9 + eyeOffsetY, 1, 1)
  
  ctx.fillStyle = '#3E2723'
  ctx.fillRect(10, 14, 12, 8)
  ctx.fillRect(9, 15, 2, 7)
  ctx.fillRect(21, 15, 2, 7)
  ctx.fillRect(12, 22, 3, 6)
  ctx.fillRect(17, 22, 3, 6)
  
  return canvas.toDataURL()
}

export function createAntiHeroSprite(k) {
  // Создаём canvas для антигероя
  const size = 32
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  
  // Очищаем
  ctx.clearRect(0, 0, size, size)
  
  // Оранжевый контур для видимости на темно-коричневом фоне
  ctx.fillStyle = '#FF8C00'
  ctx.fillRect(11, 5, 10, 10)  // Контур головы
  ctx.fillRect(9, 13, 14, 10)  // Контур тела
  ctx.fillRect(8, 14, 3, 8)    // Контур левой руки (вниз)
  ctx.fillRect(21, 14, 3, 8)   // Контур правой руки (вниз)
  ctx.fillRect(11, 21, 5, 8)   // Контур левой ноги
  ctx.fillRect(16, 21, 5, 8)   // Контур правой ноги
  
  // Голова (темно-коричневая)
  ctx.fillStyle = '#3E2723'
  ctx.fillRect(12, 6, 8, 8)
  
  // Белки глаз
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(13, 8, 3, 3)
  ctx.fillRect(18, 8, 3, 3)
  
  // Зрачки (черные точки)
  ctx.fillStyle = '#000000'
  ctx.fillRect(14, 9, 1, 1)
  ctx.fillRect(19, 9, 1, 1)
  
  // Тело (темно-коричневое)
  ctx.fillStyle = '#3E2723'
  ctx.fillRect(10, 14, 12, 8)
  
  // Руки (вниз)
  ctx.fillRect(9, 15, 2, 7)
  ctx.fillRect(21, 15, 2, 7)
  
  // Ноги
  ctx.fillRect(12, 22, 3, 6)
  ctx.fillRect(17, 22, 3, 6)
  
  // Конвертируем в base64
  const dataUrl = canvas.toDataURL()
  
  return dataUrl
}

