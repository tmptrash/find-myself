import kaplay from "kaplay"
import { menuScene } from "./scenes/menu.js"
import { gameScene } from "./scenes/game.js"
import { 
  createHeroSprite, 
  createAntiHeroSprite, 
  createHeroWithEyes, 
  createAntiHeroWithEyes,
  createHeroIdleSprite,
  createHeroWalkSprite,
  createHeroJumpSprite,
  createHeroRunSprite
} from "./components/hero.js"

// Глобальный AudioContext для всех звуков
window.gameAudioContext = new (window.AudioContext || window.webkitAudioContext)()

// Пытаемся запустить контекст сразу
window.gameAudioContext.resume().catch(() => {
  // Если не получилось, попробуем при первом взаимодействии
})

// Возобновляем контекст при любом взаимодействии (на всякий случай)
const resumeAudio = () => {
  if (window.gameAudioContext.state === 'suspended') {
    window.gameAudioContext.resume()
  }
}

document.addEventListener('click', resumeAudio, { once: false })
document.addEventListener('keydown', resumeAudio, { once: false })
document.addEventListener('touchstart', resumeAudio, { once: false })
document.addEventListener('touchend', resumeAudio, { once: false })

// Пытаемся возобновить при загрузке страницы
window.addEventListener('load', () => {
  window.gameAudioContext.resume()
})

// Инициализация игры
const k = kaplay({
  width: 1280,
  height: 920,
  scale: 1,
  background: [0, 0, 0],
  font: "jetbrains", // Устанавливаем шрифт по умолчанию
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

// Загружаем кадры ходьбы (2 кадра)
k.loadSprite("hero-walk-0", createHeroWalkSprite(0))
k.loadSprite("hero-walk-1", createHeroWalkSprite(1))

// Загружаем кадры бега (8 кадров для плавной анимации как на референсе)
k.loadSprite("hero-run-0", createHeroRunSprite(0))
k.loadSprite("hero-run-1", createHeroRunSprite(1))
k.loadSprite("hero-run-2", createHeroRunSprite(2))
k.loadSprite("hero-run-3", createHeroRunSprite(3))
k.loadSprite("hero-run-4", createHeroRunSprite(4))
k.loadSprite("hero-run-5", createHeroRunSprite(5))
k.loadSprite("hero-run-6", createHeroRunSprite(6))
k.loadSprite("hero-run-7", createHeroRunSprite(7))

// Загрузка ресурсов
k.loadBean()
k.loadFont("jetbrains", "/fonts/JetBrainsMono-Regular.ttf")
k.loadSprite("hero", heroSprite)
k.loadSprite("antihero", antiHeroSprite)

// Регистрация всех сцен
menuScene(k)
gameScene(k)

// Запуск игры после загрузки ресурсов
k.onLoad(() => {
  k.go("menu")
})