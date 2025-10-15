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
  createHeroJumpSprite
} from "./components/hero.js"

// Инициализация игры
const k = kaplay({
  width: 1024,
  height: 768,
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

// Анимация ходьбы (2 кадра)
k.loadSprite("hero-walk", createHeroWalkSprite(0), {
  sliceX: 1,
  anims: {
    walk: { from: 0, to: 0, speed: 10, loop: true }
  }
})

// Загружаем оба кадра ходьбы
k.loadSprite("hero-walk-0", createHeroWalkSprite(0))
k.loadSprite("hero-walk-1", createHeroWalkSprite(1))

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