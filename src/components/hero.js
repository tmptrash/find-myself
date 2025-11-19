import { CFG } from '../cfg.js'
import { getHex, isAnyKeyDown, getColor, parseHex } from '../utils/helper.js'
import * as Sound from '../utils/sound.js'
import { createLevelTransition, getNextLevel } from '../utils/transition.js'
import { saveLastLevel } from '../utils/progress.js'
//
// Collision box parameters
//
const COLLISION_WIDTH = 10
const COLLISION_HEIGHT = 25
const COLLISION_OFFSET_X = 0
const COLLISION_OFFSET_Y = 0
//
// Hero parameters
//
const HERO_SCALE = 3
const RUN_ANIM_SPEED = 0.03333
const RUN_FRAME_COUNT = 3
const JUMP_FRAME_COUNT = 6
const JUMP_SQUASH_TIME = 0.03
const JUMP_STRETCH_START = 0.1
const EYE_ANIM_MIN_DELAY = 1.5
const EYE_ANIM_MAX_DELAY = 3.5
const EYE_LERP_SPEED = 0.1
const ANTIHERO_TAG = 'annihilation'
//
// Landing dust particles
//
const DUST_PARTICLE_COUNT = 6
const DUST_PARTICLE_SIZE = 4
const DUST_PARTICLE_SPEED = 80
const DUST_PARTICLE_LIFETIME = 0.4

export const HEROES = {
  HERO: 'hero',
  ANTIHERO: 'antiHero'
}
/**
 * Creates hero or anti-hero with full logic setup
 * @param {Object} config - Hero configuration
 * @param {Object} config.k - Kaplay instance
 * @param {number} config.x - X position
 * @param {number} config.y - Y position
 * @param {string} [config.type='hero'] - Character type ('hero' or 'antiHero')
 * @param {boolean} [config.controllable=true] - Whether controlled by keyboard
 * @param {Object} [config.sfx] - AudioContext for sound effects
 * @param {Object} [config.antiHero] - Anti-hero instance for annihilation setup
 * @param {string} [config.currentLevel] - Current level name for transition
 * @param {Function} [config.onAnnihilation] - Callback when annihilation completes (deprecated, use currentLevel)
 * @param {string} [config.dustColor] - Dust particle color (hex string), defaults to gray
 * @param {boolean} [config.hitboxPadding=0] - Additional padding around collision box (for menu hover/click)
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
    onAnnihilation = null,
    bodyColor = null,      // Custom body color (hex string), outline is always black
    dustColor = null,      // Dust particle color (hex string)
    isStatic = false,      // If true, no physics (for indicators)
    addMouth = false,      // If true, add black horizontal mouth line (only for idle)
    addArms = false,       // If true, add simple vertical arms
    hitboxPadding = 0      // Additional padding around collision box (for menu hover/click)
  } = config
  
  const defaultBodyColor = type === HEROES.HERO ? CFG.colors.hero.body : CFG.colors.antiHero.body
  const effectiveBodyColor = bodyColor ?? defaultBodyColor
  const shouldLoadCustomSprites = Boolean(bodyColor) || addMouth || addArms

  //
  // Load custom colored sprites if color is provided or mouth/arms are required
  //
  if (shouldLoadCustomSprites) {
    try {
      loadCustomSprites(k, type, effectiveBodyColor, addMouth, addArms)
    } catch (error) {
      console.error('Failed to load custom sprites:', error)
      //
      // Fall back to standard sprites
      //
    }
  }
  
  //
  // Determine sprite name based on whether custom color, mouth and arms are used
  //
  let spritePrefix = shouldLoadCustomSprites
    ? `${type}_${effectiveBodyColor}${addMouth ? '_mouth' : ''}${addArms ? '_arms' : ''}`
    : type
  let spriteName = `${spritePrefix}_0_0`
  
  //
  // Verify sprite exists, fall back to standard if not
  //
  try {
    k.getSprite(spriteName)
  } catch (e) {
    console.warn(`Sprite ${spriteName} not found, using standard sprite`)
    spritePrefix = type
    spriteName = `${spritePrefix}_0_0`
  }
  
  const collisionOffsetX = COLLISION_OFFSET_X - hitboxPadding
  const collisionOffsetY = COLLISION_OFFSET_Y - hitboxPadding
  const collisionWidth = COLLISION_WIDTH + hitboxPadding * 2
  const collisionHeight = COLLISION_HEIGHT + hitboxPadding * 2

  const character = k.add([
    k.sprite(spriteName),
    k.pos(x, y),
    k.area({
      shape: new k.Rect(
        k.vec2(collisionOffsetX, collisionOffsetY),
        collisionWidth,
        collisionHeight
      )
    }),
    ...(isStatic ? [k.fixed()] : [k.body()]),  // Use fixed() for static, body() for physics
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
    bodyColor,        // Store custom body color
    spritePrefix,
    dustColor,
    speed: CFG.gameplay.moveSpeed,
    jumpForce: CFG.gameplay.jumpForce,
    direction: 1,
    canJump: true,
    runFrame: 0,
    runTimer: 0,
    isRunning: false,
    wasJumping: false,
    jumpFrame: 0,     // Current jump animation frame
    jumpPhase: 'none', // 'squashing', 'jumping', 'none'
    squashTimer: 0,   // Timer for pre-jump squash animation
    isSquashing: false, // Flag for pre-jump squash
    eyeOffsetX: 0,
    eyeOffsetY: 0,
    targetEyeX: 0,
    targetEyeY: 0,
    eyeTimer: 0,
    currentEyeSprite: null,
    isAnnihilating: false,
    isDying: false,
    isSpawned: false   // Flag to prevent controls before spawn completes
  }
  
  // Check ground touch through collisions
  character.onCollide(CFG.levels.platformName, () => onCollisionPlatform(inst))
  character.onUpdate(() => onUpdate(inst))
  controllable && setupControls(inst)
  antiHero && character.onCollide(ANTIHERO_TAG, () => onAnnihilationCollide(inst))
  
  return inst
}

/**
 * Loads sprites with custom colors for a specific hero type
 * @param {Object} k - Kaplay instance
 * @param {string} type - Hero type (HERO or ANTIHERO)
 * @param {string} bodyColor - Body color in hex format
 * @param {boolean} [addMouth=false] - Add mouth to idle sprites
 * @param {boolean} [addArms=false] - Add arms to sprites
 */
function loadCustomSprites(k, type, bodyColor, addMouth = false, addArms = false) {
  const prefix = `${type}_${bodyColor}${addMouth ? '_mouth' : ''}${addArms ? '_arms' : ''}`
  
  //
  // Check if sprites with this color are already loaded
  //
  const testSprite = `${prefix}_0_0`
  try {
    const sprite = k.getSprite(testSprite)
    if (sprite) {
      //
      // Sprites already loaded, no need to reload
      //
      return
    }
  } catch (e) {
    //
    // Sprite doesn't exist, proceed with loading
    //
  }
  
  //
  // Load all eye variants (9 positions) for idle animation
  //
  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      const spriteName = `${prefix}_${x}_${y}`
      const spriteData = createFrame(type, 'idle', 0, x, y, bodyColor, addMouth, addArms)
      k.loadSprite(spriteName, spriteData)
    }
  }
  
  //
  // Load jump animation frames (3 frames)
  //
  for (let frame = 0; frame < JUMP_FRAME_COUNT; frame++) {
    k.loadSprite(`${prefix}-jump-${frame}`, createFrame(type, 'jump', frame, 0, 0, bodyColor, addMouth, addArms))
  }
  
  //
  // Load run frames (3 frames)
  //
  for (let frame = 0; frame < RUN_FRAME_COUNT; frame++) {
    k.loadSprite(`${prefix}-run-${frame}`, createFrame(type, 'run', frame, 0, 0, bodyColor, addMouth, addArms))
  }
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
    
    // Load jump animation frames (3 frames: stretch up, normal, squash down)
    for (let frame = 0; frame < JUMP_FRAME_COUNT; frame++) {
      k.loadSprite(`${prefix}-jump-${frame}`, createFrame(type, 'jump', frame))
    }
    
    // Load run frames (3 frames)
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
  
  //
  // Slow down time for dramatic effect
  //
  const originalTimeScale = k.timeScale ?? 1
  const slowMotionScale = 0.1
  const slowMotionDuration = 0.5
  
  k.timeScale = slowMotionScale
  
  //
  // Restore normal time after slow motion
  //
  k.wait(slowMotionDuration, () => {
    k.timeScale = originalTimeScale
  })
  
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
  
  //
  // Create particle explosion
  //
  const particleCount = 16
  const allParticles = []
  
  for (let i = 0; i < particleCount; i++) {
    const angle = (Math.PI * 2 * i) / particleCount + k.rand(-0.4, 0.4)
    const speed = k.rand(150, 350)
    const pSize = k.rand(4, 8)
    const oSize = pSize + 4  // Thicker black outline (was +1)
    const colorHex = k.choose(particleColors)
    
    //
    // Parse hex color to RGB
    //
    const [r, g, b] = parseHex(colorHex)
    
    const rotation = k.rand(0, 360)
    //
    // Create invisible body for physics
    //
    const body = k.add([
      k.rect(pSize, pSize),
      k.pos(centerX, centerY),
      k.anchor("center"),
      k.rotate(rotation),
      k.z(CFG.visual.zIndex.player - 1),
      k.area(),
      k.body(),
      k.opacity(0)
    ])
    //
    // Create visual particle that follows the body
    //
    const particle = k.add([
      k.pos(centerX, centerY),
      k.anchor("center"),
      k.rotate(rotation),
      k.z(CFG.visual.zIndex.player),
      k.opacity(1),
      {
        draw() {
          //
          // Draw black outline first
          //
          k.drawRect({
            width: oSize,
            height: oSize,
            pos: k.vec2(0, 0),
            anchor: "center",
            color: k.rgb(0, 0, 0)
          })
          
          //
          // Draw colored particle on top
          //
          k.drawRect({
            width: pSize,
            height: pSize,
            pos: k.vec2(0, 0),
            anchor: "center",
            color: k.rgb(r, g, b)
          })
        }
      }
    ])
    
    //
    // Set initial velocity using Kaplay's body component
    //
    body.vel.x = Math.cos(angle) * speed
    body.vel.y = Math.sin(angle) * speed
    
    particle.lifetime = 0
    particle.rotSpeed = k.rand(-540, 540)
    particle.maxLifetime = 2.0  // Live longer to see them fall
    particle.isEye = false
    particle.body = body
    
    //
    // Apply air friction (slow down horizontal movement)
    //
    particle.onUpdate(() => {
      particle.lifetime += k.dt()
      
      //
      // Sync visual particle with invisible body
      //
      particle.pos = particle.body.pos
      particle.angle = particle.body.angle
      
      //
      // Apply air friction to horizontal velocity
      //
      particle.body.vel.x *= 0.98
      
      //
      // Rotate particle
      //
      particle.body.angle += particle.rotSpeed * k.dt()
      
      //
      // Fade out over lifetime
      //
      const fadeStartTime = 1.0  // Start fading after 1 second
      if (particle.lifetime > fadeStartTime) {
        const fadeProgress = (particle.lifetime - fadeStartTime) / (particle.maxLifetime - fadeStartTime)
        particle.opacity = Math.max(0, 1 - fadeProgress)
      }
      
      //
      // Destroy when max lifetime reached or falls off screen
      //
      if (particle.lifetime > particle.maxLifetime || particle.pos.y > k.height() + 100) {
        k.destroy(particle.body)
        k.destroy(particle)
      }
    })
    
    allParticles.push(particle)
  }
  
  //
  // Create two eye particles (same size as hero's real eyes)
  //
  const eyeWhiteSize = 3 * HERO_SCALE  // 3x3 pixels scaled by 3 = 9x9
  const pupilSize = 1 * HERO_SCALE     // 1x1 pixel scaled by 3 = 3x3
  const eyeAngles = [k.rand(0, Math.PI * 2), k.rand(0, Math.PI * 2)]
  
  for (let i = 0; i < 2; i++) {
    const angle = eyeAngles[i]
    const speed = k.rand(150, 350)
    
    //
    // White eye background
    //
    const eyeWhite = k.add([
      k.rect(eyeWhiteSize, eyeWhiteSize),
      k.pos(centerX, centerY),
      k.color(255, 255, 255),
      k.anchor("center"),
      k.z(CFG.visual.zIndex.player + 1),
      k.area(),
      k.body()
    ])
    
    //
    // Black pupil (no physics, just visual)
    //
    const pupil = eyeWhite.add([
      k.rect(pupilSize, pupilSize),
      k.pos(0, 0),  // Relative to parent (eyeWhite)
      k.color(0, 0, 0),
      k.anchor("center"),
      k.z(1)  // Relative z-index
    ])
    
    //
    // Set initial velocity
    //
    eyeWhite.vel.x = Math.cos(angle) * speed
    eyeWhite.vel.y = Math.sin(angle) * speed
    
    eyeWhite.lifetime = 0
    eyeWhite.maxLifetime = 2.0
    eyeWhite.isEye = true
    
    //
    // Update eye
    //
    eyeWhite.onUpdate(() => {
      eyeWhite.lifetime += k.dt()
      
      //
      // Apply air friction
      //
      eyeWhite.vel.x *= 0.98
      
      //
      // Sync pupil opacity with eye white
      //
      pupil.opacity = eyeWhite.opacity
      
      //
      // Fade out over lifetime
      //
      const fadeStartTime = 1.0
      if (eyeWhite.lifetime > fadeStartTime) {
        const fadeProgress = (eyeWhite.lifetime - fadeStartTime) / (eyeWhite.maxLifetime - fadeStartTime)
        eyeWhite.opacity = Math.max(0, 1 - fadeProgress)
      }
      
      //
      // Destroy when max lifetime reached or falls off screen
      //
      if (eyeWhite.lifetime > eyeWhite.maxLifetime || eyeWhite.pos.y > k.height() + 100) {
        k.destroy(eyeWhite)
      }
    })
    
    allParticles.push(eyeWhite)
  }
  
  // Hide character immediately
  if (character.exists()) {
    k.destroy(character)
  }
  
  //
  // Wait for particles to finish + additional pause before callback
  // 2.0s for particles to fall + 0.3s pause = 2.3s total
  //
  k.wait(2.3, () => onComplete?.())
}

/**
 * Spawn hero with assembly effect from particles
 * @param {Object} inst - Hero instance
 */
export function spawn(inst) {
  const { k, character, type, sfx, bodyColor } = inst
  const x = character.pos.x
  const y = character.pos.y
  
  // Hide character initially
  character.hidden = true
  
  // Determine particle color based on type
  // Use custom bodyColor if provided, otherwise use default from config
  const colors = CFG.colors
  const particleColor = bodyColor || (type === HEROES.HERO ? colors.hero.body : colors.antiHero.body)
  
  //
  // Generate target points along character outline
  // Character is approximately 32x32 pixels scaled by HERO_SCALE (3)
  //
  const charSize = 32 * HERO_SCALE
  const targetPoints = []
  
  // Generate points around the perimeter of the character
  const pointCount = 20
  for (let i = 0; i < pointCount; i++) {
    const angle = (i / pointCount) * Math.PI * 2
    const radius = charSize / 2 * 0.5  // Reduce radius by 50% (smaller outline)
    const offsetX = Math.cos(angle) * radius * k.rand(0.5, 1)
    const offsetY = Math.sin(angle) * radius * k.rand(0.5, 1)
    
    targetPoints.push({
      x: x + offsetX,
      y: y + offsetY
    })
  }
  
  // Create particles for assembly effect
  const particles = []
  const particleCount = 20
  const scale = 2
  const particleSize = 4
  const outlineSize = particleSize + 1  // Reduced from +2 to +1 (thinner outline)
  
  for (let i = 0; i < particleCount; i++) {
    const startX = x + k.rand(-100, 100)
    const startY = y + k.rand(-100, 100)
    
    //
    // Parse hex color to RGB
    //
    const [r, g, b] = parseHex(particleColor)
    
    //
    // Random shape parameters
    //
    const shapeType = k.choose(['square', 'rect_h', 'rect_v', 'small_square'])
    const rotation = k.rand(0, 360)
    
    let pWidth, pHeight, oWidth, oHeight
    
    if (shapeType === 'square') {
      pWidth = pHeight = particleSize * scale
      oWidth = oHeight = outlineSize * scale
    } else if (shapeType === 'rect_h') {
      // Horizontal rectangle
      pWidth = particleSize * scale * k.rand(1.3, 1.8)
      pHeight = particleSize * scale * k.rand(0.6, 0.8)
      oWidth = pWidth + 1 * scale  // Thinner outline (was 2 * scale)
      oHeight = pHeight + 1 * scale
    } else if (shapeType === 'rect_v') {
      // Vertical rectangle
      pWidth = particleSize * scale * k.rand(0.6, 0.8)
      pHeight = particleSize * scale * k.rand(1.3, 1.8)
      oWidth = pWidth + 1 * scale  // Thinner outline (was 2 * scale)
      oHeight = pHeight + 1 * scale
    } else {
      // Small square
      pWidth = pHeight = particleSize * scale * k.rand(0.7, 0.9)
      oWidth = oHeight = pWidth + 1 * scale  // Thinner outline (was 2 * scale)
    }
    
    //
    // Create a single game object that will draw both outline and colored part
    //
    const particle = k.add([
      k.pos(startX, startY),
      k.anchor("center"),
      k.rotate(rotation),
      k.z(101),
      "assemblyParticle",
      {
        draw() {
          //
          // Draw black outline first (behind)
          //
          k.drawRect({
            width: oWidth,
            height: oHeight,
            pos: k.vec2(0, 0),
            anchor: "center",
            color: k.rgb(0, 0, 0)
          })
          
          //
          // Draw colored particle on top
          //
          k.drawRect({
            width: pWidth,
            height: pHeight,
            pos: k.vec2(0, 0),
            anchor: "center",
            color: k.rgb(r, g, b)
          })
        }
      }
    ])
    
    //
    // Assign target point from the outline (cycle through points)
    //
    const targetPoint = targetPoints[i % targetPoints.length]
    particle.targetX = targetPoint.x
    particle.targetY = targetPoint.y
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
  if (inst.isAnnihilating) return
  //
  // For non-controllable characters (like in menu), always use idle animation
  //
  if (!inst.controllable) {
    updateIdleAnimation(inst)
    inst.character.flipX = inst.direction === -1
    return
  }
  
  //
  // Handle movement input (check if spawned first)
  //
  if (inst.isSpawned) {
    const isMovingLeft = isAnyKeyDown(inst.k, CFG.controls.moveLeft)
    const isMovingRight = isAnyKeyDown(inst.k, CFG.controls.moveRight)
    
    //
    // Apply movement only once per frame, prioritizing last pressed direction
    //
    if (isMovingLeft && !isMovingRight) {
      inst.character.move(-inst.speed, 0)
      inst.direction = -1
    } else if (isMovingRight && !isMovingLeft) {
      inst.character.move(inst.speed, 0)
      inst.direction = 1
    }
  }
  
  // Determine movement state (only for controllable characters)
  const isMoving = isAnyKeyDown(inst.k, CFG.controls.moveLeft) || 
    isAnyKeyDown(inst.k, CFG.controls.moveRight)
  
  // Check if character is grounded (use isGrounded method or check if falling/jumping)
  const isGrounded = inst.character.isGrounded()
  
  //
  // Handle pre-jump squash animation (only when grounded)
  //
  if (inst.isSquashing && isGrounded) {
    inst.squashTimer += inst.k.dt()
    const prefix = inst.spritePrefix || inst.type
    
    //
    // Switch between frame 0 (squash) and frame 1 (stretch) while on ground
    //
    if (inst.squashTimer < JUMP_STRETCH_START) {
      //
      // First part: squash (frame 0)
      //
      if (inst.jumpFrame !== 0) {
        inst.jumpFrame = 0
        inst.character.use(inst.k.sprite(`${prefix}-jump-0`))
      }
    } else {
      //
      // Second part: start stretching while still on ground (frame 1)
      // This creates anticipation before the actual jump
      //
      if (inst.jumpFrame !== 1) {
        inst.jumpFrame = 1
        inst.character.use(inst.k.sprite(`${prefix}-jump-1`))
      }
    }
    
    if (inst.squashTimer >= JUMP_SQUASH_TIME) {
      //
      // Squash animation complete - actually jump!
      //
      inst.character.vel.y = -inst.jumpForce
      inst.canJump = false
      inst.isSquashing = false
      inst.squashTimer = 0
      inst.jumpPhase = 'jumping'
      //
      // Keep frame 1 (stretch) for smooth transition to air
      //
    }
    
    //
    // Update direction during squash
    //
    inst.character.flipX = inst.direction === -1
    
    //
    // Don't process other animations during squash
    //
    return
  }

  if (!isGrounded) {
    //
    // Jumping - update animation based on velocity (position in jump arc)
    //
    const prefix = inst.spritePrefix || inst.type
    const velocity = inst.character.vel.y
    
    //
    // Determine jump frame based on vertical velocity
    // Frame 0: squash (pre-jump, on ground only)
    // Frame 1: stretch (ascending, first half) - velocity < -400
    // Frame 2: normal (approaching peak) - velocity -400 to -250
    // Frame 3: intermediate (near peak) - velocity -250 to -100
    // Frame 4: squash (at peak and early descent) - velocity -100 to 200
    // Frame 5: normal (landing) - after grounding
    //
    let targetFrame = inst.jumpFrame
    
    if (velocity < -400) {
      //
      // First half of ascent - stretched (frame 1)
      //
      targetFrame = 1
    } else if (velocity < -250) {
      //
      // Approaching peak - normal height (frame 2)
      //
      targetFrame = 2
    } else if (velocity < -100) {
      //
      // Near peak - intermediate (frame 3)
      //
      targetFrame = 3
    } else if (velocity < 200) {
      //
      // At peak and early descent - squashed (frame 4)
      //
      targetFrame = 4
    } else {
      //
      // Descending fast - back to normal for landing preparation (frame 2)
      //
      targetFrame = 2
    }
    
    //
    // Update sprite only if frame changed
    //
    if (targetFrame !== inst.jumpFrame) {
      inst.jumpFrame = targetFrame
      inst.character.use(inst.k.sprite(`${prefix}-jump-${targetFrame}`))
    }
    
    //
    // Mark that we're jumping
    //
    if (!inst.wasJumping) {
      inst.runFrame = 0
      inst.runTimer = 0
      inst.isRunning = false
      inst.wasJumping = true
      inst.jumpPhase = 'jumping'
    }
    
    //
    // Update direction while in air
    //
    inst.character.flipX = inst.direction === -1
    //
    // While in air, don't process any other animations
    //
    return
  } else {
    //
    // Reset jump phase when grounded
    //
    if (inst.jumpPhase !== 'none') {
      inst.jumpPhase = 'none'
      inst.jumpFrame = 0
      inst.isSquashing = false
      inst.squashTimer = 0
    }
  }
  
  if (isMoving) {
    //
    // Running - switch frames smoothly (time-based animation)
    // Only reset animation if starting from idle (not from jump)
    //
    const prefix = inst.spritePrefix || inst.type
    if (!inst.isRunning && !inst.wasJumping) {
      inst.runFrame = 0
      inst.runTimer = 0
      inst.character.use(inst.k.sprite(`${prefix}-run-0`))
      //
      // Create dust particles when starting to run
      //
      createRunStartDust(inst, inst.direction)
    } else if (inst.wasJumping) {
      //
      // Just landed - continue with current frame, just update sprite
      //
      inst.wasJumping = false
      inst.character.use(inst.k.sprite(`${prefix}-run-${inst.runFrame}`))
    }
    
    inst.isRunning = true
    inst.runTimer += inst.k.dt()
    if (inst.runTimer > RUN_ANIM_SPEED) {
      inst.runFrame = (inst.runFrame + 1) % RUN_FRAME_COUNT
      inst.character.use(inst.k.sprite(`${prefix}-run-${inst.runFrame}`))
      inst.runTimer = 0
      // Step sound on frame 0 (when foot touches ground)
      if (inst.sfx && inst.runFrame === 0) {
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
  //
  // Jump
  //
  CFG.controls.jump.forEach(key => {
    inst.k.onKeyPress(key, () => {
      if (!inst.isSpawned || inst.isAnnihilating) return  // Prevent jump before spawn or during annihilation
      if (inst.canJump && !inst.isSquashing) {
        //
        // Start pre-jump squash animation instead of jumping immediately
        //
        inst.isSquashing = true
        inst.squashTimer = 0
        inst.jumpFrame = 0
        //
        // Immediately set squash sprite (frame 0)
        //
        const prefix = inst.spritePrefix || inst.type
        inst.character.use(inst.k.sprite(`${prefix}-jump-0`))
        //
        // Play jump sound
        //
        inst.sfx && Sound.playJumpSound(inst.sfx)
      }
    })
  })
}

/**
 * Create landing dust particles
 * @param {Object} inst - Hero instance
 */
function createLandingDust(inst) {
  const { k, character, dustColor } = inst
  //
  // Calculate foot position (bottom of collision box)
  //
  const footY = character.pos.y + (COLLISION_HEIGHT / 2) + COLLISION_OFFSET_Y
  const footX = character.pos.x
  
  //
  // Determine dust color (use custom color or default gray)
  //
  const color = dustColor ? getColor(k, dustColor) : k.color(150, 150, 150)
  
  createDustParticles(inst, footX, footY, color, 'splash')
}

/**
 * Create run start dust particles
 * @param {Object} inst - Hero instance
 * @param {number} direction - Movement direction (-1 = left, 1 = right)
 */
function createRunStartDust(inst, direction) {
  const { k, character, dustColor } = inst
  //
  // Calculate foot position (bottom of collision box)
  //
  const footY = character.pos.y + (COLLISION_HEIGHT / 2) + COLLISION_OFFSET_Y
  const footX = character.pos.x
  
  //
  // Determine dust color (use custom color or default gray)
  //
  const color = dustColor ? getColor(k, dustColor) : k.color(150, 150, 150)
  
  createDustParticles(inst, footX, footY, color, 'run', direction)
}

/**
 * Create dust particles (shared logic for landing and run start)
 * @param {Object} inst - Hero instance
 * @param {number} footX - X position of foot
 * @param {number} footY - Y position of foot
 * @param {Object} color - Particle color
 * @param {string} type - 'splash' (both sides) or 'run' (backward direction)
 * @param {number} direction - Movement direction (for run type)
 */
function createDustParticles(inst, footX, footY, color, type = 'splash', direction = 1) {
  const { k } = inst
  
  //
  // Create dust particles at feet position
  //
  for (let i = 0; i < DUST_PARTICLE_COUNT; i++) {
    //
    // Determine particle direction based on type
    //
    let side
    if (type === 'splash') {
      //
      // Splash: particles spread to both sides
      //
      side = i < DUST_PARTICLE_COUNT / 2 ? -1 : 1
    } else {
      //
      // Run: particles go backward (opposite to movement direction)
      //
      side = -direction
    }
    
    //
    // Angle: mostly horizontal with slight upward direction (like splash)
    // Range: 5-30 degrees from horizontal (flatter splash)
    //
    const angle = k.rand(5, 30) * (Math.PI / 180)
    const speed = k.rand(DUST_PARTICLE_SPEED * 0.8, DUST_PARTICLE_SPEED * 1.5)
    const vx = Math.cos(angle) * speed * side
    const vy = -Math.sin(angle) * speed  // Negative = upward
    
    //
    // Start from foot position, spread horizontally to sides
    //
    const offsetX = side * k.rand(5, 15)
    
    const particle = k.add([
      k.rect(DUST_PARTICLE_SIZE, DUST_PARTICLE_SIZE),
      k.pos(footX + offsetX, footY - 2),  // Slightly above ground
      color,
      k.opacity(0.9),
      k.anchor("center"),
      k.z(CFG.visual.zIndex.player + 1),  // Above player to be visible
    ])
    
    //
    // Store particle velocity and lifetime
    //
    particle.vx = vx
    particle.vy = vy
    particle.lifetime = 0
    particle.maxLifetime = DUST_PARTICLE_LIFETIME
    
    //
    // Update particle position and fade out
    //
    particle.onUpdate(() => {
      particle.lifetime += k.dt()
      
      //
      // Move particle
      //
      particle.pos.x += particle.vx * k.dt()
      particle.pos.y += particle.vy * k.dt()
      
      //
      // Apply gravity (particles fall down after initial splash)
      //
      particle.vy += 600 * k.dt()
      //
      // Apply friction (horizontal slowdown)
      //
      particle.vx *= 0.97
      
      //
      // Fade out based on lifetime
      //
      const progress = particle.lifetime / particle.maxLifetime
      particle.opacity = 0.9 * (1 - progress)
      
      //
      // Destroy when lifetime expires
      //
      if (particle.lifetime >= particle.maxLifetime) {
        k.destroy(particle)
      }
    })
  }
}

/**
 * Handle collision with platform
 * @param {Object} inst - Hero instance
 */
function onCollisionPlatform(inst) {
  // Set canJump flag when touching platform
  const wasInAir = !inst.canJump
  inst.canJump = true
  
  //
  // Play landing sound and create dust if was in air
  //
  if (wasInAir && inst.wasJumping) {
    inst.sfx && Sound.playLandSound(inst.sfx)
    createLandingDust(inst)
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
  
  const targetPos = k.vec2(target.pos.x, target.pos.y)
  
  //
  // INSTANT EXPLOSION: Anti-hero explodes immediately with sound and particles
  //
  
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
  // Force idle sprite (not jump!) using current eye position
  //
  player.use(k.sprite(getSpriteName(inst, inst.eyeOffsetX, inst.eyeOffsetY)))
  
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
  
  //
  // Get anti-hero colors (use custom bodyColor if provided, otherwise use default)
  //
  const antiHeroBodyColor = inst.antiHero.bodyColor || CFG.colors.antiHero.body
  const antiHeroOutlineColor = CFG.colors.antiHero.outline
  
  const scale = 2
  const particleSize = 4
  const outlineSize = particleSize + 1  // Reduced from +2 to +1 (thinner outline)
  
  for (let i = 0; i < particleCount; i++) {
    //
    // Randomly choose body or outline color (80% body, 20% outline for more red)
    //
    const useBodyColor = k.rand(0, 1) > 0.2
    const particleColorHex = useBodyColor ? antiHeroBodyColor : antiHeroOutlineColor
    
    //
    // Parse hex color to RGB
    //
    const [r, g, b] = parseHex(particleColorHex)
    
    const particleX = targetPos.x + k.rand(-20, 20)
    const particleY = targetPos.y + k.rand(-20, 20)
    
    //
    // Random shape parameters
    //
    const shapeType = k.choose(['square', 'rect_h', 'rect_v', 'small_square'])
    const rotation = k.rand(0, 360)
    
    let pWidth, pHeight, oWidth, oHeight
    
    if (shapeType === 'square') {
      pWidth = pHeight = particleSize * scale
      oWidth = oHeight = outlineSize * scale
    } else if (shapeType === 'rect_h') {
      // Horizontal rectangle
      pWidth = particleSize * scale * k.rand(1.3, 1.8)
      pHeight = particleSize * scale * k.rand(0.6, 0.8)
      oWidth = pWidth + 1 * scale  // Thinner outline (was 2 * scale)
      oHeight = pHeight + 1 * scale
    } else if (shapeType === 'rect_v') {
      // Vertical rectangle
      pWidth = particleSize * scale * k.rand(0.6, 0.8)
      pHeight = particleSize * scale * k.rand(1.3, 1.8)
      oWidth = pWidth + 1 * scale  // Thinner outline (was 2 * scale)
      oHeight = pHeight + 1 * scale
    } else {
      // Small square
      pWidth = pHeight = particleSize * scale * k.rand(0.7, 0.9)
      oWidth = oHeight = pWidth + 1 * scale  // Thinner outline (was 2 * scale)
    }
    
    //
    // Create a single game object that will draw both outline and colored part
    //
    const particle = k.add([
      k.pos(particleX, particleY),
      k.anchor("center"),
      k.rotate(rotation),
      k.z(101),
      {
        draw() {
          //
          // Draw black outline first (behind)
          //
          k.drawRect({
            width: oWidth,
            height: oHeight,
            pos: k.vec2(0, 0),
            anchor: "center",
            color: k.rgb(0, 0, 0)
          })
          
          //
          // Draw colored particle on top
          //
          k.drawRect({
            width: pWidth,
            height: pHeight,
            pos: k.vec2(0, 0),
            anchor: "center",
            color: k.rgb(r, g, b)
          })
        }
      }
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
      // Update outline position
      //
      if (p.outline && p.outline.exists()) {
        p.outline.pos.x = p.pos.x
        p.outline.pos.y = p.pos.y
      }
      
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
        // Play explosion sound (short pop/snap sound)
        //
        sfx && Sound.playGlitchSound(sfx)
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
        const shakeIntensity = 20
        
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
              if (p.outline && p.outline.exists()) k.destroy(p.outline)
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
            // Update outline position
            //
            if (p.outline && p.outline.exists()) {
              p.outline.pos.x = p.pos.x
              p.outline.pos.y = p.pos.y
            }
            
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
              if (p.outline && p.outline.exists()) k.destroy(p.outline)
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
            // Clean up particles and outlines
            //
            particles.forEach(p => {
              if (p.outline && p.outline.exists()) k.destroy(p.outline)
              if (p.exists()) k.destroy(p)
            })
            
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
                //
                // Save NEXT level progress to localStorage before transition
                // (so player continues from the next level, not the current one)
                //
                const nextLevel = getNextLevel(inst.currentLevel)
                if (nextLevel && nextLevel !== 'menu') {
                  saveLastLevel(nextLevel)
                }
                inst.character.hidden = true
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
 * @param {string} type - Character type: 'hero' or 'antiHero'
 * @param {string} animation - Animation type: 'idle', 'run', 'jump'
 * @param {number} frame - Frame number (for animations)
 * @param {number} eyeOffsetX - Pupil X offset
 * @param {number} eyeOffsetY - Pupil Y offset
 * @param {string} [customBodyColor] - Custom body color in hex format (outline is always black)
 * @param {boolean} [addMouth=false] - Add black horizontal mouth line (only for idle animation)
 * @param {boolean} [addArms=false] - Add simple vertical arms
 * @returns {string} Base64 encoded sprite data
 */
function createFrame(type = HEROES.HERO, animation = 'idle', frame = 0, eyeOffsetX = 0, eyeOffsetY = 0, customBodyColor = null, addMouth = false, addArms = false) {
  //
  // Choose body color - custom or default
  //
  let bodyColor
  
  if (customBodyColor) {
    bodyColor = customBodyColor
  } else {
    const colors = type === HEROES.HERO ? CFG.colors.hero : CFG.colors.antiHero
    bodyColor = colors.body
  }
  
  //
  // Outline is always black
  //
  const outlineColor = '000000'
  
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
  let bodyHeight = 8   // Body height (for stretching/squashing)
  let headHeight = 8   // Head height
  let leftArmY = 15
  let rightArmY = 15
  let leftLegY = 22
  let rightLegY = 22
  let leftArmX = 9
  let rightArmX = 21
  let leftLegX = 12
  let rightLegX = 17
  let legHeight = 6    // Leg height (for stretching/squashing)
  
  // Run animation (3 frames)
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
    }
  }
  
  // Jump animation - 5 frames with squash and stretch
  if (animation === 'jump') {
    if (frame === 0) {
      //
      // Frame 0: Squash (pre-jump, on ground) - hero squats down LOW
      // Everything pushed down, legs also SHORT
      //
      headY = 15  // Very low (idle is 6, difference = 9)
      headHeight = 5  // Shorter head
      bodyY = 20  // headY + headHeight = 15 + 5
      bodyHeight = 4  // Very short body
      leftArmY = 21
      rightArmY = 21
      // Legs SHORT and wide
      rightLegY = 24  // bodyY + bodyHeight = 20 + 4
      rightLegX = 18
      leftLegY = 24
      leftLegX = 11
      legHeight = 4  // Short legs! Bottom: 24+4=28 (same as idle)
    } else if (frame === 1) {
      //
      // Frame 1: Stretch (ascending, in air) - hero elongated UP
      // Legs spread wider like frame 0
      //
      headY = 3  // Very high
      headHeight = 8
      bodyY = 11  // headY + headHeight = 3 + 8
      bodyHeight = 12  // Very tall body
      leftArmY = 13
      rightArmY = 13
      // Legs spread wider with gap between them
      rightLegY = 23  // bodyY + bodyHeight = 11 + 12
      rightLegX = 18  // Wide spread (same as frame 0)
      leftLegY = 23
      leftLegX = 11   // Wide spread (same as frame 0)
      legHeight = 5
    } else if (frame === 2) {
      //
      // Frame 2: Normal (near peak) - regular proportions moved to TOP
      //
      headY = 2   // Very top
      headHeight = 8
      bodyY = 10  // headY + headHeight = 2 + 8
      bodyHeight = 8
      leftArmY = 11
      rightArmY = 11
      // Regular legs
      rightLegY = 18  // bodyY + bodyHeight = 10 + 8
      rightLegX = 18
      leftLegY = 18
      leftLegX = 10
      legHeight = 6  // Bottom: 18+6=24 (high in frame)
    } else if (frame === 3) {
      //
      // Frame 3: Intermediate (transitioning to squash) - between normal and squash
      // At very top of frame, slightly taller than before
      //
      headY = 2   // Very top
      headHeight = 7  // Between normal (8) and squash (6)
      bodyY = 9  // headY + headHeight = 2 + 7
      bodyHeight = 7  // Taller body (was 6) - +1px
      leftArmY = 10
      rightArmY = 10
      // Legs slightly taller
      rightLegY = 16  // bodyY + bodyHeight = 9 + 7
      rightLegX = 19
      leftLegY = 16
      leftLegX = 10
      legHeight = 6  // Taller legs (was 5) - +1px. Bottom: 16+6=22 (was 20)
    } else if (frame === 4) {
      //
      // Frame 4: Squash (descending, in air) - hero compressed DOWN
      // Top stays at very top, but body is slightly taller for smoother transition
      //
      headY = 2   // Very top (same as before)
      headHeight = 6  // Slightly taller head (was 5)
      bodyY = 8  // headY + headHeight = 2 + 6
      bodyHeight = 5  // Slightly taller body (was 4)
      leftArmY = 9
      rightArmY = 9
      // Legs SHORT and spread wider
      rightLegY = 13  // bodyY + bodyHeight = 8 + 5
      rightLegX = 19
      leftLegY = 13
      leftLegX = 10
      legHeight = 5  // Slightly taller legs (was 4) - Bottom: 13+5=18
    } else if (frame === 5) {
      //
      // Frame 5: Normal (landing/idle) - regular proportions
      //
      headY = 6
      headHeight = 8
      bodyY = 14  // headY + headHeight = 6 + 8
      bodyHeight = 8
      leftArmY = 15
      rightArmY = 15
      // Regular legs
      rightLegY = 22  // bodyY + bodyHeight = 14 + 8
      rightLegX = 17
      leftLegY = 22
      leftLegX = 12
      legHeight = 6  // Bottom: 22+6=28 (same as idle)
    }
    leftArmX = 9
    rightArmX = 21
  }
  
  //
  // Black outline (universal)
  //
  ctx.fillStyle = getHex(outlineColor)
  ctx.fillRect(headX - 1, headY - 1, 10, 10)
  
  // Body outline - position it right below head
  ctx.fillRect(bodyX - 1, bodyY - 1, 14, bodyHeight + 2)
  
  // Arm outlines - don't draw while running and jumping
  if (animation !== 'run' && animation !== 'jump') {
    ctx.fillRect(leftArmX - 1, leftArmY - 1, 4, 9)
    ctx.fillRect(rightArmX - 1, rightArmY - 1, 4, 9)
  }
  
  // Leg outlines
  ctx.fillRect(leftLegX - 1, leftLegY - 1, 5, legHeight + 2)
  ctx.fillRect(rightLegX - 1, rightLegY - 1, 5, legHeight + 2)
  
  //
  // Head (universal body color)
  //
  ctx.fillStyle = getHex(bodyColor)
  ctx.fillRect(headX, headY, 8, 8)
  
  //
  // Eyes - for run and jump draw only ONE eye (side view)
  //
  ctx.fillStyle = getHex(CFG.colors[type].eyeWhite)
  if (animation === 'run' || animation === 'jump') {
    ctx.fillRect(headX + 6, headY + 2, 3, 3)
  } else {
    ctx.fillRect(headX + 1, headY + 2, 3, 3)
    ctx.fillRect(headX + 6, headY + 2, 3, 3)
  }
  
  //
  // Pupils (universal color)
  //
  ctx.fillStyle = getHex(outlineColor)
  if (animation === 'run' || animation === 'jump') {
    ctx.fillRect(headX + 7, headY + 3, 1, 1)
  } else {
    ctx.fillRect(headX + 2 + eyeOffsetX, headY + 3 + eyeOffsetY, 1, 1)
    ctx.fillRect(headX + 7 + eyeOffsetX, headY + 3 + eyeOffsetY, 1, 1)
  }
  
  //
  // Mouth (optional, only for idle animation)
  //
  if (addMouth && animation === 'idle') {
    ctx.fillStyle = getHex(outlineColor)  // Black
    //
    // Horizontal line below eyes (centered, 4 pixels wide, lower position)
    //
    ctx.fillRect(headX + 2, headY + 7, 4, 1)
  }
  
  //
  // Body (universal color)
  //
  ctx.fillStyle = getHex(bodyColor)
  ctx.fillRect(bodyX, bodyY, 12, bodyHeight)
  
  // Arms - don't draw while running and jumping
  if (animation !== 'run' && animation !== 'jump') {
    ctx.fillRect(leftArmX, leftArmY, 2, 7)
    ctx.fillRect(rightArmX, rightArmY, 2, 7)
  }
  
  // Legs
  ctx.fillRect(leftLegX, leftLegY, 3, legHeight)
  ctx.fillRect(rightLegX, rightLegY, 3, legHeight)
  
  //
  // Custom arms (optional, simple vertical lines drawn on top)
  //
  if (addArms) {
    ctx.fillStyle = getHex(outlineColor)  // Black
    //
    // Arms positioned at the same X as legs, shifted outward by arm width
    //
    const armStartY = bodyY + 4  // Start lower (was +2, now +4)
    const armLength = 6  // Length of arms
    const armWidth = 1  // Arm width
    
    ctx.fillRect(leftLegX - armWidth, armStartY, armWidth, armLength)  // Left arm (shifted left)
    ctx.fillRect(rightLegX + 3, armStartY, armWidth, armLength)  // Right arm (shifted right by leg width)
  }
  
  return canvas.toDataURL()
}
/**
 * Get hero scale
 * @param {Object} k - Kaplay instance
 * @returns {number} Scale factor for hero
 */
function getHeroScale(k) {
  return HERO_SCALE
}

/**
 * Get sprite name for character (supports custom colors)
 * @param {Object} inst - Hero instance
 * @param {number} eyeX - Eye X offset (-1, 0, 1)
 * @param {number} eyeY - Eye Y offset (-1, 0, 1)
 * @returns {string} Sprite name
 */
function getSpriteName(inst, eyeX = 0, eyeY = 0) {
  //
  // Always round eye coordinates to ensure sprite names are clean integers
  //
  const roundedX = Math.round(eyeX)
  const roundedY = Math.round(eyeY)
  //
  // Use custom sprite prefix if bodyColor is set
  //
  const prefix = inst.spritePrefix || inst.type
  return `${prefix}_${roundedX}_${roundedY}`
}