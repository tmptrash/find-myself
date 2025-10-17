# Глобальная конфигурация игры

## Описание

Файл `src/config.js` содержит все настраиваемые параметры игры в одном месте.

## Структура конфига

### 📢 AUDIO - Аудио настройки

#### `audio.ambient` - Ambient музыка (заставка)
```javascript
masterVolume: 0.52     // Общая громкость
bassVolume: 0.08       // Низкие дроны
midVolume: 0.03        // Средние тона
highVolume: 0.015      // Высокие тона
fadeInTime: 0.5        // Время появления звука
```

#### `audio.sfx` - Звуковые эффекты
```javascript
landVolume: 0.343      // Громкость приземления
stepVolume: 0.176      // Громкость шагов
landFreqStart: 250     // Частота звука приземления
stepFreqStart: 180     // Частота звука шагов
```

### 🎮 GAMEPLAY - Игровая механика

```javascript
moveSpeed: 450         // Скорость движения (px/s)
jumpForce: 800         // Сила прыжка (px/s)
gravity: 2200          // Гравитация (px/s²)
runAnimSpeed: 0.04     // Скорость анимации бега
heroScale: 3           // Размер героя
```

### 🎨 COLORS - Цвета

#### `colors.level1` - Цвета уровня 1
```javascript
background: [255, 218, 185]   // Персиковый фон
platform: [62, 39, 35]        // Коричневые платформы
```

#### `colors.menu` - Цвета меню
```javascript
background: [25, 25, 25]      // Темный фон
titleBase: [255, 140, 0]      // Оранжевый заголовок
```

#### `colors.hero` - Цвета героя
```javascript
skin: [255, 204, 170]         // Цвет кожи
outline: [0, 0, 0]            // Черный контур
```

### ⌨️ CONTROLS - Управление

```javascript
moveLeft: ['left', 'a']       // Клавиши для движения влево
jump: ['up', 'w', 'space']    // Клавиши для прыжка
toggleDebug: ['f1']           // Включить debug
backToMenu: ['escape']        // Вернуться в меню
```

### 👁️ VISUAL - Визуальные параметры

```javascript
windowWidth: 1280             // Ширина окна
windowHeight: 920             // Высота окна
platformHeight: 150           // Высота платформ
instructionsFontSize: 14      // Размер шрифта инструкций
```

### 🎯 LEVELS - Конфигурация уровней

```javascript
level1: {
  name: "Level 1",
  startPosX: 'center',        // Стартовая позиция
  startPosY: 300,
  platforms: {...}            // Настройки платформ
}
```

### 🐛 DEBUG - Отладка

```javascript
startInDebugMode: false       // Начинать в debug режиме
showFPS: false                // Показывать FPS
showCollisionBoxes: false     // Показывать коллизии
```

## Использование

### Импорт конфига

```javascript
import { CONFIG, getColor, getRGB, isAnyKeyDown } from './config.js'
```

### Примеры использования

#### 1. Простые значения
```javascript
// Было:
const MOVE_SPEED = 450
const JUMP_FORCE = 800

// Стало:
const MOVE_SPEED = CONFIG.gameplay.moveSpeed
const JUMP_FORCE = CONFIG.gameplay.jumpForce
```

#### 2. Цвета
```javascript
// Было:
k.color(255, 218, 185)

// Стало:
getColor(k, CONFIG.colors.level1.background)
```

#### 3. Клавиши
```javascript
// Было:
k.onKeyDown("left", () => {...})
k.onKeyDown("a", () => {...})

// Стало:
CONFIG.controls.moveLeft.forEach(key => {
  k.onKeyDown(key, () => {...})
})

// Или с helper функцией:
k.onUpdate(() => {
  if (isAnyKeyDown(k, CONFIG.controls.moveLeft)) {
    player.move(-CONFIG.gameplay.moveSpeed, 0)
  }
})
```

#### 4. Аудио
```javascript
// Было:
gainNode.gain.setValueAtTime(0.343, now)

// Стало:
gainNode.gain.setValueAtTime(CONFIG.audio.sfx.landVolume, now)
```

## Вспомогательные функции

### `getColor(k, colorArray)`
Преобразует массив RGB в объект цвета Kaplay.
```javascript
getColor(k, CONFIG.colors.level1.background)
// → k.color(255, 218, 185)
```

### `getRGB(k, colorArray)`
Преобразует массив RGB в объект RGB Kaplay.
```javascript
getRGB(k, CONFIG.colors.menu.background)
// → k.rgb(25, 25, 25)
```

### `isAnyKeyDown(k, keys)`
Проверяет нажата ли хотя бы одна клавиша из массива.
```javascript
if (isAnyKeyDown(k, CONFIG.controls.jump)) {
  player.jump()
}
```

### `isAnyKeyPressed(k, keys)`
То же что `isAnyKeyDown`, но для событий press (одно нажатие).
```javascript
if (isAnyKeyPressed(k, CONFIG.controls.startGame)) {
  k.go("level1")
}
```

## Преимущества централизованного конфига

✅ **Единая точка настройки** - все параметры в одном файле
✅ **Легко настраивать** - не нужно искать по коду
✅ **Легко балансировать** - быстро менять параметры геймплея
✅ **Легко тестировать** - быстро переключать между наборами настроек
✅ **Легко документировать** - все параметры описаны
✅ **Легко расширять** - добавление новых параметров в одном месте

## Миграция существующего кода

### Шаг 1: Импортируйте конфиг
```javascript
import { CONFIG, getColor } from '../config.js'
```

### Шаг 2: Замените hardcoded значения
Найдите в коде:
- Числовые константы → `CONFIG.gameplay.*`
- Цвета `k.color(r, g, b)` → `getColor(k, CONFIG.colors.*)`
- Строки с клавишами → `CONFIG.controls.*`
- Размеры UI → `CONFIG.visual.*`

### Шаг 3: Проверьте работу
Убедитесь что игра работает так же.

## Пример полной миграции файла

### До:
```javascript
export function level1Scene(k) {
  k.scene("level1", () => {
    const MOVE_SPEED = 450
    const JUMP_FORCE = 800
    k.setGravity(2200)
    
    k.add([
      k.rect(k.width(), k.height()),
      k.color(255, 218, 185),
      k.pos(0, 0),
    ])
    
    k.onKeyDown("left", () => {
      player.move(-MOVE_SPEED, 0)
    })
  })
}
```

### После:
```javascript
import { CONFIG, getColor, isAnyKeyDown } from '../config.js'

export function level1Scene(k) {
  k.scene("level1", () => {
    const MOVE_SPEED = CONFIG.gameplay.moveSpeed
    const JUMP_FORCE = CONFIG.gameplay.jumpForce
    k.setGravity(CONFIG.gameplay.gravity)
    
    k.add([
      k.rect(k.width(), k.height()),
      getColor(k, CONFIG.colors.level1.background),
      k.pos(0, 0),
    ])
    
    k.onUpdate(() => {
      if (isAnyKeyDown(k, CONFIG.controls.moveLeft)) {
        player.move(-MOVE_SPEED, 0)
      }
    })
  })
}
```

## Советы

💡 **Не злоупотребляйте** - не все значения нужно выносить в конфиг
💡 **Группируйте логически** - похожие настройки держите вместе
💡 **Комментируйте** - объясняйте что делает каждый параметр
💡 **Используйте константы** - для значений которые меняются вместе
💡 **Версионируйте** - при больших изменениях создавайте копии конфигов

## Расширение конфига

Добавление новых параметров:

```javascript
export const CONFIG = {
  // ... существующие настройки ...
  
  // Новая категория
  particles: {
    maxCount: 100,
    lifetime: 2.0,
    color: [255, 255, 255],
  }
}
```

Использование:
```javascript
const maxParticles = CONFIG.particles.maxCount
const particleColor = getColor(k, CONFIG.particles.color)
```

