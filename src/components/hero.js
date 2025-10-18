import { CONFIG } from '../config.js'
import { getHex, isAnyKeyDown, getColor } from '../utils/helpers.js'
import * as Sound from '../utils/sound.js'

// ============================================
// UNIVERSAL FUNCTION FOR CHARACTER CREATION
// ============================================
// Single function for hero and anti-hero
// type: 'hero' or 'antihero'
// animation: 'idle', 'run', 'jump'
// frame: frame number (for animations)
// eyeOffsetX, eyeOffsetY: pupil offset

function createCharacterFrame(type = 'hero', animation = 'idle', frame = 0, eyeOffsetX = 0, eyeOffsetY = 0) {
  // Choose color scheme based on type
  const colors = type === 'hero' ? CONFIG.colors.hero : CONFIG.colors.antiHero
  
  const size = 32
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  
  ctx.clearRect(0, 0, size, size)
  
  // Base parameters for different animations
  let headY = 6
  let bodyY = 14
  let headX = 12
  let bodyX = 10
  let leftArmY = 15
  let rightArmY = 15
  let leftLegY = 22
  let rightLegY = 22
  let leftArmX = 9
  let rightArmX = 21
  let leftLegX = 12
  let rightLegX = 17
  
  // Run animation (6 frames)
  if (animation === 'run') {
    if (frame === 0) {
      leftLegY = 20
      rightLegY = 22
      leftLegX = 10
      rightLegX = 18
    } else if (frame === 1) {
      leftLegY = 18
      rightLegY = 22
      leftLegX = 12
      rightLegX = 17
    } else if (frame === 2) {
      leftLegY = 20
      rightLegY = 20
      leftLegX = 14
      rightLegX = 14
    } else if (frame === 3) {
      leftLegY = 22
      rightLegY = 20
      leftLegX = 18
      rightLegX = 10
    } else if (frame === 4) {
      leftLegY = 22
      rightLegY = 18
      leftLegX = 17
      rightLegX = 12
    } else if (frame === 5) {
      leftLegY = 20
      rightLegY = 20
      leftLegX = 14
      rightLegX = 14
    }
  }
  
  // Jump animation - side view, legs bent and spread
  if (animation === 'jump') {
    headY = 6
    bodyY = 14
    headX = 12
    bodyX = 10
    leftArmY = 15
    rightArmY = 15
    // Right leg in front - bent more (higher)
    rightLegY = 20
    rightLegX = 18
    // Left leg behind - bent less (lower)
    leftLegY = 22
    leftLegX = 10
    leftArmX = 9
    rightArmX = 21
  }
  
  // Black outline (universal)
  ctx.fillStyle = getHex(colors.outline)
  ctx.fillRect(headX - 1, headY - 1, 10, 10)
  
  // Body outline (same for all animations)
  ctx.fillRect(bodyX - 1, bodyY - 1, 14, 10)
  
  // Arm outlines - don't draw while running and jumping
  if (animation !== 'run' && animation !== 'jump') {
    ctx.fillRect(leftArmX - 1, leftArmY - 1, 4, 9)
    ctx.fillRect(rightArmX - 1, rightArmY - 1, 4, 9)
  }
  
  // Leg outlines (same for all animations)
  ctx.fillRect(leftLegX - 1, leftLegY - 1, 5, 8)
  ctx.fillRect(rightLegX - 1, rightLegY - 1, 5, 8)
  
  // Head (universal body color)
  ctx.fillStyle = getHex(colors.body)
  ctx.fillRect(headX, headY, 8, 8)
  
  // Eyes - for run and jump draw only ONE eye (side view)
  ctx.fillStyle = getHex(colors.eyeWhite)
  if (animation === 'run' || animation === 'jump') {
    ctx.fillRect(headX + 6, headY + 2, 3, 3)
  } else {
    ctx.fillRect(headX + 1, headY + 2, 3, 3)
    ctx.fillRect(headX + 6, headY + 2, 3, 3)
  }
  
  // Pupils (universal color)
  ctx.fillStyle = getHex(colors.outline)
  if (animation === 'run' || animation === 'jump') {
    ctx.fillRect(headX + 7, headY + 3, 1, 1)
  } else {
    ctx.fillRect(headX + 2 + eyeOffsetX, headY + 3 + eyeOffsetY, 1, 1)
    ctx.fillRect(headX + 7 + eyeOffsetX, headY + 3 + eyeOffsetY, 1, 1)
  }
  
  // Body (universal color)
  ctx.fillStyle = getHex(colors.body)
  ctx.fillRect(bodyX, bodyY, 12, 8)
  
  // Arms - don't draw while running and jumping
  if (animation !== 'run' && animation !== 'jump') {
    ctx.fillRect(leftArmX, leftArmY, 2, 7)
    ctx.fillRect(rightArmX, rightArmY, 2, 7)
  }
  
  // Legs (same for all animations)
  ctx.fillRect(leftLegX, leftLegY, 3, 6)
  ctx.fillRect(rightLegX, rightLegY, 3, 6)
  
  return canvas.toDataURL()
}

// ============================================
// LOAD ALL SPRITES
// ============================================

/**
 * Loads all sprites for hero and anti-hero
 * Should be called once on game initialization
 * @param {Object} k - Kaplay instance
 */
export function loadAllSprites(k) {
  // Load sprites for both characters
  const types = ['hero', 'antihero']
  
  types.forEach(type => {
    const prefix = type
    
    // Load all eye variants (9 positions) for idle animation
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        const spriteName = `${prefix}_${x}_${y}`
        const spriteData = createCharacterFrame(type, 'idle', 0, x, y)
        k.loadSprite(spriteName, spriteData)
      }
    }
    
    // Load jump animation
    k.loadSprite(`${prefix}-jump`, createCharacterFrame(type, 'jump', 0))
    
    // Load run frames (6 frames)
    for (let frame = 0; frame < CONFIG.gameplay.runFrameCount; frame++) {
      k.loadSprite(`${prefix}-run-${frame}`, createCharacterFrame(type, 'run', frame))
    }
  })
}

// ============================================
// CREATE GAME OBJECT FOR HERO
// ============================================

/**
 * Creates hero or anti-hero with full logic setup
 * @param {Object} k - Kaplay instance
 * @param {Object} config - Hero configuration
 * @param {number} config.x - X position
 * @param {number} config.y - Y position
 * @param {string} [config.type='hero'] - Character type ('hero' or 'antihero')
 * @param {boolean} [config.controllable=true] - Whether controlled by keyboard
 * @param {Object} [config.sfx] - AudioContext for sound effects
 * @returns {Object} Created hero object
 */
export function create(k, config) {
  const {
    x,
    y,
    type = 'hero',
    controllable = true,
    sfx = null
  } = config
  
  const MOVE_SPEED = CONFIG.gameplay.moveSpeed
  const JUMP_FORCE = CONFIG.gameplay.jumpForce
  const RUN_ANIM_SPEED = CONFIG.gameplay.runAnimSpeed
  
  // Determine sprite name based on type
  const spritePrefix = type === 'hero' ? 'hero' : 'antihero'
  
  // Create hero object
  const character = k.add([
    k.sprite(`${spritePrefix}_0_0`),
    k.pos(x, y),
    k.area({
      shape: new k.Rect(
        k.vec2(CONFIG.gameplay.collisionOffsetX, CONFIG.gameplay.collisionOffsetY), 
        CONFIG.gameplay.collisionWidth, 
        CONFIG.gameplay.collisionHeight
      ),
      collisionIgnore: []
    }),
    k.body(),
    k.anchor("center"),
    k.scale(CONFIG.gameplay.heroScale),
    k.z(CONFIG.visual.zIndex.player),
  ])
  
  // Add custom properties
  character.speed = MOVE_SPEED
  character.myJumpForce = JUMP_FORCE
  character.runFrame = 0
  character.runTimer = 0
  character.direction = 1 // 1 = right, -1 = left
  character.canJump = true
  character.isRunning = false
  character.wasJumping = false
  character.type = type
  
  // Variables for eye animation
  character.eyeOffsetX = 0
  character.eyeOffsetY = 0
  character.targetEyeX = 0
  character.targetEyeY = 0
  character.eyeTimer = 0
  character.currentEyeSprite = null
  
  // ============================================
  // COLLISION HANDLERS
  // ============================================
  
  // Check ground touch through collisions
  character.onCollide("platform", () => {
    character.canJump = true
    // If was jumping, instantly switch to idle
    if (character.wasJumping && sfx) {
      character.wasJumping = false
      Sound.playLandSound(sfx) // Landing sound
      const roundedX = Math.round(character.eyeOffsetX)
      const roundedY = Math.round(character.eyeOffsetY)
      const spriteName = `${spritePrefix}_${roundedX}_${roundedY}`
      character.use(k.sprite(spriteName))
      character.currentEyeSprite = spriteName
    }
  })
  
  // ============================================
  // CONTROLS (if character is controllable)
  // ============================================
  
  if (controllable) {
    // Move left control
    CONFIG.controls.moveLeft.forEach(key => {
      k.onKeyDown(key, () => {
        character.move(-character.speed, 0)
        character.direction = -1
      })
    })
    
    // Move right control
    CONFIG.controls.moveRight.forEach(key => {
      k.onKeyDown(key, () => {
        character.move(character.speed, 0)
        character.direction = 1
      })
    })
    
    // Jump
    CONFIG.controls.jump.forEach(key => {
      k.onKeyPress(key, () => {
        if (character.canJump) {
          character.vel.y = -character.myJumpForce
          character.canJump = false
        }
      })
    })
  }
  
  // ============================================
  // ANIMATION UPDATE
  // ============================================
  
  character.onUpdate(() => {
    // Determine movement state (only for controllable characters)
    const isMoving = controllable && (
      isAnyKeyDown(k, CONFIG.controls.moveLeft) || 
      isAnyKeyDown(k, CONFIG.controls.moveRight)
    )
    
    // Check if character is grounded
    const isGrounded = character.canJump && Math.abs(character.vel.y) < 10
    
    if (!isGrounded) {
      // Jumping
      character.use(k.sprite(`${spritePrefix}-jump`))
      character.runFrame = 0
      character.runTimer = 0
      character.isRunning = false
      character.wasJumping = true
    } else if (isMoving) {
      // Running - switch frames smoothly (time-based animation)
      character.isRunning = true
      character.runTimer += k.dt()
      if (character.runTimer > RUN_ANIM_SPEED) {
        character.runFrame = (character.runFrame + 1) % CONFIG.gameplay.runFrameCount
        character.use(k.sprite(`${spritePrefix}-run-${character.runFrame}`))
        character.runTimer = 0
        
        // Step sound on frames 0 and 3 (when foot touches ground)
        if (sfx && (character.runFrame === 0 || character.runFrame === 3)) {
          Sound.playStepSound(sfx)
        }
      }
    } else {
      // Idle - with eye animation
      
      // If just stopped running, instantly switch to idle
      if (character.isRunning) {
        character.isRunning = false
        character.runFrame = 0
        character.runTimer = 0
        // Instantly switch to current idle sprite
        const roundedX = Math.round(character.eyeOffsetX)
        const roundedY = Math.round(character.eyeOffsetY)
        const spriteName = `${spritePrefix}_${roundedX}_${roundedY}`
        character.use(k.sprite(spriteName))
        character.currentEyeSprite = spriteName
      }
      
      // Eye animation - smooth movement
      character.eyeTimer += k.dt()
      
      // Choose new target position
      if (character.eyeTimer > k.rand(CONFIG.gameplay.eyeAnimMinDelay, CONFIG.gameplay.eyeAnimMaxDelay)) {
        character.targetEyeX = k.choose([-1, 0, 1])
        character.targetEyeY = k.choose([-1, 0, 1])
        character.eyeTimer = 0
      }
      
      // Smoothly interpolate to target position
      character.eyeOffsetX = k.lerp(character.eyeOffsetX, character.targetEyeX, CONFIG.gameplay.eyeLerpSpeed)
      character.eyeOffsetY = k.lerp(character.eyeOffsetY, character.targetEyeY, CONFIG.gameplay.eyeLerpSpeed)
      
      // Round for pixel-art style
      const roundedX = Math.round(character.eyeOffsetX)
      const roundedY = Math.round(character.eyeOffsetY)
      
      // Switch to preloaded sprite with eyes
      const spriteName = `${spritePrefix}_${roundedX}_${roundedY}`
      
      // Update sprite only if eye position changed
      if (character.currentEyeSprite !== spriteName) {
        character.use(k.sprite(spriteName))
        character.currentEyeSprite = spriteName
      }
    }
    
    // Mirror based on direction
    character.flipX = character.direction === -1
    
    // Constrain character within screen bounds (only for controllable)
    if (controllable) {
      const leftBound = CONFIG.visual.playerBounds.leftOffset
      const rightBound = k.width() - CONFIG.visual.playerBounds.rightOffset
      const topBound = CONFIG.visual.playerBounds.topOffset
      const bottomBound = k.height() - CONFIG.visual.playerBounds.bottomOffset
      
      // Constrain X
      if (character.pos.x < leftBound) {
        character.pos.x = leftBound
      }
      if (character.pos.x > rightBound) {
        character.pos.x = rightBound
      }
      
      // Constrain Y
      if (character.pos.y < topBound) {
        character.pos.y = topBound
      }
      if (character.pos.y > bottomBound) {
        character.pos.y = bottomBound
      }
    }
  })
  
  return character
}

// ============================================
// HERO ASSEMBLY EFFECT FROM PARTICLES
// ============================================

/**
 * Creates hero assembly effect from particles
 * @param {Object} k - Kaplay instance
 * @param {Object} config - Configuration
 * @param {number} config.x - X position for spawn
 * @param {number} config.y - Y position for spawn
 * @param {string} [config.type='hero'] - Character type ('hero' or 'antihero')
 * @param {boolean} [config.controllable=true] - Whether controlled by keyboard
 * @param {Object} [config.sfx] - AudioContext for sound effects
 * @param {Function} [config.onComplete] - Callback with created hero after completion
 * @returns {Object} Object with cancel() method to abort effect
 */
export function spawnWithAssembly(k, config) {
  const {
    x,
    y,
    type = 'hero',
    controllable = true,
    sfx = null,
    onComplete = null
  } = config
  
  // Determine particle color based on type
  const particleColor = type === 'hero' ? CONFIG.colors.hero.body : CONFIG.colors.antiHero.body
  
  // Create particles for assembly effect
  const particles = []
  const particleCount = 20
  
  for (let i = 0; i < particleCount; i++) {
    const particle = k.add([
      k.rect(6, 6),
      k.pos(
        x + k.rand(-100, 100),
        y + k.rand(-100, 100)
      ),
      getColor(k, particleColor),
      k.anchor("center"),
      k.z(CONFIG.visual.zIndex.player),
      "assemblyParticle"
    ])
    
    particle.targetX = x
    particle.targetY = y
    particle.speed = k.rand(200, 400)
    
    particles.push(particle)
  }
  
  // Animate particles to center
  let particlesGathered = false
  let character = null
  let cancelled = false
  
  const updateHandler = k.onUpdate(() => {
    if (cancelled) {
      // If effect cancelled, remove all particles
      particles.forEach(p => {
        if (p.exists()) k.destroy(p)
      })
      updateHandler.cancel()
      return
    }
    
    if (!particlesGathered) {
      let allGathered = true
      
      particles.forEach(particle => {
        if (!particle.exists()) return
        
        const dx = particle.targetX - particle.pos.x
        const dy = particle.targetY - particle.pos.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        
        if (dist > 5) {
          allGathered = false
          const moveSpeed = particle.speed * k.dt()
          particle.pos.x += (dx / dist) * moveSpeed
          particle.pos.y += (dy / dist) * moveSpeed
        }
      })
      
      if (allGathered && !character) {
        particlesGathered = true
        
        // Remove particles
        particles.forEach(p => {
          if (p.exists()) k.destroy(p)
        })
        
        // Hero spawn sound
        if (sfx) {
          Sound.playSpawnSound(sfx)
        }
        
        // Create hero
        character = create(k, {
          x,
          y,
          type,
          controllable,
          sfx
        })
        
        // Call callback
        if (onComplete) {
          onComplete(character)
        }
        
        // Cancel update
        updateHandler.cancel()
      }
    }
  })
  
  // Return object with cancel method
  return {
    cancel: () => {
      cancelled = true
    },
    getCharacter: () => character
  }
}

// ============================================
// ANNIHILATION EFFECT
// ============================================

/**
 * Sets up annihilation effect between two characters
 * @param {Object} k - Kaplay instance
 * @param {Object} player - First character (usually hero)
 * @param {Object} target - Second character (usually anti-hero)
 * @param {Object} sfx - AudioContext for sound effects
 * @param {Function} onComplete - Callback after annihilation completion
 */
export function setupAnnihilation(k, player, target, sfx, onComplete) {
  let isAnnihilating = false
  
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
              
              // ANNIHILATION SOUND (deep powerful)
              const now = sfx.currentTime
              
              // Deep bass
              const bass = sfx.createOscillator()
              const bassGain = sfx.createGain()
              bass.type = 'sine'
              bass.frequency.setValueAtTime(50, now)
              bass.frequency.exponentialRampToValueAtTime(20, now + 0.5)
              bassGain.gain.setValueAtTime(0.7, now)
              bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5)
              bass.connect(bassGain)
              bassGain.connect(sfx.destination)
              bass.start(now)
              bass.stop(now + 0.5)
              
              // Very low "hum"
              const subBass = sfx.createOscillator()
              const subBassGain = sfx.createGain()
              subBass.type = 'sine'
              subBass.frequency.setValueAtTime(30, now)
              subBassGain.gain.setValueAtTime(0.6, now)
              subBassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6)
              subBass.connect(subBassGain)
              subBassGain.connect(sfx.destination)
              subBass.start(now)
              subBass.stop(now + 0.6)
              
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
                if (onComplete) {
                  onComplete()
                }
              })
            }
          })
        }
      })
    }
  })
}
