// Создание простого пиксель-арт героя
export function createHeroSprite(k) {
  // Создаём canvas для рисования героя
  const size = 32
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  
  // Очищаем
  ctx.clearRect(0, 0, size, size)
  
  // Черный контур для видимости на желтом фоне
  ctx.fillStyle = '#000000'
  ctx.fillRect(11, 5, 10, 10)  // Контур головы
  ctx.fillRect(9, 13, 14, 10)  // Контур тела
  ctx.fillRect(8, 14, 3, 8)    // Контур левой руки (вниз)
  ctx.fillRect(21, 14, 3, 8)   // Контур правой руки (вниз)
  ctx.fillRect(11, 21, 5, 8)   // Контур левой ноги
  ctx.fillRect(16, 21, 5, 8)   // Контур правой ноги
  
  // Голова (оранжевая)
  ctx.fillStyle = '#FF8C00'
  ctx.fillRect(12, 6, 8, 8)
  
  // Глаза - рисуем как белки, зрачки добавим динамически
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(13, 8, 3, 3)
  ctx.fillRect(18, 8, 3, 3)
  
  // Тело (оранжевое)
  ctx.fillStyle = '#FF8C00'
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

