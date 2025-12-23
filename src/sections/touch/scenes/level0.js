import { CFG } from '../cfg.js'
import * as Hero from '../../../components/hero.js'
import { saveLastLevel, isSectionComplete } from '../../../utils/progress.js'
import * as Sound from '../../../utils/sound.js'
import * as Bugs from '../components/bugs.js'
import * as Dust from '../components/dust.js'
import * as FpsCounter from '../../../utils/fps-counter.js'
//
// Platform dimensions (minimal margins for large play area)
//
const TOP_MARGIN = CFG.visual.gameArea.topMargin
const BOTTOM_MARGIN = CFG.visual.gameArea.bottomMargin
const LEFT_MARGIN = CFG.visual.gameArea.leftMargin
const RIGHT_MARGIN = CFG.visual.gameArea.rightMargin
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
    // Create bottom platform - split into two parts with a gap in the middle
    //
    const bottomPlatformY = CFG.visual.screen.height - BOTTOM_MARGIN / 2
    const gapWidth = 300  // Width of the pit
    const gapCenterX = CFG.visual.screen.width / 2  // Center of screen
    const leftPlatformWidth = gapCenterX - gapWidth / 2 - LEFT_MARGIN / 2
    const rightPlatformWidth = gapCenterX - gapWidth / 2 - RIGHT_MARGIN / 2
    //
    // Left part of bottom platform
    //
    k.add([
      k.rect(leftPlatformWidth * 2, BOTTOM_MARGIN),
      k.pos(LEFT_MARGIN + leftPlatformWidth, bottomPlatformY),
      k.anchor("center"),
      k.area(),
      k.body({ isStatic: true }),
      k.color(31, 31, 31),  // CFG.visual.colors.platform
      k.z(CFG.visual.zIndex.platforms),
      CFG.game.platformName
    ])
    //
    // Right part of bottom platform
    //
    k.add([
      k.rect(rightPlatformWidth * 2, BOTTOM_MARGIN),
      k.pos(CFG.visual.screen.width - RIGHT_MARGIN - rightPlatformWidth, bottomPlatformY),
      k.anchor("center"),
      k.area(),
      k.body({ isStatic: true }),
      k.color(31, 31, 31),
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
    // Create movable cube on the raised platform
    //
    const cubeSize = 60
    const cubeX = platformX - platformWidth / 4  // On left part of raised platform
    const cubeY = platformY - platformHeight / 2 - cubeSize / 2  // On top of platform
    
    k.add([
      k.rect(cubeSize, cubeSize),
      k.pos(cubeX, cubeY),
      k.anchor("center"),
      k.area(),
      k.body({ 
        isStatic: true,  // Always static - no physics oscillations
        mass: 1,
        gravityScale: 1,
        friction: 0.9,
        damping: 0.95
      }),
      k.color(31, 31, 31),
      k.z(CFG.visual.zIndex.platforms + 1),
      CFG.game.platformName,
      "movable-cube"
    ])
    //
    // Check completed sections for hero appearance
    //
    const isWordComplete = isSectionComplete('word')
    const isTimeComplete = isSectionComplete('time')
    //
    // Hero body color: yellow if time section complete, otherwise default
    //
    const heroBodyColor = isTimeComplete ? "#FF8C00" : CFG.visual.colors.hero.body
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
      currentLevel: 'level-touch.0',
      jumpForce: CFG.game.jumpForce,
      addMouth: isWordComplete,
      bodyColor: heroBodyColor
    })
    //
    // Spawn hero after delay
    //
    const HERO_SPAWN_DELAY = 0.5
    k.wait(HERO_SPAWN_DELAY, () => Hero.spawn(heroInst))
    //
    // Manual cube movement and gravity (since cube is always static)
    //
    let cubeVelocityY = 0  // Track falling velocity
    
    k.onUpdate(() => {
      const cube = k.get("movable-cube")[0]
      const hero = heroInst.character
      
      if (cube && hero) {
        const cubeLeft = cube.pos.x - cubeSize / 2
        const cubeRight = cube.pos.x + cubeSize / 2
        const cubeTop = cube.pos.y - cubeSize / 2
        const cubeBottom = cube.pos.y + cubeSize / 2
        //
        // Check if cube is on a platform (raycast down)
        //
        const checkDistance = 5  // Check 5 pixels below
        const platforms = k.get(CFG.game.platformName)
        let isOnPlatform = false
        
        for (const platform of platforms) {
          if (platform === cube) continue  // Skip self
          
          const platformTop = platform.pos.y - (platform.height || 0) / 2
          const platformBottom = platform.pos.y + (platform.height || 0) / 2
          const platformLeft = platform.pos.x - (platform.width || 0) / 2
          const platformRight = platform.pos.x + (platform.width || 0) / 2
          //
          // Check if cube bottom is touching platform top
          //
          if (cubeBottom >= platformTop - checkDistance && 
              cubeBottom <= platformTop + checkDistance &&
              cubeRight > platformLeft + 5 &&
              cubeLeft < platformRight - 5) {
            isOnPlatform = true
            cubeVelocityY = 0  // Reset velocity
            cube.pos.y = platformTop - cubeSize / 2  // Snap to platform
            break
          }
        }
        //
        // Apply gravity if not on platform
        //
        if (!isOnPlatform) {
          const gravity = CFG.game.gravity * k.dt()
          cubeVelocityY += gravity
          cube.pos.y += cubeVelocityY * k.dt()
        }
        //
        // Check if hero is at cube level (not on top)
        //
        const heroY = hero.pos.y
        const isAtCubeLevel = heroY > cubeTop && heroY < cubeBottom + 20
        //
        // Check horizontal overlap and push direction
        //
        const heroX = hero.pos.x
        const distanceFromLeft = heroX - cubeLeft
        const distanceFromRight = cubeRight - heroX
        //
        // Simple movement based on hero position
        //
        const moveSpeed = 120 * k.dt()  // Faster movement
        
        if (isAtCubeLevel) {
          //
          // Hero is close to left side and moving right
          //
          if (distanceFromLeft > -30 && distanceFromLeft < 5) {
            if (k.isKeyDown("right") || k.isKeyDown("d")) {
              cube.pos.x += moveSpeed
            }
          }
          //
          // Hero is close to right side and moving left
          //
          if (distanceFromRight > -30 && distanceFromRight < 5) {
            if (k.isKeyDown("left") || k.isKeyDown("a")) {
              cube.pos.x -= moveSpeed
            }
          }
        }
      }
    })
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
    // Create dust particles in game area only
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
    // Create bugs on the floor
    // 15 small bugs crawling on bottom platform
    //
    const bugFloorY = CFG.visual.screen.height - BOTTOM_MARGIN - 10
    const bugs = []
    
    for (let i = 0; i < 7; i++) {
      //
      // Distribute bugs across the floor
      //
      const spacing = (CFG.visual.screen.width - LEFT_MARGIN - RIGHT_MARGIN - 200) / 6
      const bugX = LEFT_MARGIN + 100 + i * spacing
      
      bugs.push(Bugs.create({
        k,
        x: bugX,
        y: bugFloorY,
        hero: heroInst,
        surface: 'floor',
        scale: 1,  // Normal size
        sfx: sound,
        bounds: {
          minX: LEFT_MARGIN + 20,
          maxX: CFG.visual.screen.width - RIGHT_MARGIN - 20,
          minY: bugFloorY,
          maxY: bugFloorY
        }
      }))
    }
    //
    // Update bugs and dust
    //
    k.onUpdate(() => {
      bugs.forEach(bug => Bugs.onUpdate(bug, k.dt()))
      Dust.onUpdate(dustInst, k.dt())
    })
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
    // Draw dust in front of hero but behind platforms
    //
    k.add([
      k.z(CFG.visual.zIndex.player + 3),  // Between hero (10) and platforms (15)
      {
        draw() {
          Dust.draw(dustInst)
        }
      }
    ])
    //
    // Draw bugs on top of everything
    //
    k.add([
      k.z(CFG.visual.zIndex.ui - 1),  // Just below UI layer
      {
        draw() {
          bugs.forEach(bug => Bugs.draw(bug))
        }
      }
    ])
    //
    // Return to menu on ESC
    //
    k.onKeyPress("escape", () => {
      Sound.stopAmbient(sound)
      k.go("menu")
    })
  })
}

