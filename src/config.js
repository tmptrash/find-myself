// ============================================
// ГЛОБАЛЬНАЯ КОНФИГУРАЦИЯ ИГРЫ
// ============================================
// Все настраиваемые параметры в одном месте

export const CONFIG = {
  // ==========================================
  // АУДИО
  // ==========================================
  audio: {
    // Ambient музыка (заставка/меню)
    ambient: {
      masterVolume: 0.52,        // Общая громкость ambient музыки
      bassVolume: 0.08,          // Громкость низких дронов
      midVolume: 0.03,           // Громкость средних тонов
      highVolume: 0.015,         // Громкость высоких тонов
      noiseVolume: 0.03,         // Громкость шума
      blipVolume: 0.08,          // Громкость случайных звуков
      fadeInTime: 0.5,           // Время fade-in (секунды)
    },
    
    // Звуковые эффекты уровня
    sfx: {
      landVolume: 0.343,         // Громкость звука приземления
      landFade: 0.029,           // Затухание приземления
      landDuration: 0.1,         // Длительность звука (секунды)
      landFreqStart: 250,        // Начальная частота (Hz)
      landFreqEnd: 80,           // Конечная частота (Hz)
      
      stepVolume: 0.176,         // Громкость звука шагов
      stepFade: 0.022,           // Затухание шагов
      stepDuration: 0.05,        // Длительность звука (секунды)
      stepFreqStart: 180,        // Начальная частота (Hz)
      stepFreqEnd: 60,           // Конечная частота (Hz)
    }
  },

  // ==========================================
  // ГЕЙМПЛЕЙ
  // ==========================================
  gameplay: {
    // Физика
    moveSpeed: 450,              // Скорость движения героя (px/s)
    jumpForce: 800,              // Сила прыжка (px/s)
    gravity: 2200,               // Гравитация (px/s²)
    
    // Анимации
    runAnimSpeed: 0.04,          // Скорость анимации бега (сек на кадр)
    runFrameCount: 6,            // Количество кадров бега
    eyeAnimMinDelay: 1.5,        // Мин задержка анимации глаз (сек)
    eyeAnimMaxDelay: 3.5,        // Макс задержка анимации глаз (сек)
    eyeLerpSpeed: 0.1,           // Скорость интерполяции глаз
    
    // Размеры героя и коллизий
    heroScale: 3,                // Масштаб спрайта героя
    collisionWidth: 14,          // Ширина collision box (px)
    collisionHeight: 25,         // Высота collision box (px)
    collisionOffsetX: 0,         // Смещение collision box по X
    collisionOffsetY: 0,         // Смещение collision box по Y
  },

  // ==========================================
  // ЦВЕТА
  // ==========================================
  colors: {
    // Цвета уровня 1
    level1: {
      background: [255, 218, 185],  // Светлый персиковый фон
      platform: [62, 39, 35],       // Темно-коричневые платформы
      instructions: [255, 218, 185], // Цвет текста инструкций
      debug: [62, 39, 35],          // Цвет debug текста
    },
    
    // Цвета заставки/меню
    menu: {
      background: [25, 25, 25],     // Темно-серый фон
      gridLines: [50, 50, 50],      // Линии сетки
      titleBase: [255, 140, 0],     // Базовый цвет заголовка
      startButton: [255, 100, 50],  // Цвет кнопки старта
      muteText: [255, 165, 0],      // Цвет текста mute
      dividerLine: [255, 140, 0],   // Разделительная линия
    },
    
    // Цвета стартового экрана
    start: {
      background: [25, 25, 25],     // Темный фон
      button: [255, 100, 50],       // Кнопка "Are you ready?"
      buttonText: [255, 255, 255],  // Текст на кнопке
      buttonOutline: [0, 0, 0],     // Обводка кнопки
      hint: [150, 150, 150],        // Цвет подсказки
    },
    
    // Цвета героя (для процедурной генерации)
    hero: {
      skin: [255, 204, 170],        // Цвет кожи
      outline: [0, 0, 0],           // Черный контур
      eyeWhite: [255, 255, 255],    // Белок глаза
      eyePupil: [0, 0, 0],          // Зрачок
    }
  },

  // ==========================================
  // УПРАВЛЕНИЕ (КЛАВИШИ)
  // ==========================================
  controls: {
    // Движение
    moveLeft: ['left', 'a'],       // Движение влево
    moveRight: ['right', 'd'],     // Движение вправо
    moveUp: ['up', 'w'],           // Движение вверх (для прыжка)
    
    // Действия
    jump: ['up', 'w', 'space'],    // Прыжок
    
    // Система
    toggleDebug: ['f1'],           // Включить/выключить debug режим
    toggleMute: ['m'],             // Включить/выключить звук
    backToMenu: ['escape'],        // Вернуться в меню
    startGame: ['space', 'enter'], // Начать игру (из меню/старта)
  },

  // ==========================================
  // ВИЗУАЛ
  // ==========================================
  visual: {
    // Размеры окна
    windowWidth: 1280,
    windowHeight: 920,
    
    // Размеры платформ
    platformHeight: 150,           // Высота больших платформ
    wallWidth: 30,                 // Ширина стен коридора
    smallPlatformHeight: 20,       // Высота маленьких платформ
    
    // Размеры UI
    instructionsFontSize: 14,      // Размер шрифта инструкций
    debugFontSize: 14,             // Размер шрифта debug
    titleFontSize: 64,             // Размер шрифта заголовка
    buttonFontSize: 36,            // Размер шрифта на кнопках
    
    // Позиции UI
    instructionsX: 20,             // X позиция инструкций
    instructionsY: 20,             // Y позиция инструкций
    debugX: -220,                  // X offset от правого края для debug
    debugY: 20,                    // Y позиция debug
    
    // Границы игрока (level1)
    playerBounds: {
      leftOffset: 60,              // Отступ от левой стены
      rightOffset: 60,             // Отступ от правой стены  
      topOffset: 180,              // Отступ от верхней платформы
      bottomOffset: 180,           // Отступ от нижней платформы
    },
    
    // Анимации меню
    menu: {
      bgScrollSpeed: 0.5,          // Скорость прокрутки фона
      glitchFrequency: 0.5,        // Частота глитчей (секунды)
      titlePulseSpeed: 3,          // Скорость пульсации заголовка
      buttonPulseAmount: 0.03,     // Амплитуда пульсации кнопки
      buttonHoverScale: 1.08,      // Масштаб кнопки при наведении
    },
    
    // Z-индексы (слои)
    zIndex: {
      background: -100,
      platforms: 0,
      player: 10,
      ui: 100,
    }
  },

  // ==========================================
  // УРОВНИ
  // ==========================================
  levels: {
    level1: {
      name: "Level 1",
      startPosX: 'center',         // 'center' или число
      startPosY: 300,              // Начальная Y позиция
      
      // Конфигурация платформ
      platforms: {
        bottom: { height: 150 },
        top: { height: 150 },
        leftWall: { width: 30 },
        rightWall: { width: 30 },
      }
    }
  },

  // ==========================================
  // ДЕБАГ
  // ==========================================
  debug: {
    startInDebugMode: false,       // Начинать в режиме отладки
    showFPS: false,                // Показывать FPS
    showCollisionBoxes: false,     // Показывать collision boxes
    logAudioEvents: false,         // Логировать аудио события
  }
}

// Вспомогательные функции для работы с конфигом

// Получить цвет как объект Kaplay
export function getColor(k, colorArray) {
  return k.color(colorArray[0], colorArray[1], colorArray[2])
}

// Получить RGB цвет как объект Kaplay
export function getRGB(k, colorArray) {
  return k.rgb(colorArray[0], colorArray[1], colorArray[2])
}

// Проверить нажата ли одна из клавиш
export function isAnyKeyDown(k, keys) {
  return keys.some(key => k.isKeyDown(key))
}

// Проверить нажата ли одна из клавиш (press)
export function isAnyKeyPressed(k, keys) {
  return keys.some(key => k.isKeyPressed(key))
}

