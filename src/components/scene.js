import { CONFIG } from '../config.js'
import { getColor } from '../utils/helpers.js'
import * as Sound from '../utils/sound.js'
import * as Hero from './hero.js'

// ============================================
// UNIVERSAL SCENE COMPONENTS
// ============================================

// ============================================
// BACKGROUND
// ============================================

/**
 * Adds background to the scene
 * @param {Object} k - Kaplay instance
 * @param {String} color - Background color in hex format
 * @returns {Object} Background object
 */
export function addBackground(k, color) {
  return k.add([
    k.rect(k.width(), k.height()),
    getColor(k, color),
    k.pos(0, 0),
    k.fixed(),
    k.z(CONFIG.visual.zIndex.background)
  ])
}

// ============================================
// INSTRUCTIONS
// ============================================

/**
 * Adds control instructions to the screen
 * @param {Object} k - Kaplay instance
 * @returns {Object} Created instructions object
 */
export function addInstructions(k) {
  // Base instruction text (no spaces between arrows)
  const baseText = "AWD/←↑→ - move\nSpace   - jump\nESC     - menu"
  
  return k.add([
    k.text(baseText, {
      size: CONFIG.visual.instructionsFontSize,
      width: k.width() - 40
    }),
    k.pos(CONFIG.visual.instructionsX, CONFIG.visual.instructionsY),
    getColor(k, CONFIG.colors.level1.instructions),
    k.z(CONFIG.visual.zIndex.ui),
    k.fixed()
  ])
}

// ============================================
// NAVIGATION
// ============================================

/**
 * Sets up return to menu on ESC key press
 * @param {Object} k - Kaplay instance
 */
export function setupBackToMenu(k) {
  CONFIG.controls.backToMenu.forEach(key => {
    k.onKeyPress(key, () => {
      k.go("menu")
    })
  })
}

// ============================================
// PLATFORMS
// ============================================

/**
 * Adds standard platforms to the level (top, bottom, left wall, right wall)
 * @param {Object} k - Kaplay instance
 * @param {String} color - Platform color in hex format
 * @returns {Array} Array of platform objects
 */
export function addPlatforms(k, color) {
  const platformHeight = CONFIG.visual.platformHeight
  const wallWidth = CONFIG.visual.wallWidth
  
  function createPlatform(x, y, width, height) {
    return k.add([
      k.rect(width, height),
      k.pos(x, y),
      k.area(),
      k.body({ isStatic: true }),
      getColor(k, color),
      "platform"
    ])
  }
  
  return [
    // Bottom platform
    createPlatform(0, k.height() - platformHeight, k.width(), platformHeight),
    // Top platform
    createPlatform(0, 0, k.width(), platformHeight),
    // Left wall
    createPlatform(0, platformHeight, wallWidth, k.height() - platformHeight * 2),
    // Right wall
    createPlatform(k.width() - wallWidth, platformHeight, wallWidth, k.height() - platformHeight * 2)
  ]
}

// ============================================
// CAMERA
// ============================================

/**
 * Sets up fixed camera in the center of the screen
 * @param {Object} k - Kaplay instance
 */
export function setupCamera(k) {
  k.onUpdate(() => {
    k.camPos(k.width() / 2, k.height() / 2)
  })
}

// ============================================
// LEVEL INITIALIZATION
// ============================================

/**
 * Initializes a level with common setup (gravity, sound, background, platforms, camera, instructions, controls)
 * @param {Object} k - Kaplay instance
 * @param {Object} config - Level configuration
 * @param {String} config.backgroundColor - Background color
 * @param {String} config.platformColor - Platform color
 * @returns {Object} Object with sound instance and other utilities
 */
export function initLevel(k, config) {
  const { backgroundColor, platformColor } = config
  
  // Set gravity
  k.setGravity(CONFIG.gameplay.gravity)
  
  // Create sound instance and start audio context
  const sound = Sound.create()
  Sound.startAudioContext(sound)
  
  // Add background
  addBackground(k, backgroundColor)
  
  // Add platforms
  addPlatforms(k, platformColor)
  
  // Setup camera
  setupCamera(k)
  
  // Add instructions
  addInstructions(k)
  
  // Setup back to menu
  setupBackToMenu(k)
  
  return { sound }
}

// ============================================
// CHARACTER SPAWNING
// ============================================

/**
 * Spawns hero with assembly effect at configured position
 * @param {Object} k - Kaplay instance
 * @param {String} levelName - Level name to get spawn coordinates from config
 * @param {Object} sound - Sound instance
 * @param {Object} config - Configuration
 * @param {Object} [config.antiHero] - Anti-hero instance to setup annihilation
 * @param {Function} [config.onAnnihilationComplete] - Callback when annihilation completes
 */
export function spawnHero(k, levelName, sound, config = {}) {
  const levelConfig = CONFIG.levels[levelName]
  if (!levelConfig) {
    console.error(`Level config not found for: ${levelName}`)
    return
  }
  
  // Get spawn position directly from config
  const { x, y } = levelConfig.heroSpawn
  
  Hero.spawn(k, {
    x,
    y,
    type: 'hero',
    controllable: true,
    sfx: sound,
    onComplete: (heroInst) => {
      // Setup annihilation if anti-hero is provided
      if (config.antiHero) {
        setupAnnihilation(k, heroInst, config.antiHero, sound, config.onAnnihilationComplete)
      }
    }
  })
}

/**
 * Creates anti-hero at specified position
 * @param {Object} k - Kaplay instance
 * @param {Object} sound - Sound instance
 * @param {Object} config - Anti-hero configuration
 * @param {Number} config.x - X position
 * @param {Number} config.y - Y position
 * @returns {Object} Anti-hero instance
 */
export function spawnAntiHero(k, sound, config) {
  const { x, y } = config
  
  const antiHeroInst = Hero.create(k, {
    x,
    y,
    type: 'antihero',
    controllable: false,
    sfx: sound
  })
  
  // Add collision tag to character
  antiHeroInst.character.use("annihilationTarget")
  
  return antiHeroInst
}

// ============================================
// PRIVATE FUNCTIONS
// ============================================

/**
 * Setup annihilation effect between two characters
 * @param {Object} k - Kaplay instance
 * @param {Object} playerInst - First character instance (usually hero)
 * @param {Object} targetInst - Second character instance (usually anti-hero)
 * @param {Object} sfx - AudioContext for sound effects
 * @param {Function} onComplete - Callback after annihilation completion
 */
function setupAnnihilation(k, playerInst, targetInst, sfx, onComplete) {
  let isAnnihilating = false
  
  const player = playerInst.character
  const target = targetInst.character
  
  player.onCollide("annihilationTarget", () => {
    if (!isAnnihilating) {
      isAnnihilating = true
      
      // Stop control
      player.paused = true
      target.paused = true
      
      // Center between characters
      const centerX = (player.pos.x + target.pos.x) / 2
      const centerY = (player.pos.y + target.pos.y) / 2
      
      // ============================================
      // PHASE 1: CHARACTER BLINKING (0.3 sec)
      // ============================================
      let blinkTime = 0
      const blinkDuration = 0.3
      const blinkSpeed = 20 // Fast blinking
      
      const blinkInterval = k.onUpdate(() => {
        blinkTime += k.dt()
        if (blinkTime < blinkDuration) {
          const visible = Math.floor(blinkTime * blinkSpeed) % 2 === 0
          player.opacity = visible ? 1 : 0.3
          target.opacity = visible ? 1 : 0.3
        } else {
          player.opacity = 1
          target.opacity = 1
          blinkInterval.cancel()
          
          // ============================================
          // PHASE 2: PULL TO CENTER (0.25 sec)
          // ============================================
          const pullDuration = 0.25
          let pullTime = 0
          const startPlayerPos = k.vec2(player.pos.x, player.pos.y)
          const startTargetPos = k.vec2(target.pos.x, target.pos.y)
          
          const pullInterval = k.onUpdate(() => {
            pullTime += k.dt()
            const progress = Math.min(pullTime / pullDuration, 1)
            const easeProgress = 1 - Math.pow(1 - progress, 3) // Ease-out cubic
            
            player.pos.x = startPlayerPos.x + (centerX - startPlayerPos.x) * easeProgress
            player.pos.y = startPlayerPos.y + (centerY - startPlayerPos.y) * easeProgress
            target.pos.x = startTargetPos.x + (centerX - startTargetPos.x) * easeProgress
            target.pos.y = startTargetPos.y + (centerY - startTargetPos.y) * easeProgress
            
            if (pullTime >= pullDuration) {
              pullInterval.cancel()
              
              // ============================================
              // PHASE 3: COLLAPSE AND EFFECTS
              // ============================================
              
              // Play annihilation sound
              Sound.playAnnihilationSound(sfx)
              
              // SCREEN FLASH
              const screenFlash = k.add([
                k.rect(k.width(), k.height()),
                k.pos(0, 0),
                k.color(255, 255, 255),
                k.opacity(1),
                k.fixed(),
                k.z(CONFIG.visual.zIndex.ui + 1)
              ])
              
              let flashTime = 0
              screenFlash.onUpdate(() => {
                flashTime += k.dt()
                screenFlash.opacity = Math.max(0, 1 - flashTime * 8)
                if (flashTime > 0.125) {
                  k.destroy(screenFlash)
                }
              })
              
              // CAMERA SHAKE
              let shakeTime = 0
              const shakeIntensity = 15
              const originalCamX = k.width() / 2
              const originalCamY = k.height() / 2
              
              const shakeInterval = k.onUpdate(() => {
                shakeTime += k.dt()
                if (shakeTime < 0.4) {
                  const intensity = shakeIntensity * (1 - shakeTime / 0.4)
                  k.camPos(
                    originalCamX + k.rand(-intensity, intensity),
                    originalCamY + k.rand(-intensity, intensity)
                  )
                } else {
                  k.camPos(originalCamX, originalCamY)
                  shakeInterval.cancel()
                }
              })
              
              // ============================================
              // PARTICLE EFFECT
              // ============================================
              
              const allColors = [
                CONFIG.colors.hero.body,
                CONFIG.colors.hero.outline,
                CONFIG.colors.antiHero.body,
                CONFIG.colors.antiHero.outline,
              ]
              
              // Pixel explosion - small rotating squares
              const pixelCount = 24
              for (let i = 0; i < pixelCount; i++) {
                const angle = (Math.PI * 2 * i) / pixelCount + k.rand(-0.3, 0.3)
                const speed = k.rand(100, 400)
                const size = k.rand(3, 7)
                const color = k.choose(allColors)
                
                const pixel = k.add([
                  k.rect(size, size),
                  k.pos(centerX, centerY),
                  getColor(k, color),
                  k.anchor("center"),
                  k.rotate(k.rand(0, 360)),
                  k.z(CONFIG.visual.zIndex.player)
                ])
                
                pixel.vx = Math.cos(angle) * speed
                pixel.vy = Math.sin(angle) * speed
                pixel.lifetime = 0
                pixel.rotSpeed = k.rand(-720, 720)
                
                pixel.onUpdate(() => {
                  pixel.lifetime += k.dt()
                  pixel.pos.x += pixel.vx * k.dt()
                  pixel.pos.y += pixel.vy * k.dt()
                  pixel.angle += pixel.rotSpeed * k.dt()
                  pixel.opacity = Math.max(0, 1 - pixel.lifetime * 2.5)
                  
                  if (pixel.lifetime > 0.4) {
                    k.destroy(pixel)
                  }
                })
              }
              
              // Hide characters
              k.destroy(player)
              k.destroy(target)
              
              // Call callback after completion
              k.wait(1.2, () => {
                onComplete?.()
              })
            }
          })
        }
      })
    }
  })
}

