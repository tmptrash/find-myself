import { CONFIG } from '../config.js'
import { getColor } from '../utils/helpers.js'
import * as SFX from '../audio/sfx.js'
import { addBackground } from '../components/background.js'
import { addInstructions, setupBackToMenu } from '../components/instructions.js'
import * as Hero from '../components/hero.js'

export function level2Scene(k) {
  k.scene("level2", () => {
    // ========================================
    // TIME-BASED SYSTEM: FPS independent
    // ========================================
    
    k.setGravity(CONFIG.gameplay.gravity)
    
    // Create sound effects instance (get AudioContext)
    const sfx = SFX.create()
    
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
    // HERO spawns on left with assembly effect
    // ============================================
    // Get coordinates from config
    const startX = CONFIG.levels.level2.heroSpawn.x
    const startY = CONFIG.levels.level2.heroSpawn.onPlatform
      ? k.height() - platformHeight - (CONFIG.gameplay.collisionHeight / 2) * CONFIG.gameplay.heroScale
      : CONFIG.levels.level2.heroSpawn.y
    
    // Use assembly function from hero.js
    let player = null
    Hero.spawnWithAssembly(k, {
      x: startX,
      y: startY,
      type: 'hero',
      controllable: true,
      sfx: sfx,
      onComplete: (character) => {
        player = character
      }
    })
    
    // Camera
    k.onUpdate(() => {
      k.camPos(k.width() / 2, k.height() / 2)
    })
    
    // Instructions (use common module)
    addInstructions(k, { showDebugHint: false })
    
    // Return to menu (use common module)
    setupBackToMenu(k)
  })
}
