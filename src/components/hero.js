import { CFG } from '../cfg.js'
import { getHex, isAnyKeyDown, getColor } from '../utils/helper.js'
import * as Sound from '../utils/sound.js'

// Collision box parameters
const COLLISION_WIDTH = 14
const COLLISION_HEIGHT = 25
const COLLISION_OFFSET_X = 0
const COLLISION_OFFSET_Y = 0

// Hero parameters
const HERO_SCALE = 3
const RUN_ANIM_SPEED = 0.04
const RUN_FRAME_COUNT = 6
const EYE_ANIM_MIN_DELAY = 1.5
const EYE_ANIM_MAX_DELAY = 3.5
const EYE_LERP_SPEED = 0.1
const ANTIHERO_TAG = 'annihilation'

export const HEROES = {
  HERO: 'hero',
  ANTIHERO: 'antihero'
}
/**
 * Creates hero or anti-hero with full logic setup
 * @param {Object} config - Hero configuration
 * @param {Object} config.k - Kaplay instance
 * @param {number} config.x - X position
 * @param {number} config.y - Y position
 * @param {string} [config.type='hero'] - Character type ('hero' or 'antihero')
 * @param {boolean} [config.controllable=true] - Whether controlled by keyboard
 * @param {Object} [config.sfx] - AudioContext for sound effects
 * @param {Object} [config.antiHero] - Anti-hero instance for annihilation setup
 * @param {Function} [config.onAnnihilation] - Callback when annihilation completes
 * @returns {Object} Hero instance with character, k, type, controllable, sfx, and animation state
 */
export function create(config) {
  const {
    k,
    x,
    y,
    type = HEROES.HERO,
    controllable = type === HEROES.HERO,
    sfx = null,
    antiHero = null,
    onAnnihilation = null
  } = config
  
  const character = k.add([
    k.sprite(`${type.toLowerCase()}_0_0`),
    k.pos(x, y),
    k.area({
      shape: new k.Rect(
        k.vec2(COLLISION_OFFSET_X, COLLISION_OFFSET_Y), 
        COLLISION_WIDTH, 
        COLLISION_HEIGHT
      )
    }),
    k.body(),
    k.anchor("center"),
    k.scale(HERO_SCALE),
    k.z(CFG.visual.zIndex.player),
  ])
  type === HEROES.ANTIHERO && character.use(ANTIHERO_TAG)
  
  const inst = {
    character,
    k,
    type,
    controllable,
    sfx,
    antiHero,
    onAnnihilation,
    speed: CFG.gameplay.moveSpeed,
    jumpForce: CFG.gameplay.jumpForce,
    direction: 1, // 1 = right, -1 = left
    canJump: true,
    runFrame: 0,
    runTimer: 0,
    isRunning: false,
    wasJumping: false,
    eyeOffsetX: 0,
    eyeOffsetY: 0,
    targetEyeX: 0,
    targetEyeY: 0,
    eyeTimer: 0,
    currentEyeSprite: null,
    isAnnihilating: false
  }
  
  // Check ground touch through collisions
  character.onCollide("platform", () => onCollisionPlatform(inst))
  character.onUpdate(() => onUpdate(inst))
  controllable && setupControls(inst)
  antiHero && character.onCollide(ANTIHERO_TAG, () => onAnnihilationCollide(inst))
  
  return inst
}
/**
 * Loads all sprites for hero and anti-hero
 * Should be called once on game initialization
 * @param {Object} k - Kaplay instance
 */
export function loadHeroSprites(k) {    
  Object.values(HEROES).forEach(type => {
    const prefix = type
    
    // Load all eye variants (9 positions) for idle animation
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        const spriteName = `${prefix}_${x}_${y}`
        const spriteData = createFrame(type, 'idle', 0, x, y)
        k.loadSprite(spriteName, spriteData)
      }
    }
    
    // Load jump animation
    k.loadSprite(`${prefix}-jump`, createFrame(type, 'jump', 0))
    
    // Load run frames (6 frames)
    for (let frame = 0; frame < RUN_FRAME_COUNT; frame++) {
      k.loadSprite(`${prefix}-run-${frame}`, createFrame(type, 'run', frame))
    }
  })
}
/**
 * Spawn hero with assembly effect from particles
 * @param {Object} inst - Hero instance
 */
export function spawn(inst) {
  const { k, character, type, sfx } = inst
  const x = character.pos.x
  const y = character.pos.y
  
  // Hide character initially
  character.hidden = true
  
  // Determine particle color based on type
  const colors = CFG.colors
  const particleColor = type === HEROES.HERO ? colors.hero.body : colors.antiHero.body
  
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
      k.z(CFG.visual.zIndex.player),
      "assemblyParticle"
    ])
    
    particle.targetX = x
    particle.targetY = y
    particle.speed = k.rand(200, 400)
    
    particles.push(particle)
  }
  
  // Play sweep sound at the start of assembly effect
  sfx && Sound.playSpawnSweep(sfx)
  
  // Animate particles to center
  let particlesGathered = false
  
  const updateHandler = k.onUpdate(() => {
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
      
      if (allGathered) {
        particlesGathered = true
        
        // Remove particles
        particles.forEach(p => {
          if (p.exists()) k.destroy(p)
        })
        
        // Show hero
        character.hidden = false
        
        // Play click sound after assembly completes
        if (sfx) {
          Sound.playSpawnClick(sfx)
        }
        
        // Cancel update
        updateHandler.cancel()
      }
    }
  })
}

/**
 * Update character animation and state
 * @param {Object} inst - Hero instance
 */
function onUpdate(inst) {
  // Determine movement state (only for controllable characters)
  const isMoving = inst.controllable && (
    isAnyKeyDown(inst.k, CFG.controls.moveLeft) || 
    isAnyKeyDown(inst.k, CFG.controls.moveRight)
  )
  // Check if character is grounded (use canJump flag set by collision)
  const isGrounded = inst.canJump
  
  if (!isGrounded) {
    // Jumping - only set sprite once when starting jump
    if (!inst.wasJumping) {
      inst.character.use(inst.k.sprite(`${inst.type}-jump`))
      inst.runFrame = 0
      inst.runTimer = 0
      inst.isRunning = false
      inst.wasJumping = true
    }
  } else if (isMoving) {
    // Running - switch frames smoothly (time-based animation)
    // If just landed, immediately start running animation
    if (inst.wasJumping) {
      inst.wasJumping = false
      inst.runFrame = 0
      inst.runTimer = 0
      inst.character.use(inst.k.sprite(`${inst.type}-run-0`))
    }
    
    inst.isRunning = true
    inst.runTimer += inst.k.dt()
    if (inst.runTimer > RUN_ANIM_SPEED) {
      inst.runFrame = (inst.runFrame + 1) % RUN_FRAME_COUNT
      inst.character.use(inst.k.sprite(`${inst.type}-run-${inst.runFrame}`))
      inst.runTimer = 0
      
      // Step sound on frames 0 and 3 (when foot touches ground)
      if (inst.sfx && (inst.runFrame === 0 || inst.runFrame === RUN_FRAME_COUNT / 2)) {
        Sound.playStepSound(inst.sfx)
      }
    }
  } else {
    // Idle - with eye animation

    // If just stopped running or just landed, instantly switch to idle
    if (inst.isRunning || inst.wasJumping) {
      inst.isRunning = false
      inst.wasJumping = false
      inst.runFrame = 0
      inst.runTimer = 0
      // Instantly switch to current idle sprite
      const roundedX = Math.round(inst.eyeOffsetX)
      const roundedY = Math.round(inst.eyeOffsetY)
      const spriteName = `${inst.type}_${roundedX}_${roundedY}`
      inst.character.use(inst.k.sprite(spriteName))
      inst.currentEyeSprite = spriteName
    }
    
    // Eye animation - smooth movement
    inst.eyeTimer += inst.k.dt()
    
    // Choose new target position
    if (inst.eyeTimer > inst.k.rand(EYE_ANIM_MIN_DELAY, EYE_ANIM_MAX_DELAY)) {
      inst.targetEyeX = inst.k.choose([-1, 0, 1])
      inst.targetEyeY = inst.k.choose([-1, 0, 1])
      inst.eyeTimer = 0
    }
    
    // Smoothly interpolate to target position
    inst.eyeOffsetX = inst.k.lerp(inst.eyeOffsetX, inst.targetEyeX, EYE_LERP_SPEED)
    inst.eyeOffsetY = inst.k.lerp(inst.eyeOffsetY, inst.targetEyeY, EYE_LERP_SPEED)
    
    // Round for pixel-art style
    const roundedX = Math.round(inst.eyeOffsetX)
    const roundedY = Math.round(inst.eyeOffsetY)
    
    // Switch to preloaded sprite with eyes
    const spriteName = `${inst.type}_${roundedX}_${roundedY}`
    
    // Update sprite only if eye position changed
    if (inst.currentEyeSprite !== spriteName) {
      inst.character.use(inst.k.sprite(spriteName))
      inst.currentEyeSprite = spriteName
    }
  }
  
  // Mirror based on direction
  inst.character.flipX = inst.direction === -1
}

/**
 * Setup keyboard controls for character
 * @param {Object} inst - Hero instance
 */
function setupControls(inst) {
  // Move left control
  CFG.controls.moveLeft.forEach(key => {
    inst.k.onKeyDown(key, () => {
      inst.character.move(-inst.speed, 0)
      inst.direction = -1
    })
  })
  
  // Move right control
  CFG.controls.moveRight.forEach(key => {
    inst.k.onKeyDown(key, () => {
      inst.character.move(inst.speed, 0)
      inst.direction = 1
    })
  })
  
  // Jump
  CFG.controls.jump.forEach(key => {
    inst.k.onKeyPress(key, () => {
      if (inst.canJump) {
        inst.character.vel.y = -inst.jumpForce
        inst.canJump = false
      }
    })
  })
}

/**
 * Handle collision with platform
 * @param {Object} inst - Hero instance
 */
function onCollisionPlatform(inst) {
  // Set canJump flag when touching platform
  const wasInAir = !inst.canJump
  inst.canJump = true
  
  // Play landing sound if was in air
  if (wasInAir && inst.wasJumping && inst.sfx) {
    Sound.playLandSound(inst.sfx)
  }
}

/**
 * Handle annihilation collision between hero and anti-hero
 * @param {Object} inst - Hero instance
 */
function onAnnihilationCollide(inst) {
  if (inst.isAnnihilating) return
  
  inst.isAnnihilating = true
  
  const { k, character: player, sfx } = inst
  const target = inst.antiHero.character
  
  // Stop control
  player.paused = true
  target.paused = true
  
  // Center between characters
  const centerX = (player.pos.x + target.pos.x) / 2
  const centerY = (player.pos.y + target.pos.y) / 2
  
  // PHASE 1: CHARACTER BLINKING (0.3 sec)
  let blinkTime = 0
  const blinkDuration = 0.3
  const blinkSpeed = 20
  
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
      
      // PHASE 2: PULL TO CENTER (0.25 sec)
      const pullDuration = 0.25
      let pullTime = 0
      const startPlayerPos = k.vec2(player.pos.x, player.pos.y)
      const startTargetPos = k.vec2(target.pos.x, target.pos.y)
      
      const pullInterval = k.onUpdate(() => {
        pullTime += k.dt()
        const progress = Math.min(pullTime / pullDuration, 1)
        const easeProgress = 1 - Math.pow(1 - progress, 3)
        
        player.pos.x = startPlayerPos.x + (centerX - startPlayerPos.x) * easeProgress
        player.pos.y = startPlayerPos.y + (centerY - startPlayerPos.y) * easeProgress
        target.pos.x = startTargetPos.x + (centerX - startTargetPos.x) * easeProgress
        target.pos.y = startTargetPos.y + (centerY - startTargetPos.y) * easeProgress
        
        if (pullTime >= pullDuration) {
          pullInterval.cancel()
          
          // PHASE 3: COLLAPSE AND EFFECTS
          Sound.playAnnihilationSound(sfx)
          
          // Screen flash
          const screenFlash = k.add([
            k.rect(k.width(), k.height()),
            k.pos(0, 0),
            k.color(255, 255, 255),
            k.opacity(1),
            k.fixed(),
            k.z(CFG.visual.zIndex.ui + 1)
          ])
          
          let flashTime = 0
          screenFlash.onUpdate(() => {
            flashTime += k.dt()
            screenFlash.opacity = Math.max(0, 1 - flashTime * 8)
            if (flashTime > 0.125) {
              k.destroy(screenFlash)
            }
          })
          
          // Camera shake
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
          
          // Particle effect
          const allColors = [
            CFG.colors.hero.body,
            CFG.colors.hero.outline,
            CFG.colors.antiHero.body,
            CFG.colors.antiHero.outline,
          ]
          
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
              k.z(CFG.visual.zIndex.player)
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
          k.wait(1.2, inst.onAnnihilation)
        }
      })
    }
  })
}

/**
 * Universal function for character creation
 * Single function for hero and anti-hero
 * @param {string} type - Character type: 'hero' or 'antihero'
 * @param {string} animation - Animation type: 'idle', 'run', 'jump'
 * @param {number} frame - Frame number (for animations)
 * @param {number} eyeOffsetX - Pupil X offset
 * @param {number} eyeOffsetY - Pupil Y offset
 * @returns {string} Base64 encoded sprite data
 */
function createFrame(type = HEROES.HERO, animation = 'idle', frame = 0, eyeOffsetX = 0, eyeOffsetY = 0) {
  // Choose color scheme based on type
  const colors = type === HEROES.HERO ? CFG.colors.hero : CFG.colors.antiHero
  
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
