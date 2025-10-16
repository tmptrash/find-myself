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
  let headX = 12  // Для наклона тела при беге
  let bodyX = 10  // Для наклона тела при беге
  let leftArmY = 15
  let rightArmY = 15
  let leftLegY = 22
  let rightLegY = 22
  let leftArmX = 9
  let rightArmX = 21
  let leftLegX = 12
  let rightLegX = 17
  
  // Анимация прыжка - боковой вид, короткие ноги раздвинуты симметрично
  if (animation === 'jump') {
    headY = 6
    bodyY = 14
    headX = 12     // Боковой вид
    bodyX = 10
    leftArmY = 15  // Руки (не будут рисоваться)
    rightArmY = 15
    leftLegY = 22  // Ноги прилегают к телу (bodyY + 8 = 22)
    rightLegY = 22
    leftArmX = 9
    rightArmX = 21
    leftLegX = 11  // Левая нога - симметрично левее центра
    rightLegX = 17 // Правая нога - симметрично правее центра
  }
  
  // Черный контур
  ctx.fillStyle = '#000000'
  ctx.fillRect(headX - 1, headY - 1, 10, 10)
  
  // Контур тела - при прыжке рисуем нижнюю линию с пропусками для ног
  if (animation === 'jump') {
    // Тело: левая, верхняя, правая стороны
    ctx.fillRect(bodyX - 1, bodyY - 1, 1, 9)      // Левая сторона
    ctx.fillRect(bodyX - 1, bodyY - 1, 14, 1)     // Верхняя сторона
    ctx.fillRect(bodyX + 12, bodyY - 1, 1, 9)     // Правая сторона
    // Нижняя линия тела с пропусками для ног (Y = bodyY + 7 = 21)
    ctx.fillRect(bodyX - 1, bodyY + 7, 2, 1)      // Слева: X=9,10
    ctx.fillRect(leftLegX, bodyY + 7, 1, 1)       // Угол слева: X=11 ← ДОБАВЛЕН
    ctx.fillRect(leftLegX + 3, bodyY + 7, 1, 1)   // Между ногами слева: X=14 ← ДОБАВЛЕН
    ctx.fillRect(rightLegX - 1, bodyY + 7, 1, 1)  // Между ногами справа: X=16 ← ДОБАВЛЕН
    ctx.fillRect(rightLegX + 2, bodyY + 7, 1, 1)  // Угол справа: X=19 ← ДОБАВЛЕН
    ctx.fillRect(rightLegX + 3, bodyY + 7, 2, 1)  // Справа: X=20,21
  } else {
    // Полный контур тела
    ctx.fillRect(bodyX - 1, bodyY - 1, 14, 10)
  }
  
  // Контуры рук - не рисуем при беге и прыжке
  if (animation !== 'run' && animation !== 'jump') {
    ctx.fillRect(leftArmX - 1, leftArmY - 1, 4, 9) // 4x9: контур вокруг руки 2x7
    ctx.fillRect(rightArmX - 1, rightArmY - 1, 4, 9) // 4x9: контур вокруг руки 2x7
  }
  // Контуры ног - для прыжка короче (угловые пиксели уже нарисованы в контуре тела)
  if (animation === 'jump') {
    ctx.fillRect(leftLegX - 1, leftLegY - 1, 5, 6)  // Короче на 2 пикселя
    ctx.fillRect(rightLegX - 1, rightLegY - 1, 5, 6)
  } else {
    ctx.fillRect(leftLegX - 1, leftLegY - 1, 5, 8)
    ctx.fillRect(rightLegX - 1, rightLegY - 1, 5, 8)
  }
  
  // Голова (оранжевая)
  ctx.fillStyle = '#FF8C00'
  ctx.fillRect(headX, headY, 8, 8)
  
  // Глаза - для бега и прыжка рисуем только ОДИН глаз (боковой вид)
  ctx.fillStyle = '#ffffff'
  if (animation === 'run' || animation === 'jump') {
    // Боковой вид - только один глаз справа
    ctx.fillRect(headX + 6, headY + 2, 3, 3)
  } else {
    // Фронтальный вид - оба глаза
    ctx.fillRect(headX + 1, headY + 2, 3, 3)
    ctx.fillRect(headX + 6, headY + 2, 3, 3)
  }
  
  // Зрачки
  ctx.fillStyle = '#000000'
  if (animation === 'run' || animation === 'jump') {
    // Боковой вид - только один зрачок
    ctx.fillRect(headX + 7, headY + 3, 1, 1)
  } else {
    // Фронтальный вид - оба зрачка
    ctx.fillRect(headX + 2, headY + 3, 1, 1)
    ctx.fillRect(headX + 7, headY + 3, 1, 1)
  }
  
  // Тело (оранжевое)
  ctx.fillStyle = '#FF8C00'
  ctx.fillRect(bodyX, bodyY, 12, 8)
  
  // Руки - не рисуем при беге и прыжке
  if (animation !== 'run' && animation !== 'jump') {
    ctx.fillRect(leftArmX, leftArmY, 2, 7)
    ctx.fillRect(rightArmX, rightArmY, 2, 7)
  }
  
  // Ноги - для прыжка короче, для остальных обычные
  if (animation === 'jump') {
    // Короткие ноги при прыжке (высота 4 вместо 6)
    ctx.fillRect(leftLegX, leftLegY, 3, 4)
    ctx.fillRect(rightLegX, rightLegY, 3, 4)
    
    // Горизонтальная черная линия между туловищем и ногами (поверх оранжевых ног)
    ctx.fillStyle = '#000000'
    ctx.fillRect(bodyX - 1, leftLegY - 1, 14, 1)  // От X=9 до X=22, вся ширина туловища с контурами (Y=21)
  } else {
    // Обычные ноги
    ctx.fillRect(leftLegX, leftLegY, 3, 6)
    ctx.fillRect(rightLegX, rightLegY, 3, 6)
  }
  
  return canvas.toDataURL()
}

// Экспорт функций для создания анимаций
export function createHeroIdleSprite() {
  return createHeroFrame('idle', 0)
}

export function createHeroJumpSprite() {
  return createHeroFrame('jump', 0)
}

// Функция для создания спрайта с зрачками в определенной позиции
export function createHeroWithEyes(k, eyeOffsetX = 0, eyeOffsetY = 0) {
  return createHeroFrameWithEyes('idle', 0, eyeOffsetX, eyeOffsetY)
}

// Создание кадра героя с глазами и разными позами
function createHeroFrameWithEyes(animation, frame, eyeOffsetX = 0, eyeOffsetY = 0) {
  const size = 32
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  
  ctx.clearRect(0, 0, size, size)
  
  // Базовые параметры для разных анимаций
  let headY = 6
  let bodyY = 14
  let headX = 12  // Для наклона тела при беге
  let bodyX = 10  // Для наклона тела при беге
  let leftArmY = 15
  let rightArmY = 15
  let leftLegY = 22
  let rightLegY = 22
  let leftArmX = 9
  let rightArmX = 21
  let leftLegX = 12
  let rightLegX = 17
  
  // Анимация бега (6 кадров, покадрово с согнутыми ногами)
  if (animation === 'run') {
    // Центр тела по X = 16 (bodyX=10, ширина=12, середина=16)
    if (frame === 0) {
      // Кадр 0: Правая нога вперед, левая согнута и назад
      headY = 6
      bodyY = 14
      headX = 12
      bodyX = 10
      leftLegY = 20  // Левая нога сзади - выше
      rightLegY = 22 // Правая нога спереди - на земле
      leftLegX = 10  // Левая сзади - левее центра
      rightLegX = 18 // Правая спереди - правее центра
    } else if (frame === 1) {
      // Кадр 1: Правая подтягивается, левая еще больше согнута
      headY = 6
      bodyY = 14
      headX = 12
      bodyX = 10
      leftLegY = 18  // Левая согнута сильнее - еще выше
      rightLegY = 22 // Правая все еще на земле
      leftLegX = 12  // Левая ближе к центру
      rightLegX = 17 // Правая ближе к центру
    } else if (frame === 2) {
      // Кадр 2: Ноги посередине, закрывают друг друга
      headY = 6
      bodyY = 14
      headX = 12
      bodyX = 10
      leftLegY = 20  // Обе ноги подняты
      rightLegY = 20
      leftLegX = 14  // Практически в одной точке
      rightLegX = 14
    } else if (frame === 3) {
      // Кадр 3: Левая нога вперед, правая согнута и назад (ЗЕРКАЛО кадра 0)
      headY = 6
      bodyY = 14
      headX = 12
      bodyX = 10
      leftLegY = 22 // Левая нога спереди - на земле
      rightLegY = 20 // Правая нога сзади - выше
      leftLegX = 18 // Левая спереди - правее центра
      rightLegX = 10 // Правая сзади - левее центра
    } else if (frame === 4) {
      // Кадр 4: Левая подтягивается, правая еще больше согнута (ЗЕРКАЛО кадра 1)
      headY = 6
      bodyY = 14
      headX = 12
      bodyX = 10
      leftLegY = 22 // Левая все еще на земле
      rightLegY = 18 // Правая согнута сильнее - еще выше
      leftLegX = 17 // Левая ближе к центру
      rightLegX = 12 // Правая ближе к центру
    } else if (frame === 5) {
      // Кадр 5: Ноги посередине (ЗЕРКАЛО кадра 2) - переход в кадр 0
      headY = 6
      bodyY = 14
      headX = 12
      bodyX = 10
      leftLegY = 20  // Обе ноги подняты
      rightLegY = 20
      leftLegX = 14  // Практически в одной точке
      rightLegX = 14
    } else if (frame === 6) {
      // Кадр 6 не используется
      headY = 6
      bodyY = 14
      headX = 12
      bodyX = 10
      leftLegY = 22
      rightLegY = 22
      leftLegX = 14
      rightLegX = 14
    } else {
      // Кадр 7 не используется
      headY = 6
      bodyY = 14
      headX = 12
      bodyX = 10
      leftLegY = 22
      rightLegY = 22
      leftLegX = 14
      rightLegX = 14
    }
  }
  
  // Анимация прыжка - боковой вид, короткие ноги раздвинуты симметрично
  if (animation === 'jump') {
    headY = 6
    bodyY = 14
    headX = 12     // Боковой вид
    bodyX = 10
    leftArmY = 15  // Руки (не будут рисоваться)
    rightArmY = 15
    leftLegY = 22  // Ноги прилегают к телу (bodyY + 8 = 22)
    rightLegY = 22
    leftArmX = 9
    rightArmX = 21
    leftLegX = 11  // Левая нога - симметрично левее центра
    rightLegX = 17 // Правая нога - симметрично правее центра
  }
  
  // Черный контур
  ctx.fillStyle = '#000000'
  ctx.fillRect(headX - 1, headY - 1, 10, 10)
  
  // Контур тела - при прыжке рисуем нижнюю линию с пропусками для ног
  if (animation === 'jump') {
    // Тело: левая, верхняя, правая стороны
    ctx.fillRect(bodyX - 1, bodyY - 1, 1, 9)      // Левая сторона
    ctx.fillRect(bodyX - 1, bodyY - 1, 14, 1)     // Верхняя сторона
    ctx.fillRect(bodyX + 12, bodyY - 1, 1, 9)     // Правая сторона
    // Нижняя линия тела с пропусками для ног (Y = bodyY + 7 = 21)
    ctx.fillRect(bodyX - 1, bodyY + 7, 2, 1)      // Слева: X=9,10
    ctx.fillRect(leftLegX, bodyY + 7, 1, 1)       // Угол слева: X=11 ← ДОБАВЛЕН
    ctx.fillRect(leftLegX + 3, bodyY + 7, 1, 1)   // Между ногами слева: X=14 ← ДОБАВЛЕН
    ctx.fillRect(rightLegX - 1, bodyY + 7, 1, 1)  // Между ногами справа: X=16 ← ДОБАВЛЕН
    ctx.fillRect(rightLegX + 2, bodyY + 7, 1, 1)  // Угол справа: X=19 ← ДОБАВЛЕН
    ctx.fillRect(rightLegX + 3, bodyY + 7, 2, 1)  // Справа: X=20,21
  } else {
    // Полный контур тела
    ctx.fillRect(bodyX - 1, bodyY - 1, 14, 10)
  }
  
  // Контуры рук - не рисуем при беге и прыжке
  if (animation !== 'run' && animation !== 'jump') {
    ctx.fillRect(leftArmX - 1, leftArmY - 1, 4, 9) // 4x9: контур вокруг руки 2x7
    ctx.fillRect(rightArmX - 1, rightArmY - 1, 4, 9) // 4x9: контур вокруг руки 2x7
  }
  // Контуры ног - для прыжка короче (угловые пиксели уже нарисованы в контуре тела)
  if (animation === 'jump') {
    ctx.fillRect(leftLegX - 1, leftLegY - 1, 5, 6)  // Короче на 2 пикселя
    ctx.fillRect(rightLegX - 1, rightLegY - 1, 5, 6)
  } else {
    ctx.fillRect(leftLegX - 1, leftLegY - 1, 5, 8)
    ctx.fillRect(rightLegX - 1, rightLegY - 1, 5, 8)
  }
  
  // Голова (оранжевая)
  ctx.fillStyle = '#FF8C00'
  ctx.fillRect(headX, headY, 8, 8)
  
  // Белки глаз - для бега и прыжка рисуем только ОДИН глаз (боковой вид)
  ctx.fillStyle = '#ffffff'
  if (animation === 'run' || animation === 'jump') {
    // Боковой вид - только один глаз справа
    ctx.fillRect(headX + 6, headY + 2, 3, 3)
  } else {
    // Фронтальный вид - оба глаза
    ctx.fillRect(headX + 1, headY + 2, 3, 3)
    ctx.fillRect(headX + 6, headY + 2, 3, 3)
  }
  
  // Зрачки (черные точки)
  ctx.fillStyle = '#000000'
  if (animation === 'run' || animation === 'jump') {
    // Боковой вид - только один зрачок
    ctx.fillRect(headX + 7 + eyeOffsetX, headY + 3 + eyeOffsetY, 1, 1)
  } else {
    // Фронтальный вид - оба зрачка
    ctx.fillRect(headX + 2 + eyeOffsetX, headY + 3 + eyeOffsetY, 1, 1)
    ctx.fillRect(headX + 7 + eyeOffsetX, headY + 3 + eyeOffsetY, 1, 1)
  }
  
  // Тело (оранжевое)
  ctx.fillStyle = '#FF8C00'
  ctx.fillRect(bodyX, bodyY, 12, 8)
  
  // Руки - не рисуем при беге и прыжке
  if (animation !== 'run' && animation !== 'jump') {
    ctx.fillRect(leftArmX, leftArmY, 2, 7)
    ctx.fillRect(rightArmX, rightArmY, 2, 7)
  }
  
  // Ноги - для прыжка короче, для остальных обычные
  if (animation === 'jump') {
    // Короткие ноги при прыжке (высота 4 вместо 6)
    ctx.fillRect(leftLegX, leftLegY, 3, 4)
    ctx.fillRect(rightLegX, rightLegY, 3, 4)
    
    // Горизонтальная черная линия между туловищем и ногами (поверх оранжевых ног)
    ctx.fillStyle = '#000000'
    ctx.fillRect(bodyX - 1, leftLegY - 1, 14, 1)  // От X=9 до X=22, вся ширина туловища с контурами (Y=21)
  } else {
    // Обычные ноги
    ctx.fillRect(leftLegX, leftLegY, 3, 6)
    ctx.fillRect(rightLegX, rightLegY, 3, 6)
  }
  
  return canvas.toDataURL()
}

// Экспорт функций для создания анимаций героя с глазами
export function createHeroRunSprite(frame, eyeOffsetX = 0, eyeOffsetY = 0) {
  return createHeroFrameWithEyes('run', frame, eyeOffsetX, eyeOffsetY)
}

export function createAntiHeroWithEyes(k, eyeOffsetX = 0, eyeOffsetY = 0) {
  return createAntiHeroFrameWithEyes('idle', 0, eyeOffsetX, eyeOffsetY)
}

// Создание кадра антигероя с глазами и разными позами
function createAntiHeroFrameWithEyes(animation, frame, eyeOffsetX = 0, eyeOffsetY = 0) {
  const size = 32
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  
  ctx.clearRect(0, 0, size, size)
  
  // Базовые параметры для разных анимаций
  let headY = 6
  let bodyY = 14
  let headX = 12  // Для наклона тела при беге
  let bodyX = 10  // Для наклона тела при беге
  let leftArmY = 15
  let rightArmY = 15
  let leftLegY = 22
  let rightLegY = 22
  let leftArmX = 9
  let rightArmX = 21
  let leftLegX = 12
  let rightLegX = 17
  
  // Анимация бега (6 кадров, покадрово с согнутыми ногами)
  if (animation === 'run') {
    // Центр тела по X = 16 (bodyX=10, ширина=12, середина=16)
    if (frame === 0) {
      // Кадр 0: Правая нога вперед, левая согнута и назад
      headY = 6
      bodyY = 14
      headX = 12
      bodyX = 10
      leftLegY = 20  // Левая нога сзади - выше
      rightLegY = 22 // Правая нога спереди - на земле
      leftLegX = 10  // Левая сзади - левее центра
      rightLegX = 18 // Правая спереди - правее центра
    } else if (frame === 1) {
      // Кадр 1: Правая подтягивается, левая еще больше согнута
      headY = 6
      bodyY = 14
      headX = 12
      bodyX = 10
      leftLegY = 18  // Левая согнута сильнее - еще выше
      rightLegY = 22 // Правая все еще на земле
      leftLegX = 12  // Левая ближе к центру
      rightLegX = 17 // Правая ближе к центру
    } else if (frame === 2) {
      // Кадр 2: Ноги посередине, закрывают друг друга
      headY = 6
      bodyY = 14
      headX = 12
      bodyX = 10
      leftLegY = 20  // Обе ноги подняты
      rightLegY = 20
      leftLegX = 14  // Практически в одной точке
      rightLegX = 14
    } else if (frame === 3) {
      // Кадр 3: Левая нога вперед, правая согнута и назад (ЗЕРКАЛО кадра 0)
      headY = 6
      bodyY = 14
      headX = 12
      bodyX = 10
      leftLegY = 22 // Левая нога спереди - на земле
      rightLegY = 20 // Правая нога сзади - выше
      leftLegX = 18 // Левая спереди - правее центра
      rightLegX = 10 // Правая сзади - левее центра
    } else if (frame === 4) {
      // Кадр 4: Левая подтягивается, правая еще больше согнута (ЗЕРКАЛО кадра 1)
      headY = 6
      bodyY = 14
      headX = 12
      bodyX = 10
      leftLegY = 22 // Левая все еще на земле
      rightLegY = 18 // Правая согнута сильнее - еще выше
      leftLegX = 17 // Левая ближе к центру
      rightLegX = 12 // Правая ближе к центру
    } else if (frame === 5) {
      // Кадр 5: Ноги посередине (ЗЕРКАЛО кадра 2) - переход в кадр 0
      headY = 6
      bodyY = 14
      headX = 12
      bodyX = 10
      leftLegY = 20  // Обе ноги подняты
      rightLegY = 20
      leftLegX = 14  // Практически в одной точке
      rightLegX = 14
    } else if (frame === 6) {
      // Кадр 6 не используется
      headY = 6
      bodyY = 14
      headX = 12
      bodyX = 10
      leftLegY = 22
      rightLegY = 22
      leftLegX = 14
      rightLegX = 14
    } else {
      // Кадр 7 не используется
      headY = 6
      bodyY = 14
      headX = 12
      bodyX = 10
      leftLegY = 22
      rightLegY = 22
      leftLegX = 14
      rightLegX = 14
    }
  }
  
  // Анимация прыжка - боковой вид, короткие ноги раздвинуты симметрично
  if (animation === 'jump') {
    headY = 6
    bodyY = 14
    headX = 12     // Боковой вид
    bodyX = 10
    leftArmY = 15  // Руки (не будут рисоваться)
    rightArmY = 15
    leftLegY = 22  // Ноги прилегают к телу (bodyY + 8 = 22)
    rightLegY = 22
    leftArmX = 9
    rightArmX = 21
    leftLegX = 11  // Левая нога - симметрично левее центра
    rightLegX = 17 // Правая нога - симметрично правее центра
  }
  
  // Оранжевый контур
  ctx.fillStyle = '#FF8C00'
  ctx.fillRect(11, headY - 1, 10, 10)
  ctx.fillRect(9, bodyY - 1, 14, 10)
  ctx.fillRect(leftArmX - 1, leftArmY - 1, 4, 9) // 4x9: контур вокруг руки 2x7
  ctx.fillRect(rightArmX - 1, rightArmY - 1, 4, 9) // 4x9: контур вокруг руки 2x7
  // Контуры ног - для прыжка короче (угловые пиксели уже нарисованы в контуре тела)
  if (animation === 'jump') {
    ctx.fillRect(leftLegX - 1, leftLegY - 1, 5, 6)  // Короче на 2 пикселя
    ctx.fillRect(rightLegX - 1, rightLegY - 1, 5, 6)
  } else {
    ctx.fillRect(leftLegX - 1, leftLegY - 1, 5, 8)
    ctx.fillRect(rightLegX - 1, rightLegY - 1, 5, 8)
  } // Исправлено: добавлено -1
  
  // Голова (темно-коричневая)
  ctx.fillStyle = '#3E2723'
  ctx.fillRect(12, headY, 8, 8)
  
  // Белки глаз
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(13, headY + 2, 3, 3)
  ctx.fillRect(18, headY + 2, 3, 3)
  
  // Зрачки (черные точки)
  ctx.fillStyle = '#000000'
  ctx.fillRect(14 + eyeOffsetX, headY + 3 + eyeOffsetY, 1, 1)
  ctx.fillRect(19 + eyeOffsetX, headY + 3 + eyeOffsetY, 1, 1)
  
  // Тело (темно-коричневое)
  ctx.fillStyle = '#3E2723'
  ctx.fillRect(10, bodyY, 12, 8)
  
  // Руки - не рисуем при беге и прыжке
  if (animation !== 'run' && animation !== 'jump') {
    ctx.fillRect(leftArmX, leftArmY, 2, 7)
    ctx.fillRect(rightArmX, rightArmY, 2, 7)
  }
  
  // Ноги - для прыжка короче, для остальных обычные
  if (animation === 'jump') {
    // Короткие ноги при прыжке (высота 4 вместо 6)
    ctx.fillRect(leftLegX, leftLegY, 3, 4)
    ctx.fillRect(rightLegX, rightLegY, 3, 4)
    
    // Горизонтальная черная линия между туловищем и ногами (поверх оранжевых ног)
    ctx.fillStyle = '#000000'
    ctx.fillRect(bodyX - 1, leftLegY - 1, 14, 1)  // От X=9 до X=22, вся ширина туловища с контурами (Y=21)
  } else {
    // Обычные ноги
    ctx.fillRect(leftLegX, leftLegY, 3, 6)
    ctx.fillRect(rightLegX, rightLegY, 3, 6)
  }
  
  return canvas.toDataURL()
}

// Экспорт функций для создания анимаций антигероя с глазами
export function createAntiHeroRunSprite(frame, eyeOffsetX = 0, eyeOffsetY = 0) {
  return createAntiHeroFrameWithEyes('run', frame, eyeOffsetX, eyeOffsetY)
}

export function createAntiHeroJumpSpriteWithEyes(eyeOffsetX = 0, eyeOffsetY = 0) {
  return createAntiHeroFrameWithEyes('jump', 0, eyeOffsetX, eyeOffsetY)
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

