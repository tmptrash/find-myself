# Рефакторинг в функциональный стиль

## Принципы

1. **Модули с состоянием** имеют функцию `create()`, которая создает инстанс
2. **Все функции модуля** принимают инстанс первым параметром
3. **Экспортируемые функции** используют `export`, приватные - нет
4. **Модули без состояния** (только статические функции) не требуют `create()`

## Структура модулей

### Ambient Music (`src/audio/ambient.js`)

**Создание инстанса:**
```javascript
import * as Ambient from "../audio/ambient.js"

const music = Ambient.create()
```

**Публичные функции:**
- `create()` - создание инстанса
- `start(instance)` - запуск музыки
- `stop(instance)` - остановка музыки
- `setVolume(instance, volume)` - установка громкости
- `getStatus(instance)` - получение статуса
- `isActuallyPlaying(instance)` - проверка воспроизведения

**Приватные функции:**
- `init(instance)` - инициализация аудио контекста
- `createDrone(instance, frequency, volume)` - создание дрона
- `createOscillatingDrone(instance, ...)` - создание модулированного дрона
- `createNoise(instance)` - создание белого шума
- `scheduleRandomBlips(instance)` - планирование случайных звуков
- `playBlip(instance)` - воспроизведение звука

**Пример использования:**
```javascript
const music = Ambient.create()
await Ambient.start(music)
Ambient.setVolume(music, 0.4)
Ambient.stop(music)
```

### Hero Components (`src/components/hero.js`)

**Статические функции** - не требуют создания инстанса:
- `createHeroSprite(k)` - базовый спрайт героя
- `createAntiHeroSprite(k)` - базовый спрайт антигероя
- `createHeroWithEyes(k, x, y)` - герой с глазами
- `createAntiHeroWithEyes(k, x, y)` - антигерой с глазами
- `createHeroIdleSprite()` - idle анимация
- `createHeroJumpSprite()` - jump анимация
- `createHeroRunSprite(frame)` - run анимация

**Пример использования:**
```javascript
import { createHeroSprite, createHeroWithEyes } from "./components/hero.js"

const sprite = createHeroSprite(k)
const spriteWithEyes = createHeroWithEyes(k, 0, 0)
```

## Преимущества функционального стиля

1. **Явное управление состоянием** - нет скрытого this
2. **Легкое тестирование** - каждая функция независима
3. **Множественные инстансы** - просто вызываем create() снова
4. **Иммутабельность** - можно легко добавить позже
5. **Композиция** - функции легко комбинируются
6. **Tree-shaking** - неиспользуемые функции не попадут в бандл

## Миграция с классов на функции

### Было (класс):
```javascript
export class AmbientMusic {
  constructor() {
    this.isPlaying = false
  }
  
  start() {
    this.isPlaying = true
  }
}

const music = new AmbientMusic()
music.start()
```

### Стало (функции):
```javascript
export function create() {
  return { isPlaying: false }
}

export function start(instance) {
  instance.isPlaying = true
}

const music = create()
start(music)
```

