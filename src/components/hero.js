import { CFG } from '../cfg.js'
import { getHex, isAnyKeyDown, getColor } from '../utils/helper.js'
import * as Sound from '../utils/sound.js'
import { createLevelTransition } from '../utils/transition.js'

// Collision box parameters
const COLLISION_WIDTH = 10
const COLLISION_HEIGHT = 25
const COLLISION_OFFSET_X = 0
const COLLISION_OFFSET_Y = 0

// Hero parameters
const HERO_SPRITE_SIZE = 32  // Hero sprite canvas size in pixels
const HERO_HEIGHT_RATIO = 12  // Hero height = screen height / this ratio
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
 * @param {string} [config.currentLevel] - Current level name for transition
 * @param {Function} [config.onAnnihilation] - Callback when annihilation completes (deprecated, use currentLevel)
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
    scale = getHeroScale(config.k),
    antiHero = null,
    currentLevel = null,
    onAnnihilation = null
  } = config
  
  const spriteName = `${type.toLowerCase()}_0_0`
  
  const character = k.add([
    k.sprite(spriteName),
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
    k.scale(scale),
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
    currentLevel,
    onAnnihilation,
    speed: CFG.gameplay.moveSpeedRatio * k.height(),      // Scale with screen height
    jumpForce: CFG.gameplay.jumpForceRatio * k.height(),  // Scale with screen height
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
    isAnnihilating: false,
    isDying: false,
    isSpawned: false  // Flag to prevent controls before spawn completes
  }
  
  // Check ground touch through collisions
  character.onCollide(CFG.levels.platformName, () => onCollisionPlatform(inst))
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
 * Death effect with particle explosion
 * @param {Object} inst - Hero instance
 * @param {Function} onComplete - Callback when death animation completes
 */
export function death(inst, onComplete) {
  // Prevent multiple death triggers
  if (inst.isDying) return
  
  inst.isDying = true
  
  const { k, character, type, sfx } = inst
  const centerX = character.pos.x
  const centerY = character.pos.y
  
  // Stop control
  character.paused = true
  inst.controllable = false
  
  // Play death sound
  sfx && Sound.playDeathSound(sfx)
  
  // Determine particle color based on type
  const colors = CFG.colors
  const particleColors = type === HEROES.HERO 
    ? [colors.hero.body, colors.hero.outline]
    : [colors.antiHero.body, colors.antiHero.outline]
  
  // Create particle explosion
  const particleCount = 16
  for (let i = 0; i < particleCount; i++) {
    const angle = (Math.PI * 2 * i) / particleCount + k.rand(-0.4, 0.4)
    const speed = k.rand(150, 350)
    const size = k.rand(4, 8)
    const color = k.choose(particleColors)
    
    const particle = k.add([
      k.rect(size, size),
      k.pos(centerX, centerY),
      getColor(k, color),
      k.anchor("center"),
      k.rotate(k.rand(0, 360)),
      k.z(CFG.visual.zIndex.player)
    ])
    
    particle.vx = Math.cos(angle) * speed
    particle.vy = Math.sin(angle) * speed
    particle.lifetime = 0
    particle.rotSpeed = k.rand(-540, 540)
    
    particle.onUpdate(() => {
      particle.lifetime += k.dt()
      particle.pos.x += particle.vx * k.dt()
      particle.pos.y += particle.vy * k.dt()
      particle.angle += particle.rotSpeed * k.dt()
      
      // Fade out
      particle.opacity = Math.max(0, 1 - particle.lifetime * 2)
      
      if (particle.lifetime > 0.5) {
        k.destroy(particle)
      }
    })
  }
  
  // Hide character immediately
  if (character.exists()) {
    k.destroy(character)
  }
  
  // Call callback after particles finish
  k.wait(0.6, () => onComplete?.())
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
        
        // Mark hero as spawned (allow controls)
        inst.isSpawned = true
        
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
  //
  // Skip updates during annihilation (but allow paused for post-absorption idle)
  //
  if (inst.isAnnihilating) {
    return
  }
  
  //
  // For non-controllable characters (like in menu), always use idle animation
  //
  if (!inst.controllable) {
    updateIdleAnimation(inst)
    inst.character.flipX = inst.direction === -1
    return
  }
  
  // Determine movement state (only for controllable characters)
  const isMoving = isAnyKeyDown(inst.k, CFG.controls.moveLeft) || 
    isAnyKeyDown(inst.k, CFG.controls.moveRight)
  
  // Check if character is grounded (use isGrounded method or check if falling/jumping)
  const isGrounded = inst.character.isGrounded()
  
  if (!isGrounded) {
    // Jumping - only set sprite once when starting jump
    if (!inst.wasJumping) {
      inst.character.use(inst.k.sprite(`${inst.type}-jump`))
      inst.runFrame = 0
      inst.runTimer = 0
      inst.isRunning = false
      inst.wasJumping = true
    }
    // Update direction while in air
    inst.character.flipX = inst.direction === -1
    // While in air, don't process any other animations
    return
  } else if (isMoving) {
    // Running - switch frames smoothly (time-based animation)
    // Only reset animation if starting from idle (not from jump)
    if (!inst.isRunning && !inst.wasJumping) {
      inst.runFrame = 0
      inst.runTimer = 0
      inst.character.use(inst.k.sprite(`${inst.type}-run-0`))
    } else if (inst.wasJumping) {
      // Just landed - continue with current frame, just update sprite
      inst.wasJumping = false
      inst.character.use(inst.k.sprite(`${inst.type}-run-${inst.runFrame}`))
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
    updateIdleAnimation(inst)
  }
  
  // Mirror based on direction
  inst.character.flipX = inst.direction === -1
}

/**
 * Update idle animation with eye movement
 * @param {Object} inst - Hero instance
 */
function updateIdleAnimation(inst) {
  // If just stopped running or just landed, instantly switch to idle
  if (inst.isRunning || inst.wasJumping) {
    inst.isRunning = false
    inst.wasJumping = false
    inst.runFrame = 0
    inst.runTimer = 0
    // Instantly switch to current idle sprite
    const roundedX = Math.round(inst.eyeOffsetX)
    const roundedY = Math.round(inst.eyeOffsetY)
    const spriteName = getSpriteName(inst, roundedX, roundedY)
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
  const spriteName = getSpriteName(inst, roundedX, roundedY)
  
  // Update sprite only if eye position changed
  if (inst.currentEyeSprite !== spriteName) {
    inst.character.use(inst.k.sprite(spriteName))
    inst.currentEyeSprite = spriteName
  }
}

/**
 * Setup keyboard controls for character
 * @param {Object} inst - Hero instance
 */
function setupControls(inst) {
  // Move left control
  CFG.controls.moveLeft.forEach(key => {
    inst.k.onKeyDown(key, () => {
      if (!inst.isSpawned) return  // Prevent movement before spawn
      inst.character.move(-inst.speed, 0)
      inst.direction = -1
    })
  })
  
  // Move right control
  CFG.controls.moveRight.forEach(key => {
    inst.k.onKeyDown(key, () => {
      if (!inst.isSpawned) return  // Prevent movement before spawn
      inst.character.move(inst.speed, 0)
      inst.direction = 1
    })
  })
  
  // Jump
  CFG.controls.jump.forEach(key => {
    inst.k.onKeyPress(key, () => {
      if (!inst.isSpawned) return  // Prevent jump before spawn
      if (inst.canJump) {
        inst.character.vel.y = -inst.jumpForce
        inst.canJump = false
        
        // Play jump sound
        inst.sfx && Sound.playJumpSound(inst.sfx)
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
 * Both characters dissolve into particles and merge
 * @param {Object} inst - Hero instance
 */
function onAnnihilationCollide(inst) {
  if (inst.isAnnihilating) return
  
  inst.isAnnihilating = true
  
  const { k, character: player, sfx } = inst
  const target = inst.antiHero.character
  
  //
  // Pause anti-hero only
  //
  target.paused = true
  
  const playerPos = k.vec2(player.pos.x, player.pos.y)
  const targetPos = k.vec2(target.pos.x, target.pos.y)
  
  //
  // INSTANT EXPLOSION: Anti-hero explodes immediately with sound and particles
  //
  
  //
  // Play explosion sound (short pop/snap sound)
  //
  sfx && Sound.playGlitchSound(sfx)
  
  //
  // STEP 2: Immediately hide anti-hero (exploded)
  //
  k.destroy(target)
  
  //
  // STEP 3: Force hero to idle state immediately after explosion
  //
  inst.isRunning = false
  inst.runFrame = 0
  inst.runTimer = 0
  inst.wasJumping = false  // Reset jump flag
  
  //
  // Force idle sprite (not jump!) using current eye position (rounded)
  //
  const eyeX = Math.round(inst.eyeOffsetX)
  const eyeY = Math.round(inst.eyeOffsetY)
  player.use(k.sprite(getSpriteName(inst, eyeX, eyeY)))
  
  //
  // Stop horizontal movement but keep vertical (gravity)
  //
  if (player.vel) {
    player.vel.x = 0
  }
  
  //
  // Create explosion particles immediately (all at once)
  //
  const particles = []
  const particleCount = 80  // Create many particles at once
  
  for (let i = 0; i < particleCount; i++) {
    //
    // Randomly choose body or outline color
    //
    const useBodyColor = k.rand(0, 1) > 0.5
    const particleColor = useBodyColor ? CFG.colors.antiHero.body : CFG.colors.antiHero.outline
    
    const particle = k.add([
      k.rect(k.rand(2, 7), k.rand(2, 7)),
      k.pos(targetPos.x + k.rand(-20, 20), targetPos.y + k.rand(-20, 20)),
      getColor(k, particleColor),
      k.anchor("center"),
      k.z(CFG.visual.zIndex.player + 1)
    ])
    
    //
    // Random direction for explosion (scatter in all directions)
    //
    const angle = k.rand(0, Math.PI * 2)
    const speed = k.rand(250, 500)  // High speed explosion
    
    particle.vx = Math.cos(angle) * speed
    particle.vy = Math.sin(angle) * speed
    particle.lifetime = 0
    particle.phase = 'scatter'
    //
    // Target will be set AFTER scatter phase
    //
    particle.targetX = null
    particle.targetY = null
    
    particles.push(particle)
  }
  
  //
  // PHASE 1: Particles scatter outward (0.4 sec)
  //
  const scatterDuration = 0.4
  let scatterTime = 0
  
  const scatterInterval = k.onUpdate(() => {
    scatterTime += k.dt()
    const progress = Math.min(scatterTime / scatterDuration, 1)
    
    //
    // Animate particles - scatter outward
    //
    particles.forEach(p => {
      if (!p.exists()) return
      
      p.lifetime += k.dt()
      
      //
      // Move outward (all particles are in scatter phase)
      //
      p.pos.x += p.vx * k.dt()
      p.pos.y += p.vy * k.dt()
      
      //
      // Slow down
      //
      p.vx *= 0.96
      p.vy *= 0.96
    })
    
    if (progress >= 1) {
      scatterInterval.cancel()
      
      //
      // STEP 5: Small pause before absorption (0.2 sec)
      //
      k.wait(0.2, () => {
        //
        // PHASE 2: Particles absorbed into hero with screen shake
        //
        let absorbTime = 0
        const maxAbsorbDuration = 2.0
        let heroFlickerTimer = 0
        const heroFlickerInterval = 0.08
        
        //
        // STEP 6: Screen shake starts immediately with absorption
        //
        const originalCamPos = k.camPos()
        const shakeIntensity = 8
        
        //
        // Update all particle targets to hero's current position AFTER scatter
        //
        particles.forEach(p => {
          if (p.exists()) {
            //
            // Set target to center of hero (all particles converge to one point)
            //
            p.targetX = player.pos.x
            p.targetY = player.pos.y
            
            //
            // Reset velocity slightly toward hero to ensure movement starts
            //
            const dx = p.targetX - p.pos.x
            const dy = p.targetY - p.pos.y
            const dist = Math.sqrt(dx * dx + dy * dy)
            
            if (dist > 0) {
              //
              // Give initial push toward hero
              //
              const initialSpeed = 100
              p.vx = (dx / dist) * initialSpeed
              p.vy = (dy / dist) * initialSpeed
            }
          }
        })
        
        const absorbInterval = k.onUpdate(() => {
          absorbTime += k.dt()
          heroFlickerTimer += k.dt()
          
          //
          // Hero flickers during absorption
          //
          if (heroFlickerTimer >= heroFlickerInterval) {
            player.opacity = player.opacity === 1 ? 0.3 : 1
            heroFlickerTimer = 0
          }
          
          //
          // STEP 6: Screen shake starts after particles begin flying (delay 0.15 sec)
          //
          if (absorbTime > 0.15) {
            const shakeX = k.rand(-shakeIntensity, shakeIntensity)
            const shakeY = k.rand(-shakeIntensity, shakeIntensity)
            k.camPos(originalCamPos.x + shakeX, originalCamPos.y + shakeY)
          }
          
          //
          // Count remaining particles
          //
          let activeParticles = 0
          
          //
          // Animate particles - accelerate toward hero
          //
          particles.forEach(p => {
            if (!p.exists()) return
            
            activeParticles++
            
            const dx = p.targetX - p.pos.x
            const dy = p.targetY - p.pos.y
            const dist = Math.sqrt(dx * dx + dy * dy)
            
            //
            // Particle reached target - destroy it (small threshold for center convergence)
            //
            if (dist <= 8) {
              k.destroy(p)
              return
            }
            
            //
            // Strong acceleration with progressive time boost
            // Higher initial acceleration for faster absorption
            //
            const timeBoost = 1 + (absorbTime / maxAbsorbDuration) * 5  // Up to 6x boost
            const baseAcceleration = 1200 / Math.max(dist, 3)  // Higher base, lower min distance
            const acceleration = baseAcceleration * timeBoost
            
            //
            // Apply acceleration toward target
            //
            p.vx += (dx / dist) * acceleration * k.dt() * 60
            p.vy += (dy / dist) * acceleration * k.dt() * 60
            
            //
            // Move particle
            //
            p.pos.x += p.vx * k.dt()
            p.pos.y += p.vy * k.dt()
            
            //
            // Check if overshot target
            //
            const newDist = Math.sqrt(
              Math.pow(p.targetX - p.pos.x, 2) + 
              Math.pow(p.targetY - p.pos.y, 2)
            )
            
            if (newDist > dist) {
              //
              // Overshot - destroy particle
              //
              k.destroy(p)
              return
            }
            
            p.opacity = 1.0
          })
          
          //
          // All particles absorbed
          //
          if (activeParticles === 0 || absorbTime >= maxAbsorbDuration) {
            absorbInterval.cancel()
            
            //
            // Clean up
            //
            particles.forEach(p => p.exists() && k.destroy(p))
            
            //
            // Stop hero flickering
            //
            player.opacity = 1
            
            //
            // Restore camera
            //
            k.camPos(originalCamPos)
            
            //
            // STEP 7: Pause after absorption and shake, then fade and show text
            //
            k.wait(0.6, () => {
              if (inst.currentLevel) {
                createLevelTransition(k, inst.currentLevel)
              } else if (inst.onAnnihilation) {
                inst.onAnnihilation()
              }
            })
          }
        })
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
  //
  // Choose color scheme based on type
  //
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
/**
 * Calculate hero scale based on screen height
 * Hero should occupy 1/HERO_HEIGHT_RATIO of screen height
 * @param {Object} k - Kaplay instance
 * @returns {number} Scale factor for hero
 */
function getHeroScale(k) {
  return Math.round(k.height() / HERO_HEIGHT_RATIO / HERO_SPRITE_SIZE)
}

/**
 * Get sprite name for character (supports custom colors)
 * @param {Object} inst - Hero instance
 * @param {number} eyeX - Eye X offset (-1, 0, 1)
 * @param {number} eyeY - Eye Y offset (-1, 0, 1)
 * @returns {string} Sprite name
 */
function getSpriteName(inst, eyeX = 0, eyeY = 0) {
  return `${inst.type}_${eyeX}_${eyeY}`
}