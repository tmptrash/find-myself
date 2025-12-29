import { CFG } from '../cfg.js'
import * as Hero from '../../../components/hero.js'
import { saveLastLevel } from '../../../utils/progress.js'
import * as Sound from '../../../utils/sound.js'
import * as Bugs from '../components/bugs.js'
import * as Dust from '../components/dust.js'
import * as FpsCounter from '../../../utils/fps-counter.js'
import * as LevelIndicator from '../components/level-indicator.js'
import { createLevelTransition } from '../../../utils/transition.js'
//
// Platform dimensions (minimal margins for large play area)
//
const TOP_MARGIN = CFG.visual.gameArea.topMargin
const BOTTOM_MARGIN = CFG.visual.gameArea.bottomMargin
const LEFT_MARGIN = CFG.visual.gameArea.leftMargin
const RIGHT_MARGIN = CFG.visual.gameArea.rightMargin
//
// Platform dimensions
//
const FLOOR_Y = CFG.visual.screen.height - BOTTOM_MARGIN
//
// Hero spawn positions
//
const HERO_SPAWN_X = LEFT_MARGIN + 100
const HERO_SPAWN_Y = FLOOR_Y - 50
//
// Anti-hero spawn position
//
const HERO_HEIGHT = 96  // SPRITE_SIZE (32) * HERO_SCALE (3)
const ANTIHERO_SPAWN_X = CFG.visual.screen.width - RIGHT_MARGIN - 100
const ANTIHERO_SPAWN_Y = FLOOR_Y - 50

/**
 * Level 1 scene for touch section
 * Basic platform layout with simple obstacles
 * @param {Object} k - Kaplay instance
 */
export function sceneLevel1(k) {
  k.scene("level-touch.1", () => {
    //
    // Save progress
    //
    saveLastLevel('level-touch.1')
    //
    // Set gravity
    //
    k.setGravity(CFG.game.gravity)
    //
    // Create sound instance
    //
    const sound = Sound.create()
    Sound.startAudioContext(sound)
    //
    // Draw background
    //
    k.onDraw(() => {
      k.drawRect({
        width: k.width(),
        height: k.height(),
        pos: k.vec2(0, 0),
        color: k.rgb(42, 42, 42)
      })
    })
    //
    // Create walls and boundaries
    //
    //
    // Left wall (full height)
    //
    k.add([
      k.rect(LEFT_MARGIN, CFG.visual.screen.height),
      k.pos(LEFT_MARGIN / 2, CFG.visual.screen.height / 2),
      k.anchor("center"),
      k.area(),
      k.body({ isStatic: true }),
      k.color(31, 31, 31),
      k.z(CFG.visual.zIndex.platforms),
      CFG.game.platformName
    ])
    //
    // Right wall (full height)
    //
    k.add([
      k.rect(RIGHT_MARGIN, CFG.visual.screen.height),
      k.pos(CFG.visual.screen.width - RIGHT_MARGIN / 2, CFG.visual.screen.height / 2),
      k.anchor("center"),
      k.area(),
      k.body({ isStatic: true }),
      k.color(31, 31, 31),
      k.z(CFG.visual.zIndex.platforms),
      CFG.game.platformName
    ])
    //
    // Top wall (full width)
    //
    k.add([
      k.rect(CFG.visual.screen.width, TOP_MARGIN),
      k.pos(CFG.visual.screen.width / 2, TOP_MARGIN / 2),
      k.anchor("center"),
      k.area(),
      k.body({ isStatic: true }),
      k.color(31, 31, 31),
      k.z(CFG.visual.zIndex.platforms),
      CFG.game.platformName
    ])
    //
    // Create level indicator (TOUCH letters)
    //
    LevelIndicator.create({
      k,
      levelNumber: 1,
      activeColor: '#8B5A50',
      inactiveColor: '#808080',
      completedColor: '#8B5A50',
      topPlatformHeight: TOP_MARGIN,
      sideWallWidth: LEFT_MARGIN
    })
    //
    // Bottom platform (full width)
    //
    k.add([
      k.rect(CFG.visual.screen.width, BOTTOM_MARGIN),
      k.pos(CFG.visual.screen.width / 2, CFG.visual.screen.height - BOTTOM_MARGIN / 2),
      k.anchor("center"),
      k.area(),
      k.body({ isStatic: true }),
      k.color(31, 31, 31),
      k.z(CFG.visual.zIndex.platforms),
      CFG.game.platformName
    ])
    //
    // Create middle platforms for platforming challenge
    //
    const platformColor = k.rgb(31, 31, 31)
    const playableWidth = CFG.visual.screen.width - LEFT_MARGIN - RIGHT_MARGIN
    const playableHeight = CFG.visual.screen.height - TOP_MARGIN - BOTTOM_MARGIN
    //
    // Platform 1: Low left platform
    //
    k.add([
      k.rect(180, 20),
      k.pos(LEFT_MARGIN + 200, FLOOR_Y - 120),
      k.anchor("center"),
      k.area(),
      k.body({ isStatic: true }),
      k.color(platformColor),
      k.z(CFG.visual.zIndex.platforms),
      CFG.game.platformName
    ])
    //
    // Platform 2: Middle center platform
    //
    k.add([
      k.rect(200, 20),
      k.pos(CFG.visual.screen.width / 2, FLOOR_Y - 240),
      k.anchor("center"),
      k.area(),
      k.body({ isStatic: true }),
      k.color(platformColor),
      k.z(CFG.visual.zIndex.platforms),
      CFG.game.platformName
    ])
    //
    // Platform 3: High right platform (near anti-hero)
    //
    k.add([
      k.rect(180, 20),
      k.pos(CFG.visual.screen.width - RIGHT_MARGIN - 200, FLOOR_Y - 360),
      k.anchor("center"),
      k.area(),
      k.body({ isStatic: true }),
      k.color(platformColor),
      k.z(CFG.visual.zIndex.platforms),
      CFG.game.platformName
    ])
    //
    // Create anti-hero first
    //
    const antiHeroInst = Hero.create({
      k,
      x: ANTIHERO_SPAWN_X,
      y: ANTIHERO_SPAWN_Y,
      type: Hero.HEROES.ANTIHERO,
      controllable: false
    })
    //
    // Create hero with anti-hero reference
    //
    const heroInst = Hero.create({
      k,
      x: HERO_SPAWN_X,
      y: HERO_SPAWN_Y,
      type: Hero.HEROES.HERO,
      controllable: true,
      sfx: sound,
      antiHero: antiHeroInst,
      onAnnihilation: () => {
        //
        // Go back to menu after annihilation
        //
        createLevelTransition(k, 'level-touch.1', () => {
          k.go('menu')
        })
      },
      currentLevel: 'level-touch.1'
    })
    //
    // Spawn hero and anti-hero
    //
    Hero.spawn(heroInst)
    Hero.spawn(antiHeroInst)
    //
    // Create bugs (obstacles)
    //
    //
    // Bug 1: Patrol on floor (left area)
    //
    Bugs.create({
      k,
      x: LEFT_MARGIN + 350,
      y: FLOOR_Y - 40,
      patrolStart: LEFT_MARGIN + 250,
      patrolEnd: LEFT_MARGIN + 450,
      speed: 80
    })
    //
    // Bug 2: Patrol on first platform
    //
    Bugs.create({
      k,
      x: LEFT_MARGIN + 200,
      y: FLOOR_Y - 160,
      patrolStart: LEFT_MARGIN + 120,
      patrolEnd: LEFT_MARGIN + 280,
      speed: 60
    })
    //
    // Bug 3: Patrol on middle platform
    //
    Bugs.create({
      k,
      x: CFG.visual.screen.width / 2,
      y: FLOOR_Y - 280,
      patrolStart: CFG.visual.screen.width / 2 - 80,
      patrolEnd: CFG.visual.screen.width / 2 + 80,
      speed: 70
    })
    //
    // Create dust particles
    //
    const dustInst = Dust.create({ 
      k,
      bounds: {
        left: LEFT_MARGIN,
        right: CFG.visual.screen.width - RIGHT_MARGIN,
        top: TOP_MARGIN,
        bottom: CFG.visual.screen.height - BOTTOM_MARGIN
      }
    })
    //
    // Update and draw dust
    //
    k.onUpdate(() => {
      const dt = k.dt()
      Dust.onUpdate(dustInst, dt)
    })
    //
    // Add custom drawing for dust particles
    //
    k.add([
      {
        draw() {
          Dust.draw(dustInst)
        }
      }
    ])
    //
    // Create FPS counter
    //
    const fpsCounter = FpsCounter.create({ k })
    //
    // Update FPS counter
    //
    k.onUpdate(() => {
      FpsCounter.onUpdate(fpsCounter)
    })
    //
    // Create level transition for next level
    //
    const transition = createLevelTransition(k)
    //
    // ESC key to return to menu
    //
    k.onKeyPress("escape", () => {
      k.go("menu")
    })
  })
}

