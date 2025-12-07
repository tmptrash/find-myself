import { CFG } from '../cfg.js'
import * as Hero from '../../../components/hero.js'
import { saveLastLevel } from '../../../utils/progress.js'
import * as Sound from '../../../utils/sound.js'
import * as Bugs from '../components/bugs.js'
//
// Platform dimensions (minimal margins for large play area)
//
const TOP_MARGIN = CFG.visual.gameArea.topMargin
const BOTTOM_MARGIN = CFG.visual.gameArea.bottomMargin
const LEFT_MARGIN = CFG.visual.gameArea.leftMargin
const RIGHT_MARGIN = CFG.visual.gameArea.rightMargin
//
// Calculate platform dimensions
//
const PLATFORM_WIDTH = CFG.visual.screen.width - LEFT_MARGIN - RIGHT_MARGIN
const PLATFORM_HEIGHT = CFG.visual.screen.height - TOP_MARGIN - BOTTOM_MARGIN
//
// Hero spawn positions
//
const HERO_SPAWN_X = LEFT_MARGIN + 150
const HERO_SPAWN_Y = CFG.visual.screen.height - BOTTOM_MARGIN - 50
const ANTIHERO_SPAWN_X = CFG.visual.screen.width - RIGHT_MARGIN - 150
const ANTIHERO_SPAWN_Y = HERO_SPAWN_Y

/**
 * Level 0 scene for touch section - Introduction level
 * Large game area with minimal obstacles
 * @param {Object} k - Kaplay instance
 */
export function sceneLevel0(k) {
  k.scene("level-touch.0", () => {
    //
    // Save progress
    //
    saveLastLevel('level-touch.0')
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
        color: k.rgb(42, 42, 42)  // CFG.visual.colors.background
      })
    })
    //
    // Create bottom platform (full width, extends to bottom of screen)
    //
    const bottomPlatformY = CFG.visual.screen.height - BOTTOM_MARGIN / 2
    
    k.add([
      k.rect(CFG.visual.screen.width, BOTTOM_MARGIN),
      k.pos(CFG.visual.screen.width / 2, bottomPlatformY),
      k.anchor("center"),
      k.area(),
      k.body({ isStatic: true }),
      k.color(31, 31, 31),  // CFG.visual.colors.platform
      k.z(CFG.visual.zIndex.platforms),
      CFG.game.platformName
    ])
    //
    // Create left wall (full height)
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
    // Create right wall (full height)
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
    // Create top wall (full width)
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
    // Create single long platform on the left
    // Height allows hero to run under it and jump onto it
    //
    const floorY = CFG.visual.screen.height - BOTTOM_MARGIN
    const heroHeight = 80  // Approximate hero height
    const platformHeight = 40  // Platform thickness
    const clearanceHeight = 100  // Lower height from floor (was 120)
    //
    // Platform: Left side, extending right
    //
    const platformX = LEFT_MARGIN + 500  // Moved right (was 400) - more space on left
    const platformY = floorY - clearanceHeight
    const platformWidth = 800  // Long platform extending right
    
    k.add([
      k.rect(platformWidth, platformHeight),
      k.pos(platformX, platformY),
      k.anchor("center"),
      k.area(),
      k.body({ isStatic: true }),
      k.color(31, 31, 31),
      k.z(CFG.visual.zIndex.platforms),
      CFG.game.platformName
    ])
    //
    // Create hero
    //
    const heroInst = Hero.create({
      k,
      x: HERO_SPAWN_X,
      y: HERO_SPAWN_Y,
      type: Hero.HEROES.HERO,
      controllable: true,
      sfx: sound,
      currentLevel: 'level-touch.0'
    })
    //
    // Spawn hero after delay
    //
    const HERO_SPAWN_DELAY = 0.5
    k.wait(HERO_SPAWN_DELAY, () => Hero.spawn(heroInst))
    //
    // Create anti-hero
    //
    const antiHeroInst = Hero.create({
      k,
      x: ANTIHERO_SPAWN_X,
      y: ANTIHERO_SPAWN_Y,
      type: Hero.HEROES.ANTIHERO,
      controllable: false,
      sfx: sound,
      antiHero: null,
      addArms: true
    })
    //
    // Spawn anti-hero after delay
    //
    k.wait(HERO_SPAWN_DELAY, () => Hero.spawn(antiHeroInst))
    //
    // Link heroes for annihilation
    //
    heroInst.antiHero = antiHeroInst
    //
    // Create bugs on the floor
    // 15 small bugs crawling on bottom platform
    //
    const bugFloorY = CFG.visual.screen.height - BOTTOM_MARGIN - 10
    const bugs = []
    
    for (let i = 0; i < 15; i++) {
      //
      // Distribute bugs across the floor
      //
      const spacing = (CFG.visual.screen.width - LEFT_MARGIN - RIGHT_MARGIN - 200) / 14
      const bugX = LEFT_MARGIN + 100 + i * spacing
      
      bugs.push(Bugs.create({
        k,
        x: bugX,
        y: bugFloorY,
        hero: heroInst,
        surface: 'floor',
        scale: 1,  // Normal size
        bounds: {
          minX: LEFT_MARGIN + 20,
          maxX: CFG.visual.screen.width - RIGHT_MARGIN - 20,
          minY: bugFloorY,
          maxY: bugFloorY
        }
      }))
    }
    //
    // Update bugs
    //
    k.onUpdate(() => {
      bugs.forEach(bug => Bugs.onUpdate(bug, k.dt()))
    })
    //
    // Draw bugs
    //
    k.onDraw(() => {
      bugs.forEach(bug => Bugs.draw(bug))
    })
    //
    // Return to menu on ESC
    //
    k.onKeyPress("escape", () => {
      Sound.stopAmbient(sound)
      k.go("menu")
    })
  })
}

