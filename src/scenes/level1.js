import { CONFIG } from '../config.js'
import { getColor } from '../utils/helpers.js'
import * as Sound from '../utils/sound.js'
import { addBackground, addInstructions, setupBackToMenu } from '../components/scene.js'
import * as Hero from '../components/hero.js'

export function level1Scene(k) {
  k.scene("level1", () => {
    // ========================================
    // TIME-BASED SYSTEM: FPS independent
    // ========================================
    
    k.setGravity(CONFIG.gameplay.gravity)
    
    // Create sound instance
    const sound = Sound.create()
    
    // Background - use common module
    addBackground(k, CONFIG.colors.level1.background)
    
    // Create platforms
    function addPlatform(x, y, width, height) {
      return k.add([
        k.rect(width, height),
        k.pos(x, y),
        k.area(),
        k.body({ isStatic: true }),
        getColor(k, CONFIG.colors.level1.platform),
        "platform"
      ])
    }
    
    const platformHeight = CONFIG.visual.platformHeight
    const wallWidth = CONFIG.visual.wallWidth
    
    // Bottom platform (wide)
    addPlatform(0, k.height() - platformHeight, k.width(), platformHeight)
    
    // Top platform (wide, same height)
    addPlatform(0, 0, k.width(), platformHeight)
    
    // Left wall (corridor)
    addPlatform(0, platformHeight, wallWidth, k.height() - platformHeight * 2)
    
    // Right wall (corridor)
    addPlatform(k.width() - wallWidth, platformHeight, wallWidth, k.height() - platformHeight * 2)
    
    // ============================================
    // HERO spawns with assembly effect
    // ============================================
    // Get coordinates from config
    const heroStartX = CONFIG.levels.level1.heroSpawn.x
    const heroStartY = CONFIG.levels.level1.heroSpawn.onPlatform
      ? k.height() - platformHeight - (CONFIG.gameplay.collisionHeight / 2) * CONFIG.gameplay.heroScale
      : CONFIG.levels.level1.heroSpawn.y
    
    let player = null
    Hero.spawnWithAssembly(k, {
      x: heroStartX,
      y: heroStartY,
      type: 'hero',
      controllable: true,
      sfx: sound,
      onComplete: (character) => {
        player = character
        
        // Set up annihilation effect after hero creation
        Hero.setupAnnihilation(k, player, antiHero, sound, () => {
          k.go("level2")
        })
      }
    })
    
    // ============================================
    // ANTI-HERO in bottom-right corner
    // ============================================
    // Calculate Y coordinate so anti-hero stands ON the platform
    const antiHeroY = k.height() - platformHeight - (CONFIG.gameplay.collisionHeight / 2) * CONFIG.gameplay.heroScale
    
    const antiHero = Hero.create(k, {
      x: k.width() - 100,
      y: antiHeroY,
      type: 'antihero',
      controllable: false,
      sfx: sound
    })
    
    // Add collision tag to anti-hero
    antiHero.use("annihilationTarget")
    
    // Instructions (use common module)
    const instructions = addInstructions(k)
    
    // Debug info (top-right corner)
    const debugText = k.add([
      k.text("", { size: CONFIG.visual.debugFontSize }),
      k.pos(k.width() + CONFIG.visual.debugX, CONFIG.visual.debugY),
      getColor(k, CONFIG.colors.level1.debug),
      k.z(CONFIG.visual.zIndex.ui),
      k.fixed()
    ])
    
    // Initialize debug mode from config
    let debugMode = CONFIG.debug.startInDebugMode
    
    // Toggle debug mode (use config)
    CONFIG.controls.toggleDebug.forEach(key => {
      k.onKeyPress(key, () => {
        debugMode = !debugMode
      })
    })
    
    // Collision box visualization disabled
    
    // Camera and debug - update together
    k.onUpdate(() => {
      // Camera fixed in screen center (doesn't follow player)
      k.camPos(k.width() / 2, k.height() / 2)
      
      // Update debug text (only if debug mode enabled and hero created)
      if (debugMode && player) {
        debugText.text = `Pos: ${Math.round(player.pos.x)}, ${Math.round(player.pos.y)}\nVel: ${Math.round(player.vel?.x || 0)}, ${Math.round(player.vel?.y || 0)}\nCan Jump: ${player.canJump}`
      } else {
        debugText.text = ""
      }
    })
    
    // Return to menu (use common module)
    setupBackToMenu(k)
  })
}
