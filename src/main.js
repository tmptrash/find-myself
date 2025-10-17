import kaplay from "kaplay"
import { CONFIG } from "./config.js"
import { startScene } from "./scenes/start.js"
import { menuScene } from "./scenes/menu.js"
import { level1Scene } from "./scenes/level1.js"
import { 
  createHeroSprite, 
  createAntiHeroSprite, 
  createHeroWithEyes, 
  createAntiHeroWithEyes,
  createHeroIdleSprite,
  createHeroJumpSprite,
  createHeroRunSprite
} from "./components/hero.js"

// Глобальный AudioContext для всех звуков
window.gameAudioContext = new (window.AudioContext || window.webkitAudioContext)()

// Пытаемся запустить контекст сразу
window.gameAudioContext.resume().catch(() => {
  // Если не получилось, попробуем при первом взаимодействии
})

// Пытаемся возобновить при загрузке страницы
window.addEventListener('load', () => {
  window.gameAudioContext.resume()
})

// Инициализация игры (параметры из конфига)
const k = kaplay({
  width: CONFIG.visual.windowWidth,
  height: CONFIG.visual.windowHeight,
  scale: 1,
  background: [0, 0, 0],
  font: "jetbrains",
  // TIME-BASED система: используем k.dt() для независимости от FPS
  // Kaplay автоматически обрабатывает delta time для всех движений
})

// Создаём и загружаем спрайты героев
const heroSprite = createHeroSprite(k)
const antiHeroSprite = createAntiHeroSprite(k)

// Предзагружаем все варианты глаз (9 позиций) для меню
for (let x = -1; x <= 1; x++) {
  for (let y = -1; y <= 1; y++) {
    k.loadSprite(`hero_${x}_${y}`, createHeroWithEyes(k, x, y))
    k.loadSprite(`antihero_${x}_${y}`, createAntiHeroWithEyes(k, x, y))
  }
}

// Загрузка анимаций героя для игры
k.loadSprite("hero-idle", createHeroIdleSprite())
k.loadSprite("hero-jump", createHeroJumpSprite())

// Загружаем кадры бега (6 кадров)
k.loadSprite("hero-run-0", createHeroRunSprite(0))
k.loadSprite("hero-run-1", createHeroRunSprite(1))
k.loadSprite("hero-run-2", createHeroRunSprite(2))
k.loadSprite("hero-run-3", createHeroRunSprite(3))
k.loadSprite("hero-run-4", createHeroRunSprite(4))
k.loadSprite("hero-run-5", createHeroRunSprite(5))

// Загрузка ресурсов
k.loadBean()
k.loadFont("jetbrains", "/fonts/JetBrainsMono-Regular.ttf")
k.loadSprite("hero", heroSprite)
k.loadSprite("antihero", antiHeroSprite)

// Регистрация всех сцен
startScene(k)
menuScene(k)
level1Scene(k)

// Запуск игры после загрузки ресурсов
k.onLoad(() => {
  k.go("start")
})