import kaplay from "kaplay"
import { CONFIG } from "./config.js"
import { readyScene } from "./scenes/ready.js"
import { menuScene } from "./scenes/menu.js"
import { level1Scene } from "./scenes/level1.js"
import { level2Scene } from "./scenes/level2.js"
import { loadAllSprites } from "./components/hero.js"

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

// Загружаем все спрайты персонажей (инкапсулировано в hero.js)
loadAllSprites(k)

// Загрузка ресурсов
k.loadBean()
k.loadFont("jetbrains", "/fonts/JetBrainsMono-Regular.ttf")

// Регистрация всех сцен
readyScene(k)
menuScene(k)
level1Scene(k)
level2Scene(k)

// Запуск игры после загрузки ресурсов
k.onLoad(() => {
  k.go("start")
})

