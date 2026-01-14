import { CFG } from '../cfg.js'
import { getHex, isAnyKeyDown, getColor, parseHex, getRGB } from '../utils/helper.js'
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
const SPRITE_SIZE = 32
const RUN_ANIM_SPEED = 0.03333
const PARTICLE_SHAPES = ['square', 'rect_h', 'rect_v', 'small_square']
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
const DUST_PARTICLE_SIZE = 6
const DUST_PARTICLE_SPEED = 80
const DUST_PARTICLE_LIFETIME = 0.4
//
// Death animation timing
//
const DEATH_ANIMATION_DURATION = 2.3
const DEATH_PARTICLE_POINTS = 20

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
 * @param {Function} [config.onAnnihilation] - Callback when hero meets anti-hero
 * @param {string} [config.currentLevel] - Current level name for transition
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
    scale = HERO_SCALE,
    antiHero = null,
    onAnnihilation = null,
    currentLevel = null,
    bodyColor = null,      // Custom body color (hex string)
    outlineColor = null,   // Custom outline color (hex string), defaults to black
    dustColor = null,      // Dust particle color (hex string)
    isStatic = false,      // If true, no physics (for indicators)
    addMouth = false,      // If true, add black horizontal mouth line (only for idle)
    addArms = false,       // If true, add simple vertical arms
    hitboxPadding = 0      // Additional padding around collision box (for menu hover/click)
  } = config

  const defaultBodyColor = type === HEROES.HERO ? CFG.visual.colors.hero.body : CFG.visual.colors.antiHero.body
  //
  // Ensure colors are strings and remove # symbols
  //
  const effectiveBodyColor = String(bodyColor ?? defaultBodyColor).replace('#', '')
  const effectiveOutlineColor = String(outlineColor ?? CFG.visual.colors.outline).replace('#', '')
  //
  // Load sprites for this hero configuration.
  // This will use cached sprites if already loaded
  // Pass colors with # for loadHeroSprites (it will handle removal internally)
  //
  try {
    const bodyColorWithHash = bodyColor ?? defaultBodyColor
    const outlineColorWithHash = outlineColor ?? CFG.visual.colors.outline
    loadHeroSprites({
      k,
      type,
      bodyColor: bodyColorWithHash,
      outlineColor: outlineColorWithHash,
      addMouth,
      addArms,
      character: null  // Marker to indicate this is an inst-like object
    })
  } catch (error) {
    console.error('Failed to load hero sprites:', error)
  }
  //
  // Generate sprite prefix based on customization (colors already have # removed)
  //
  const spritePrefix = `${type}_${effectiveBodyColor}_${effectiveOutlineColor}${addMouth ? '_mouth' : ''}${addArms ? '_arms' : ''}`
  const spriteName = `${spritePrefix}_0_0`

  const collisionOffsetX = COLLISION_OFFSET_X - hitboxPadding
  const collisionOffsetY = COLLISION_OFFSET_Y - hitboxPadding
  const collisionWidth = COLLISION_WIDTH + hitboxPadding * 2
  const collisionHeight = COLLISION_HEIGHT + hitboxPadding * 2

  //
  // Ensure sprite is loaded before using it
  //
  let spriteComponent
  try {
    const existingSprite = k.getSprite(spriteName)
    if (existingSprite) {
      spriteComponent = k.sprite(spriteName)
    } else {
      //
      // Sprite not found, try to load it now
      //
      loadHeroSprites({
        k,
        type,
        bodyColor: effectiveBodyColor,
        outlineColor: effectiveOutlineColor,
        addMouth,
        addArms
      })
      //
      // Try to use the sprite (it should be loaded now)
      //
      spriteComponent = k.sprite(spriteName)
    }
  } catch (error) {
    //
      // Fallback: use default sprite name or rectangle placeholder
      //
    const defaultSpriteName = `${type}_0_0`
    try {
      const defaultSprite = k.getSprite(defaultSpriteName)
      if (defaultSprite) {
        spriteComponent = k.sprite(defaultSpriteName)
      } else {
        spriteComponent = k.rect(SPRITE_SIZE, SPRITE_SIZE)
      }
    } catch (fallbackError) {
      //
      // If everything fails, use rectangle placeholder
      //
      spriteComponent = k.rect(SPRITE_SIZE, SPRITE_SIZE)
    }
  }

  const character = k.add([
    spriteComponent,
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
    onAnnihilation,
    currentLevel,
    bodyColor: effectiveBodyColor,        // Store effective body color (not null)
    spritePrefix,
    dustColor,
    speed: CFG.game.moveSpeed,
    jumpForce: config.jumpForce ?? CFG.game.jumpForce,
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
    isSpawned: false,   // Flag to prevent controls before spawn completes
    invulnerabilityTimer: 0,  // Timer for spawn invulnerability
    isInvulnerable: false,  // Flag for spawn invulnerability
    controlsReversed: false,  // Flag for control inversion (time section level 3)
    controlsDisabled: false  // Flag to temporarily disable controls during zone transitions
  }
  //
  // Check ground touch through collisions
  //
  character.onCollide(CFG.game.platformName, () => onCollisionPlatform(inst))
  character.onUpdate(() => onUpdate(inst))
  controllable && setupControls(inst)
  antiHero && character.onCollide(ANTIHERO_TAG, () => onAnnihilationCollide(inst))

  return inst
}

/**
 * Loads sprites for hero or anti-hero with customizable parameters
 * Can be called with inst object or individual parameters
 * @param {Object} inst - Hero instance or Kaplay instance
 * @param {string} [type] - Hero type (HERO or ANTIHERO) - required if first param is k
 * @param {string} [bodyColor=null] - Body color in hex format (null = use default from config)
 * @param {string} [outlineColor=null] - Outline color in hex format (null = use default from config)
 * @param {boolean} [addMouth=false] - Add mouth to idle sprites
 * @param {boolean} [addArms=false] - Add arms to sprites
 */
export function loadHeroSprites(inst, type = null, bodyColor = null, outlineColor = null, addMouth = false, addArms = false) {
  //
  // Determine if called with inst or individual parameters
  //
  let k, heroType, color, outline, mouth, arms

  if (inst.k && inst.type !== undefined) {
    //
    // Called with inst-like object (has k and type properties)
    //
    k = inst.k
    heroType = inst.type
    color = inst.bodyColor
    outline = inst.outlineColor
    mouth = inst.addMouth || false
    arms = inst.addArms || false
  } else {
    //
    // Called with individual parameters (for preloading)
    //
    k = inst
    heroType = type
    color = bodyColor
    outline = outlineColor
    mouth = addMouth
    arms = addArms
  }
  //
  // Use default colors from config if not provided
  //
  let effectiveBodyColor = color || (heroType === HEROES.HERO ? CFG.visual.colors.hero.body : CFG.visual.colors.antiHero.body)
  let effectiveOutlineColor = outline || CFG.visual.colors.outline
  //
  // Ensure colors are valid strings
  //
  if (!effectiveBodyColor || typeof effectiveBodyColor !== 'string') {
    effectiveBodyColor = heroType === HEROES.HERO ? CFG.visual.colors.hero.body : CFG.visual.colors.antiHero.body
  }
  if (!effectiveOutlineColor || typeof effectiveOutlineColor !== 'string') {
    effectiveOutlineColor = CFG.visual.colors.outline
  }
  //
  // Remove # from colors for prefix (colors are normalized in createFrame via getHex)
  // Ensure colors are strings before calling replace
  //
  const bodyColorForPrefix = String(effectiveBodyColor).replace('#', '')
  const outlineColorForPrefix = String(effectiveOutlineColor).replace('#', '')
  //
  // Generate unique prefix for this sprite variant
  //
  const prefix = `${heroType}_${bodyColorForPrefix}_${outlineColorForPrefix}${mouth ? '_mouth' : ''}${arms ? '_arms' : ''}`
  //
  // Check if sprites with this configuration are already loaded
  //
  try { if (k.getSprite(`${prefix}_0_0`)) return } catch (e) {}
  //
  // Load all eye variants (9 positions) for idle animation
  //
  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      const spriteName = `${prefix}_${x}_${y}`
      try {
        const spriteData = createFrame(heroType, 'idle', 0, x, y, effectiveBodyColor, effectiveOutlineColor, mouth, arms)
        //
        // Ensure sprite data is valid before loading
        //
        if (spriteData && typeof spriteData === 'string' && spriteData.startsWith('data:')) {
          try {
            k.loadSprite(spriteName, spriteData)
          } catch (loadError) {
            //
            // Skip this sprite if loading fails
            //
          }
        }
      } catch (error) {
        //
        // Skip this sprite if there's an error creating it
        //
      }
    }
  }
  //
  // Load jump animation frames (3 frames)
  //
  for (let frame = 0; frame < JUMP_FRAME_COUNT; frame++) {
    try {
      const spriteData = createFrame(heroType, 'jump', frame, 0, 0, effectiveBodyColor, effectiveOutlineColor, mouth, arms)
      if (spriteData && typeof spriteData === 'string' && spriteData.startsWith('data:')) {
        try {
          k.loadSprite(`${prefix}-jump-${frame}`, spriteData)
        } catch (loadError) {
          //
          // Skip this sprite if loading fails
          //
        }
      }
    } catch (error) {
      //
      // Skip this sprite if there's an error creating it
      //
    }
  }
  //
  // Load run frames (3 frames)
  //
  for (let frame = 0; frame < RUN_FRAME_COUNT; frame++) {
    try {
      const spriteData = createFrame(heroType, 'run', frame, 0, 0, effectiveBodyColor, effectiveOutlineColor, mouth, arms)
      if (spriteData && typeof spriteData === 'string' && spriteData.startsWith('data:')) {
        try {
          k.loadSprite(`${prefix}-run-${frame}`, spriteData)
        } catch (loadError) {
          //
          // Skip this sprite if loading fails
          //
        }
      }
    } catch (error) {
      //
      // Skip this sprite if there's an error creating it
      //
    }
  }
}
/**
 * Death effect with particle explosion
 * @param {Object} inst - Hero instance
 * @param {Function} onComplete - Callback when death animation completes
 */
export function death(inst, onComplete) {
  if (inst.isDying) return
  inst.isDying = true
  const { k, character, type, sfx } = inst
  const centerX = character.pos.x
  const centerY = character.pos.y
  //
  // Apply slow motion effect
  //
  applySlowMotion(inst)
  //
  // Stop control and play sound
  //
  character.paused = true
  inst.controllable = false
  sfx && Sound.playDeathSound(sfx)
  //
  // Create body particles explosion
  //
  createBodyParticles(inst, centerX, centerY)
  //
  // Create eye particles
  //
  createEyeParticles(inst, centerX, centerY)
  //
  // Hide character immediately
  //
  if (character.exists()) {
    k.destroy(character)
  }
  //
  // Wait for particles to finish + additional pause before callback
  //
  k.wait(DEATH_ANIMATION_DURATION, () => onComplete?.())
}

/**
 * Spawn hero with assembly effect from particles
 * @param {Object} inst - Hero instance
 */
export function spawn(inst) {
  const { k, character, type, sfx, bodyColor } = inst
  const x = character.pos.x
  const y = character.pos.y
  //
  // Hide character initially
  //
  character.hidden = true
  //
  // Determine particle color based on type
  //
  // Use custom bodyColor if provided, otherwise use default from config
  //
  const colors = CFG.visual.colors
  const particleColor = bodyColor || (type === HEROES.HERO ? colors.hero.body : colors.antiHero.body)
  //
  // Generate target points along character outline
  //
  // Character is approximately SPRITE_SIZE x SPRITE_SIZE pixels scaled by HERO_SCALE
  //
  const charSize = SPRITE_SIZE * HERO_SCALE
  const targetPoints = []
  //
  // Generate points around the perimeter of the character
  //
  for (let i = 0; i < DEATH_PARTICLE_POINTS; i++) {
    const angle = (i / DEATH_PARTICLE_POINTS) * Math.PI * 2
    const radius = charSize / 2 * 0.5  // Reduce radius by 50% (smaller outline)
    const offsetX = Math.cos(angle) * radius * k.rand(0.5, 1)
    const offsetY = Math.sin(angle) * radius * k.rand(0.5, 1)

    targetPoints.push({
      x: x + offsetX,
      y: y + offsetY
    })
  }
  //
  // Create particles for assembly effect
  //
  const particles = []
  //
  // Scale and particle size
  //
  const scale = 2
  const particleSize = 4
  const outlineSize = particleSize + 1
  //
  // Create particles
  //
  for (let i = 0; i < DEATH_PARTICLE_POINTS; i++) {
    const startX = x + k.rand(-100, 100)
    const startY = y + k.rand(-100, 100)
    //
    // Random shape parameters
    //
    const shapeType = k.choose(PARTICLE_SHAPES)
    const rotation = k.rand(0, 360)
    //
    // Create particle using helper function
    //
    const particle = createParticleWithOutline(k, startX, startY, particleColor, shapeType, rotation, particleSize, scale)
    particle.use("assemblyParticle")
    //
    // Assign target point from the outline (cycle through points)
    //
    const targetPoint = targetPoints[i % targetPoints.length]
    particle.targetX = targetPoint.x
    particle.targetY = targetPoint.y
    particle.speed = k.rand(200, 400)

    particles.push(particle)
  }
  //
  // Play sweep sound at the start of assembly effect
  //
  sfx && Sound.playSpawnSweep(sfx)
  //
  // Animate particles to center
  //
  let particlesGathered = false
  let soundPlayed = false

  const updateHandler = k.onUpdate(() => {
    if (!particlesGathered) {
      let allGathered = true
      let allNearTarget = true

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
        //
        // Check if particles are close to target (for early sound trigger)
        //
        if (dist > 20) {
          allNearTarget = false
        }
      })
      //
      // Play click sound when particles are close but not yet fully assembled
      //
      if (!soundPlayed && allNearTarget && sfx) {
        Sound.playSpawnClick(sfx)
        soundPlayed = true
      }

      if (allGathered) {
        particlesGathered = true
        //
        // Remove particles
        //
        particles.forEach(p => {
          if (p.exists()) k.destroy(p)
        })
        //
        // Show hero
        //
        character.hidden = false
        //
        // Mark hero as spawned (allow controls) and invulnerable
        //
        inst.isSpawned = true
        inst.isInvulnerable = true
        inst.invulnerabilityTimer = 3.0  // 3 seconds of invulnerability
        //
        // Cancel update
        //
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
  // Update invulnerability timer
  //
  if (inst.isInvulnerable) {
    inst.invulnerabilityTimer -= inst.k.dt()
    if (inst.invulnerabilityTimer <= 0) {
      inst.isInvulnerable = false
      inst.invulnerabilityTimer = 0
    }
  }
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
  if (inst.isSpawned && !inst.controlsDisabled) {
    let isMovingLeft = isAnyKeyDown(inst.k, CFG.controls.moveLeft)
    let isMovingRight = isAnyKeyDown(inst.k, CFG.controls.moveRight)
    //
    // Apply control inversion if flag is set (for time section level 3)
    //
    if (inst.controlsReversed) {
      const temp = isMovingLeft
      isMovingLeft = isMovingRight
      isMovingRight = temp
    }
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
  //
  // Determine movement state (only for controllable characters)
  //
  const isMoving = isAnyKeyDown(inst.k, CFG.controls.moveLeft) ||
    isAnyKeyDown(inst.k, CFG.controls.moveRight)
  //
  // Check if character is grounded (use isGrounded method or check if falling/jumping)
  //
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
      //
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
    //
    // Frame 0: squash (pre-jump, on ground only)
    //
    // Frame 1: stretch (ascending, first half) - velocity < -400
    //
    // Frame 2: normal (approaching peak) - velocity -400 to -250
    //
    // Frame 3: intermediate (near peak) - velocity -250 to -100
    //
    // Frame 4: squash (at peak and early descent) - velocity -100 to 200
    //
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
    //
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
      //
      // Step sound on frame 0 (when foot touches ground)
      //
      if (inst.sfx && inst.runFrame === 0) {
        Sound.playStepSound(inst.sfx, inst.currentLevel)
      }
    }
  } else {
    //
    // Idle - with eye animation
    //
    updateIdleAnimation(inst)
  }
  //
  // Mirror based on direction
  //
  inst.character.flipX = inst.direction === -1
}

/**
 * Update idle animation with eye movement
 * @param {Object} inst - Hero instance
 */
function updateIdleAnimation(inst) {
  //
  // If just stopped running or just landed, instantly switch to idle
  //
  if (inst.isRunning || inst.wasJumping) {
    inst.isRunning = false
    inst.wasJumping = false
    inst.runFrame = 0
    inst.runTimer = 0
    //
    // Instantly switch to current idle sprite
    //
    const roundedX = Math.round(inst.eyeOffsetX)
    const roundedY = Math.round(inst.eyeOffsetY)
    const spriteName = getSpriteName(inst, roundedX, roundedY)
    inst.character.use(inst.k.sprite(spriteName))
    inst.currentEyeSprite = spriteName
  }
  //
  // Eye animation - smooth movement
  //
  inst.eyeTimer += inst.k.dt()
  //
  // Choose new target position
  //
  if (inst.eyeTimer > inst.k.rand(EYE_ANIM_MIN_DELAY, EYE_ANIM_MAX_DELAY)) {
    inst.targetEyeX = inst.k.choose([-1, 0, 1])
    inst.targetEyeY = inst.k.choose([-1, 0, 1])
    inst.eyeTimer = 0
  }
  //
  // Smoothly interpolate to target position
  //
  inst.eyeOffsetX = inst.k.lerp(inst.eyeOffsetX, inst.targetEyeX, EYE_LERP_SPEED)
  inst.eyeOffsetY = inst.k.lerp(inst.eyeOffsetY, inst.targetEyeY, EYE_LERP_SPEED)
  //
  // Round for pixel-art style
  //
  const roundedX = Math.round(inst.eyeOffsetX)
  const roundedY = Math.round(inst.eyeOffsetY)
  //
  // Switch to preloaded sprite with eyes
  //
  const spriteName = getSpriteName(inst, roundedX, roundedY)
  //
  // Update sprite only if eye position changed
  //
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
        inst.sfx && Sound.playJumpSound(inst.sfx, inst.currentLevel)
      }
    })
  })
}

/**
 * Create landing dust particles
 * @param {Object} inst - Hero instance
 */
function createLandingDust(inst) {
  const { k, character } = inst
  //
  // Calculate foot position (bottom of collision box)
  //
  const footY = character.pos.y + (COLLISION_HEIGHT / 2) + COLLISION_OFFSET_Y
  const footX = character.pos.x

  createDustParticles(inst, footX, footY, 'splash')
}

/**
 * Create run start dust particles
 * @param {Object} inst - Hero instance
 * @param {number} direction - Movement direction (-1 = left, 1 = right)
 */
function createRunStartDust(inst, direction) {
  const { k, character } = inst
  //
  // Calculate foot position (bottom of collision box)
  //
  const footY = character.pos.y + (COLLISION_HEIGHT / 2) + COLLISION_OFFSET_Y
  const footX = character.pos.x

  createDustParticles(inst, footX, footY, 'run', direction)
}

/**
 * Create dust particles (shared logic for landing and run start)
 * @param {Object} inst - Hero instance
 * @param {number} footX - X position of foot
 * @param {number} footY - Y position of foot
 * @param {string} type - 'splash' (both sides) or 'run' (backward direction)
 * @param {number} direction - Movement direction (for run type)
 */
function createDustParticles(inst, footX, footY, type = 'splash', direction = 1) {
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
    //
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

    //
    // Create particle with custom or default color
    //
    const outlineColor = getRGB(k, CFG.visual.colors.outline)
    let particleR, particleG, particleB
    if (inst.dustColor) {
      //
      // Use custom dust color (hex string) - parse directly to get RGB values
      // Keep blue tint by varying channels differently
      //
      const [baseR, baseG, baseB] = parseHex(inst.dustColor)
      //
      // Vary channels to keep blue tint: less variation for red (keep it darker),
      // more variation for green and blue (but keep blue dominant)
      //
      const variationR = k.rand(-5, 5)  // Less variation for red
      const variationG = k.rand(-8, 8)  // Medium variation for green
      const variationB = k.rand(-10, 5)  // More variation for blue, but don't go too bright
      particleR = Math.max(0, Math.min(255, baseR + variationR))
      particleG = Math.max(0, Math.min(255, baseG + variationG))
      particleB = Math.max(0, Math.min(255, baseB + variationB))
    } else {
      //
      // Default gray color
      //
      particleR = 150
      particleG = 150
      particleB = 150
    }
    
    const particle = k.add([
      k.rect(DUST_PARTICLE_SIZE, DUST_PARTICLE_SIZE),
      k.pos(footX + offsetX, footY - 2),  // Slightly above ground
      k.color(particleR, particleG, particleB),
      k.outline(1.5, k.rgb(outlineColor.r, outlineColor.g, outlineColor.b)),
      k.opacity(0.9),
      k.anchor("center"),
      k.z(50),
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
  //
  // Set canJump flag when touching platform
  //
  const wasInAir = !inst.canJump
  inst.canJump = true
  //
  // Play landing sound and create dust if was in air
  //
  if (wasInAir && inst.wasJumping) {
    inst.sfx && Sound.playLandSound(inst.sfx, inst.currentLevel)
    createLandingDust(inst)
  }
}

/**
 * Handle annihilation collision between hero and anti-hero
 * Both characters dissolve into particles and merge
 * @param {Object} inst - Hero instance
 */
export function onAnnihilationCollide(inst) {
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
  // Anti-hero colors
  //
  const antiHeroBodyColor = inst.antiHero.bodyColor || CFG.visual.colors.antiHero.body
  const antiHeroOutlineColor = CFG.visual.colors.outline

  const scale = 2
  const particleSize = 4
  const outlineSize = particleSize + 1  // Reduced from +2 to +1 (thinner outline)

  for (let i = 0; i < particleCount; i++) {
    //
    // Randomly choose body or outline color (80% body, 20% outline for more red)
    //
    const useBodyColor = k.rand(0, 1) > 0.2
    const particleColorHex = useBodyColor ? antiHeroBodyColor : antiHeroOutlineColor

    const particleX = targetPos.x + k.rand(-20, 20)
    const particleY = targetPos.y + k.rand(-20, 20)
    //
    // Random shape parameters
    //
    const shapeType = k.choose(PARTICLE_SHAPES)
    const rotation = k.rand(0, 360)
    //
    // Create particle using helper function
    //
    const particle = createParticleWithOutline(k, particleX, particleY, particleColorHex, shapeType, rotation, particleSize, scale)
    //
    // Random direction for explosion (scatter in all directions)
    //
    const angle = k.rand(0, Math.PI * 2)
    const speed = k.rand(250, 500)

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
  // Play scatter sound immediately after particles are created, before they start moving
  //
  sfx && Sound.playScatterSound(sfx)
  //
  // PHASE 1: Particles scatter outward (0.4 sec)
  //
  const scatterDuration = 0.4
  let scatterTime = 0
  let absorptionSoundStarted = false
  // let shakeStarted = false  // Temporarily disabled
  // const originalCamPos = k.camPos()  // Temporarily disabled
  // const shakeIntensity = 20  // Temporarily disabled

  const scatterInterval = k.onUpdate(() => {
    scatterTime += k.dt()
    const progress = Math.min(scatterTime / scatterDuration, 1)
    
    //
    // Start absorption sound near the end of scatter phase (at 95% progress)
    //
    if (!absorptionSoundStarted && progress >= 0.95) {
      sfx && Sound.playAbsorptionSound(sfx)
      absorptionSoundStarted = true
    }
    
    // if (!shakeStarted && scatterTime > 0) {
    //   shakeStarted = true
    // }
    
    //
    // Screen shake during scatter phase (temporarily disabled)
    //
    // if (shakeStarted) {
    //   const shakeX = k.rand(-shakeIntensity, shakeIntensity)
    //   const shakeY = k.rand(-shakeIntensity, shakeIntensity)
    //   k.camPos(originalCamPos.x + shakeX, originalCamPos.y + shakeY)
    // }
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
      // Sound already started earlier during scatter phase
      //
      k.wait(0.2, () => {
        //
        // PHASE 2: Particles absorbed into hero with screen shake
        //
        let absorbTime = 0
        const maxAbsorbDuration = 5.0  // Longer duration for particles to converge into hero
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
          // Continue screen shake during absorption (temporarily disabled)
          //
          // const shakeX = k.rand(-shakeIntensity, shakeIntensity)
          // const shakeY = k.rand(-shakeIntensity, shakeIntensity)
          // k.camPos(originalCamPos.x + shakeX, originalCamPos.y + shakeY)
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
            //
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
            // STEP 7: Check if this is the last level of word or time section
            //
            const nextLevel = getNextLevel(inst.currentLevel)
            const isLastWordLevel = inst.currentLevel === 'level-word.4' && nextLevel === 'word-complete'
            const isLastTimeLevel = inst.currentLevel === 'level-time.3' && nextLevel === 'time-complete'
            
            if (isLastWordLevel && !inst.addMouth) {
              //
              // Special sequence for completing word section: add mouth before transition
              //
              k.wait(1.5, () => {
                //
                // Store original volumes
                //
                const originalMusicVolume = Sound.getBackgroundMusicVolume(sfx)
                //
                // Fade out music and blade sounds to very quiet, increase glitch volume
                //
                let fadeTimer = 0
                const FADE_DURATION = 0.5
                const TARGET_MUSIC_VOLUME = 0.005  // Even quieter music (was 0.02)
                const TARGET_BLADE_VOLUME = 0.003  // Even quieter blade sounds (was 0.01)
                const TARGET_GLITCH_VOLUME = 3.5  // Make glitch sound even louder
                
                const fadeInterval = k.onUpdate(() => {
                  fadeTimer += k.dt()
                  const progress = Math.min(1, fadeTimer / FADE_DURATION)
                  //
                  // Fade music down
                  //
                  const newMusicVolume = originalMusicVolume + (TARGET_MUSIC_VOLUME - originalMusicVolume) * progress
                  Sound.setBackgroundMusicVolume(sfx, newMusicVolume)
                  //
                  // Fade blade sounds down
                  //
                  Sound.setBladeSoundVolume(sfx, 1.0 - progress * (1.0 - TARGET_BLADE_VOLUME))
                  //
                  // Fade glitch sounds up
                  //
                  Sound.setGlitchSoundVolume(sfx, 1.0 + progress * (TARGET_GLITCH_VOLUME - 1.0))
                  
                  if (progress >= 1) {
                    fadeInterval.cancel()
                  }
                })
                //
                // Play pre-mouth sound (louder glitch) - wait 1.3 seconds after fade completes
                //
                k.wait(1.3, () => {
                  sfx && Sound.playMouthSound(sfx)
                  //
                  // Add mouth to hero sprite
                  //
                  k.wait(0.2, () => {
                    //
                    // Update inst to include mouth BEFORE loading sprites
                    //
                    inst.addMouth = true
                    const bodyColorClean = String(inst.bodyColor || CFG.visual.colors.hero.body).replace('#', '')
                    const outlineColorClean = String(CFG.visual.colors.outline).replace('#', '')
                    inst.spritePrefix = `${inst.type}_${bodyColorClean}_${outlineColorClean}_mouth`
                    //
                    // Reload sprites with mouth
                    //
                    loadHeroSprites({
                      k: inst.k,
                      type: inst.type,
                      bodyColor: inst.bodyColor,
                      outlineColor: CFG.visual.colors.outline,
                      addMouth: true,
                      addArms: false,
                      character: null
                    })
                    //
                    // Wait a frame to ensure sprites are loaded, then update character sprite
                    //
                    k.wait(0.05, () => {
                      //
                      // Use getSpriteName to get the correct sprite with mouth
                      //
                      const newSpriteName = getSpriteName(inst, 0, 0)
                      //
                      // Update character sprite to show mouth
                      //
                      try {
                        player.use(k.sprite(newSpriteName))
                      } catch (error) {
                        console.error(`Failed to load sprite ${newSpriteName}:`, error)
                      }
                      //
                      // Play mouth appearance sound (louder transformation sound)
                      //
                      sfx && Sound.playMouthSound(sfx)
                      //
                      // Create sparkle particles around mouth
                      //
                      createMouthSparkles(inst)
                      //
                      // Pause to show the mouth longer
                      //
                      k.wait(2.5, () => {
                        //
                        // Fade volumes back to normal
                        //
                        let restoreTimer = 0
                        const RESTORE_DURATION = 0.8
                        
                        const restoreInterval = k.onUpdate(() => {
                          restoreTimer += k.dt()
                          const progress = Math.min(1, restoreTimer / RESTORE_DURATION)
                          //
                          // Restore music volume
                          //
                          const newMusicVolume = TARGET_MUSIC_VOLUME + (originalMusicVolume - TARGET_MUSIC_VOLUME) * progress
                          Sound.setBackgroundMusicVolume(sfx, newMusicVolume)
                          //
                          // Restore blade sound volume
                          //
                          Sound.setBladeSoundVolume(sfx, TARGET_BLADE_VOLUME + (1.0 - TARGET_BLADE_VOLUME) * progress)
                          //
                          // Restore glitch sound volume
                          //
                          Sound.setGlitchSoundVolume(sfx, TARGET_GLITCH_VOLUME + (1.0 - TARGET_GLITCH_VOLUME) * progress)
                          
                          if (progress >= 1) {
                            restoreInterval.cancel()
                          }
                        })
                        //
                        // Save progress and show transition
                        //
                        if (nextLevel && nextLevel !== 'menu') {
                          saveLastLevel(nextLevel)
                        }
                        inst.character.hidden = true
                        createLevelTransition(k, inst.currentLevel)
                      })
                    })
                  })
                })
              })
            } else if (isLastTimeLevel && inst.bodyColor !== "#FF8C00") {
              //
              // Special sequence for completing time section: change hero color to yellow (anti-hero color)
              //
              k.wait(1.5, () => {
                //
                // Store original volumes
                //
                const originalMusicVolume = Sound.getBackgroundMusicVolume(sfx)
                //
                // Fade out music to quiet, increase glitch volume
                //
                let fadeTimer = 0
                const FADE_DURATION = 1.0  // 1 second fade
                const TARGET_MUSIC_VOLUME = 0.005
                const TARGET_GLITCH_VOLUME = 3.5
                
                const fadeInterval = k.onUpdate(() => {
                  fadeTimer += k.dt()
                  const progress = Math.min(1, fadeTimer / FADE_DURATION)
                  //
                  // Fade music down
                  //
                  const newMusicVolume = originalMusicVolume + (TARGET_MUSIC_VOLUME - originalMusicVolume) * progress
                  Sound.setBackgroundMusicVolume(sfx, newMusicVolume)
                  //
                  // Fade glitch sounds up
                  //
                  Sound.setGlitchSoundVolume(sfx, 1.0 + progress * (TARGET_GLITCH_VOLUME - 1.0))
                  
                  if (progress >= 1) {
                    fadeInterval.cancel()
                  }
                })
                //
                // Play color change sound right after fade completes (color change happens in 1 second)
                //
                k.wait(1.0, () => {
                  sfx && Sound.playMouthSound(sfx)
                  //
                  // Update inst to use yellow color BEFORE loading sprites
                  //
                  const yellowColor = "#FF8C00"  // Anti-hero color (orange/yellow)
                  inst.bodyColor = yellowColor
                  const yellowColorClean = String(yellowColor).replace('#', '')
                  const outlineColorClean = String(CFG.visual.colors.outline).replace('#', '')
                  inst.spritePrefix = `${inst.type}_${yellowColorClean}_${outlineColorClean}`
                  //
                  // Reload sprites with yellow color
                  //
                  loadHeroSprites({
                    k: inst.k,
                    type: inst.type,
                    bodyColor: yellowColor,
                    outlineColor: CFG.visual.colors.outline,
                    addMouth: false,
                    addArms: false,
                    character: null
                  })
                  //
                  // Wait a frame to ensure sprites are loaded, then update character sprite
                  //
                  k.wait(0.05, () => {
                    //
                    // Use getSpriteName to get the correct sprite with yellow color
                    //
                    const newSpriteName = getSpriteName(inst, 0, 0)
                    //
                    // Update character sprite to show yellow color
                    //
                    try {
                      player.use(k.sprite(newSpriteName))
                    } catch (error) {
                      console.error(`Failed to load sprite ${newSpriteName}:`, error)
                    }
                    //
                    // Play color transformation sound
                    //
                    sfx && Sound.playMouthSound(sfx)
                    //
                    // Create sparkle particles around hero (yellow/orange particles)
                    //
                    createColorChangeSparkles(inst, yellowColor)
                    //
                    // Pause to show the yellow hero longer
                    //
                    k.wait(2.5, () => {
                      //
                      // Fade volumes back to normal
                      //
                      let restoreTimer = 0
                      const RESTORE_DURATION = 0.8
                      
                      const restoreInterval = k.onUpdate(() => {
                        restoreTimer += k.dt()
                        const progress = Math.min(1, restoreTimer / RESTORE_DURATION)
                        //
                        // Restore music volume
                        //
                        const newMusicVolume = TARGET_MUSIC_VOLUME + (originalMusicVolume - TARGET_MUSIC_VOLUME) * progress
                        Sound.setBackgroundMusicVolume(sfx, newMusicVolume)
                        //
                        // Restore glitch sound volume
                        //
                        Sound.setGlitchSoundVolume(sfx, TARGET_GLITCH_VOLUME + (1.0 - TARGET_GLITCH_VOLUME) * progress)
                        
                        if (progress >= 1) {
                          restoreInterval.cancel()
                        }
                      })
                      //
                      // Save progress and show transition
                      //
                      if (nextLevel && nextLevel !== 'menu') {
                        saveLastLevel(nextLevel)
                      }
                      inst.character.hidden = true
                      //
                      // Small pause after annihilation before transitioning to next level
                      //
                      k.wait(0.5, () => {
                      createLevelTransition(k, inst.currentLevel)
                      })
                    })
                  })
                })
              })
            } else {
              //
              // Normal sequence: pause after absorption and shake, then fade and show text
              //
              k.wait(0.6, () => {
                if (inst.currentLevel) {
                  //
                  // Save NEXT level progress to localStorage before transition
                  //
                  // (so player continues from the next level, not the current one)
                  //
                  if (nextLevel && nextLevel !== 'menu') {
                    saveLastLevel(nextLevel)
                  }
                  inst.character.hidden = true
                  //
                  // Small pause after annihilation before transitioning to next level
                  //
                  k.wait(0.5, () => {
                  //
                  // Call onAnnihilation callback if provided, otherwise use default transition
                  //
                  if (inst.onAnnihilation) {
                    inst.onAnnihilation()
                  } else {
                    createLevelTransition(k, inst.currentLevel)
                  }
                  })
                }
              })
            }
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
 * @param {string} [customBodyColor] - Custom body color in hex format
 * @param {string} [customOutlineColor] - Custom outline color in hex format
 * @param {boolean} [addMouth=false] - Add horizontal mouth line (only for idle animation)
 * @param {boolean} [addArms=false] - Add simple vertical arms
 * @returns {string} Base64 encoded sprite data
 */
function createFrame(type = HEROES.HERO, animation = 'idle', frame = 0, eyeOffsetX = 0, eyeOffsetY = 0, customBodyColor = null, customOutlineColor = null, addMouth = false, addArms = false) {
  //
  // Choose body color - custom or default
  //
  let bodyColor

  if (customBodyColor) {
    bodyColor = customBodyColor
  } else {
    const colors = type === HEROES.HERO ? CFG.visual.colors.hero : CFG.visual.colors.antiHero
    bodyColor = colors.body
  }
  //
  // Ensure bodyColor is a valid string
  //
  if (!bodyColor || typeof bodyColor !== 'string') {
    const colors = type === HEROES.HERO ? CFG.visual.colors.hero : CFG.visual.colors.antiHero
    bodyColor = colors.body || '#FF8C00'
  }
  //
  // Choose outline color - custom or default (black)
  //
  const outlineColorRaw = customOutlineColor || CFG.visual.colors.outline
  const outlineColor = String(outlineColorRaw || '#000000').replace('#', '')
  const canvas = document.createElement('canvas')
  canvas.width = SPRITE_SIZE
  canvas.height = SPRITE_SIZE
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, SPRITE_SIZE, SPRITE_SIZE)
  //
  // Base parameters for different animations
  //
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
  //
  // Run animation (3 frames)
  //
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
  //
  // Jump animation - 5 frames with squash and stretch
  //
  if (animation === 'jump') {
    if (frame === 0) {
      //
      // Frame 0: Squash (pre-jump, on ground) - hero squats down LOW
      //
      // Everything pushed down, legs also SHORT
      //
      headY = 15  // Very low (idle is 6, difference = 9)
      headHeight = 5  // Shorter head
      bodyY = 20  // headY + headHeight = 15 + 5
      bodyHeight = 4  // Very short body
      leftArmY = 21
      rightArmY = 21
      //
      // Legs SHORT and wide
      //
      rightLegY = 24  // bodyY + bodyHeight = 20 + 4
      rightLegX = 18
      leftLegY = 24
      leftLegX = 11
      legHeight = 4  // Short legs! Bottom: 24+4=28 (same as idle)
    } else if (frame === 1) {
      //
      // Frame 1: Stretch (ascending, in air) - hero elongated UP
      //
      // Legs spread wider like frame 0
      //
      headY = 3  // Very high
      headHeight = 8
      bodyY = 11  // headY + headHeight = 3 + 8
      bodyHeight = 12  // Very tall body
      leftArmY = 13
      rightArmY = 13
      //
      // Legs spread wider with gap between them
      //
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
      //
      // Regular legs
      //
      rightLegY = 18  // bodyY + bodyHeight = 10 + 8
      rightLegX = 18
      leftLegY = 18
      leftLegX = 10
      legHeight = 6  // Bottom: 18+6=24 (high in frame)
    } else if (frame === 3) {
      //
      // Frame 3: Intermediate (transitioning to squash) - between normal and squash
      //
      // At very top of frame, slightly taller than before
      //
      headY = 2   // Very top
      headHeight = 7  // Between normal (8) and squash (6)
      bodyY = 9  // headY + headHeight = 2 + 7
      bodyHeight = 7  // Taller body (was 6) - +1px
      leftArmY = 10
      rightArmY = 10
      //
      // Legs slightly taller
      //
      rightLegY = 16  // bodyY + bodyHeight = 9 + 7
      rightLegX = 19
      leftLegY = 16
      leftLegX = 10
      legHeight = 6  // Taller legs (was 5) - +1px. Bottom: 16+6=22 (was 20)
    } else if (frame === 4) {
      //
      // Frame 4: Squash (descending, in air) - hero compressed DOWN
      //
      // Top stays at very top, but body is slightly taller for smoother transition
      //
      headY = 2   // Very top (same as before)
      headHeight = 6  // Slightly taller head (was 5)
      bodyY = 8  // headY + headHeight = 2 + 6
      bodyHeight = 5  // Slightly taller body (was 4)
      leftArmY = 9
      rightArmY = 9
      //
      // Legs SHORT and spread wider
      //
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
      //
      // Regular legs
      //
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
  // Black outline (universal) - pixel-perfect 1px outline
  //
  ctx.fillStyle = getHex(outlineColor)
  //
  // Head outline (8x8 inner, 10x10 outer)
  //
  ctx.fillRect(headX - 1, headY - 1, 10, 1)  // Top
  ctx.fillRect(headX - 1, headY + 8, 10, 1)  // Bottom
  ctx.fillRect(headX - 1, headY, 1, 8)  // Left
  ctx.fillRect(headX + 8, headY, 1, 8)  // Right
  //
  // Body outline (12x bodyHeight inner, 14x (bodyHeight+2) outer)
  //
  ctx.fillRect(bodyX - 1, bodyY - 1, 14, 1)  // Top
  ctx.fillRect(bodyX - 1, bodyY + bodyHeight, 14, 1)  // Bottom
  ctx.fillRect(bodyX - 1, bodyY, 1, bodyHeight)  // Left
  ctx.fillRect(bodyX + 12, bodyY, 1, bodyHeight)  // Right
  //
  // Arm outlines - don't draw while running and jumping
  //
  if (animation !== 'run' && animation !== 'jump') {
    //
    // Left arm outline (2x7 inner, 4x9 outer)
    //
    ctx.fillRect(leftArmX - 1, leftArmY - 1, 4, 1)  // Top
    ctx.fillRect(leftArmX - 1, leftArmY + 7, 4, 1)  // Bottom
    ctx.fillRect(leftArmX - 1, leftArmY, 1, 7)  // Left
    ctx.fillRect(leftArmX + 2, leftArmY, 1, 7)  // Right
    //
    // Right arm outline (2x7 inner, 4x9 outer)
    //
    ctx.fillRect(rightArmX - 1, rightArmY - 1, 4, 1)  // Top
    ctx.fillRect(rightArmX - 1, rightArmY + 7, 4, 1)  // Bottom
    ctx.fillRect(rightArmX - 1, rightArmY, 1, 7)  // Left
    ctx.fillRect(rightArmX + 2, rightArmY, 1, 7)  // Right
  }
  //
  // Leg outlines (3x legHeight inner, 5x (legHeight+2) outer)
  //
  // Left leg
  ctx.fillRect(leftLegX - 1, leftLegY - 1, 5, 1)  // Top
  ctx.fillRect(leftLegX - 1, leftLegY + legHeight, 5, 1)  // Bottom
  ctx.fillRect(leftLegX - 1, leftLegY, 1, legHeight)  // Left
  ctx.fillRect(leftLegX + 3, leftLegY, 1, legHeight)  // Right
  //
  // Right leg
  ctx.fillRect(rightLegX - 1, rightLegY - 1, 5, 1)  // Top
  ctx.fillRect(rightLegX - 1, rightLegY + legHeight, 5, 1)  // Bottom
  ctx.fillRect(rightLegX - 1, rightLegY, 1, legHeight)  // Left
  ctx.fillRect(rightLegX + 3, rightLegY, 1, legHeight)  // Right
  //
  // Head (universal body color)
  //
  ctx.fillStyle = getHex(bodyColor)
  ctx.fillRect(headX, headY, 8, 8)
  //
  // Eyes - for run and jump draw only ONE eye (side view)
  //
  ctx.fillStyle = getHex(CFG.visual.colors[type].eyeWhite)
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
  //
  // Arms - don't draw while running and jumping
  //
  if (animation !== 'run' && animation !== 'jump') {
    ctx.fillRect(leftArmX, leftArmY, 2, 7)
    ctx.fillRect(rightArmX, rightArmY, 2, 7)
  }
  //
  // Legs
  //
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

  //
  // Ensure canvas is valid before converting to data URL
  //
  if (!canvas || !ctx) {
    //
    // Fallback: return a minimal valid data URL (1x1 transparent pixel)
    //
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
  }
  
  const dataURL = canvas.toDataURL()
  //
  // Ensure data URL is valid
  //
  if (!dataURL || typeof dataURL !== 'string' || !dataURL.startsWith('data:')) {
    //
    // Fallback: return a minimal valid data URL (1x1 transparent pixel)
    //
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
  }
  
  return dataURL
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

/**
 * Apply slow motion effect
 * @param {Object} inst - Hero instance
 */
function applySlowMotion(inst) {
  const { k } = inst
  const originalTimeScale = k.timeScale ?? 1
  const slowMotionScale = 0.1
  const slowMotionDuration = 0.5
  k.timeScale = slowMotionScale
  k.wait(slowMotionDuration, () => {
    k.timeScale = originalTimeScale
  })
}

/**
 * Get particle colors for hero type
 * @param {Object} inst - Hero instance
 * @returns {Array<string>} Array of color hex strings
 */
function getParticleColors(inst) {
  const { type } = inst
  //
  // Check if we're in time section - use grayscale colors
  //
  const isTimeSection = inst.currentLevel && inst.currentLevel.startsWith('level-time.')
  
  if (isTimeSection) {
    //
    // Time section: hero uses grayscale, anti-hero uses orange/yellow
    //
    return type === HEROES.HERO
      ? ["#C0C0C0", "#808080", "#A0A0A0", "#000000"]  // Light gray shades + black
      : [CFG.visual.colors.hero.body, "#FFA500", "#FF8C00", "#000000"]  // Orange shades + black
  }
  //
  // Other sections: use colors from config
  //
  const colors = CFG.visual.colors
  return type === HEROES.HERO
    ? [colors.hero.body, colors.outline]
    : [colors.antiHero.body, colors.outline]
}

/**
 * Create sparkle particles around hero's mouth
 * @param {Object} inst - Hero instance
 */
function createMouthSparkles(inst) {
  const { k, character } = inst
  const centerX = character.pos.x
  const centerY = character.pos.y
  //
  // Create small sparkle particles
  //
  const sparkleCount = 12
  const sparkles = []
  
  for (let i = 0; i < sparkleCount; i++) {
    //
    // Position sparkles in a small area around the mouth (lower part of face)
    //
    const angle = (Math.PI * 2 * i) / sparkleCount
    const distance = 15 + Math.random() * 10
    const offsetX = Math.cos(angle) * distance
    const offsetY = 5 + Math.sin(angle) * distance * 0.5  // Biased downward (mouth area)
    //
    // Sparkle colors (bright yellow/white)
    //
    const colors = [
      k.rgb(255, 255, 200),  // Pale yellow
      k.rgb(255, 255, 255),  // White
      k.rgb(255, 240, 150),  // Light gold
      k.rgb(200, 255, 255)   // Light cyan
    ]
    const sparkleColor = colors[Math.floor(Math.random() * colors.length)]
    //
    // Create sparkle particle (small circle)
    //
    const size = 2 + Math.random() * 3
    const sparkle = k.add([
      k.circle(size),
      k.pos(centerX + offsetX, centerY + offsetY),
      k.color(sparkleColor),
      k.opacity(0.8),
      k.z(CFG.visual.zIndex.player + 1)
    ])
    //
    // Store sparkle data
    //
    sparkle.vx = (Math.random() - 0.5) * 40
    sparkle.vy = -20 - Math.random() * 30  // Move up
    sparkle.lifetime = 0
    sparkle.maxLifetime = 0.8 + Math.random() * 0.4
    sparkle.originalSize = size
    
    sparkles.push(sparkle)
  }
  //
  // Animate sparkles
  //
  const sparkleInterval = k.onUpdate(() => {
    sparkles.forEach((sparkle, index) => {
      if (!sparkle.exists()) return
      
      sparkle.lifetime += k.dt()
      //
      // Move sparkle
      //
      sparkle.pos.x += sparkle.vx * k.dt()
      sparkle.pos.y += sparkle.vy * k.dt()
      //
      // Apply upward drift and slow down
      //
      sparkle.vy -= 80 * k.dt()  // Upward acceleration
      sparkle.vx *= 0.95
      //
      // Fade out and shrink based on lifetime
      //
      const progress = sparkle.lifetime / sparkle.maxLifetime
      sparkle.opacity = 0.8 * (1 - progress)
      //
      // Twinkle effect (size pulsing)
      //
      const twinkle = Math.sin(sparkle.lifetime * 20) * 0.3 + 0.7
      //
      // Destroy when lifetime expires
      //
      if (sparkle.lifetime >= sparkle.maxLifetime) {
        k.destroy(sparkle)
      }
    })
    //
    // Clean up when all sparkles are done
    //
    if (sparkles.every(s => !s.exists())) {
      sparkleInterval.cancel()
    }
  })
}

/**
 * Create sparkle particles around hero for color change effect
 * @param {Object} inst - Hero instance
 * @param {string} color - New color (hex string)
 */
function createColorChangeSparkles(inst, color) {
  const { k, character } = inst
  const centerX = character.pos.x
  const centerY = character.pos.y
  //
  // Parse hex color to RGB
  //
  const colorValue = parseInt(color.replace('#', ''), 16)
  const r = (colorValue >> 16) & 0xFF
  const g = (colorValue >> 8) & 0xFF
  const b = colorValue & 0xFF
  //
  // Create small sparkle particles
  //
  const sparkleCount = 12
  const sparkles = []
  
  for (let i = 0; i < sparkleCount; i++) {
    //
    // Position sparkles around hero body
    //
    const angle = (Math.PI * 2 * i) / sparkleCount
    const distance = 15 + Math.random() * 10
    const offsetX = Math.cos(angle) * distance
    const offsetY = Math.sin(angle) * distance
    //
    // Sparkle colors (variations of the new color)
    //
    const colors = [
      k.rgb(Math.min(r + 50, 255), Math.min(g + 50, 255), Math.min(b + 50, 255)),  // Lighter
      k.rgb(r, g, b),  // Base color
      k.rgb(Math.max(r - 30, 0), Math.max(g - 30, 0), Math.max(b - 30, 0)),  // Darker
      k.rgb(255, 255, 255)  // White
    ]
    const sparkleColor = colors[Math.floor(Math.random() * colors.length)]
    //
    // Create sparkle particle (small circle)
    //
    const size = 2 + Math.random() * 3
    const sparkle = k.add([
      k.circle(size),
      k.pos(centerX + offsetX, centerY + offsetY),
      k.color(sparkleColor),
      k.opacity(0.8),
      k.z(CFG.visual.zIndex.player + 1)
    ])
    //
    // Store sparkle data
    //
    sparkle.vx = (Math.random() - 0.5) * 40
    sparkle.vy = -20 - Math.random() * 30  // Move up
    sparkle.lifetime = 0
    sparkle.maxLifetime = 0.8 + Math.random() * 0.4
    sparkle.originalSize = size
    
    sparkles.push(sparkle)
  }
  //
  // Animate sparkles
  //
  const sparkleInterval = k.onUpdate(() => {
    sparkles.forEach((sparkle, index) => {
      if (!sparkle.exists()) return
      
      sparkle.lifetime += k.dt()
      //
      // Move sparkle
      //
      sparkle.pos.x += sparkle.vx * k.dt()
      sparkle.pos.y += sparkle.vy * k.dt()
      //
      // Apply upward drift and slow down
      //
      sparkle.vy -= 80 * k.dt()  // Upward acceleration
      sparkle.vx *= 0.95
      //
      // Fade out and shrink based on lifetime
      //
      const progress = sparkle.lifetime / sparkle.maxLifetime
      sparkle.opacity = 0.8 * (1 - progress)
      //
      // Twinkle effect (size pulsing)
      //
      const twinkle = Math.sin(sparkle.lifetime * 20) * 0.3 + 0.7
      //
      // Destroy when lifetime expires
      //
      if (sparkle.lifetime >= sparkle.maxLifetime) {
        k.destroy(sparkle)
      }
    })
    //
    // Clean up when all sparkles are done
    //
    if (sparkles.every(s => !s.exists())) {
      sparkleInterval.cancel()
    }
  })
}

/**
 * Create body particles for death explosion
 * @param {Object} inst - Hero instance
 * @param {number} centerX - Center X position
 * @param {number} centerY - Center Y position
 * @returns {Array} Array of particle objects
 */
function createBodyParticles(inst, centerX, centerY) {
  const { k } = inst
  const particleColors = getParticleColors(inst)
  const particleCount = 16
  const particles = []
  for (let i = 0; i < particleCount; i++) {
    const angle = (Math.PI * 2 * i) / particleCount + k.rand(-0.4, 0.4)
    const speed = k.rand(150, 350)
    const pSize = k.rand(4, 8)
    const oSize = pSize + 4
    const colorHex = k.choose(particleColors)
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
      k.z(CFG.visual.zIndex.playerShadow),
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
            color: getRGB(k, CFG.visual.colors.outline)
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
    // Set initial velocity
    //
    body.vel.x = Math.cos(angle) * speed
    body.vel.y = Math.sin(angle) * speed
    particle.lifetime = 0
    particle.rotSpeed = k.rand(-540, 540)
    particle.maxLifetime = 2.0
    particle.body = body
    //
    // Update particle
    //
    particle.onUpdate(() => {
      particle.lifetime += k.dt()
      particle.pos = particle.body.pos
      particle.angle = particle.body.angle
      particle.body.vel.x *= 0.98
      particle.body.angle += particle.rotSpeed * k.dt()
      //
      // Fade out over lifetime
      //
      const fadeStartTime = 1.0
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
    particles.push(particle)
  }
  return particles
}

/**
 * Create eye particles for death explosion
 * @param {Object} inst - Hero instance
 * @param {number} centerX - Center X position
 * @param {number} centerY - Center Y position
 * @returns {Array} Array of eye particle objects
 */
function createEyeParticles(inst, centerX, centerY) {
  const { k } = inst
  const eyeWhiteSize = 3 * HERO_SCALE
  const pupilSize = 1 * HERO_SCALE
  const eyeAngles = [k.rand(0, Math.PI * 2), k.rand(0, Math.PI * 2)]
  const particles = []
  //
  // Check if we're in time section for grayscale eyes
  //
  const isTimeSection = inst.currentLevel && inst.currentLevel.startsWith('level-time.')
  const eyeWhiteColor = isTimeSection ? [200, 200, 200] : [255, 255, 255]  // Light gray or white
  const pupilColor = isTimeSection ? [100, 100, 100] : [0, 0, 0]  // Dark gray or black
  
  for (let i = 0; i < 2; i++) {
    const angle = eyeAngles[i]
    const speed = k.rand(150, 350)
    //
    // Eye background (white or light gray)
    //
    const eyeWhite = k.add([
      k.rect(eyeWhiteSize, eyeWhiteSize),
      k.pos(centerX, centerY),
      k.color(eyeWhiteColor[0], eyeWhiteColor[1], eyeWhiteColor[2]),
      k.anchor("center"),
      k.z(CFG.visual.zIndex.playerAbove),
      k.area(),
      k.body()
    ])
    //
    // Pupil (black or dark gray)
    //
    const pupil = eyeWhite.add([
      k.rect(pupilSize, pupilSize),
      k.pos(0, 0),
      k.color(pupilColor[0], pupilColor[1], pupilColor[2]),
      k.anchor("center"),
      k.z(CFG.visual.zIndex.eyePupil)
    ])
    //
    // Set initial velocity
    //
    eyeWhite.vel.x = Math.cos(angle) * speed
    eyeWhite.vel.y = Math.sin(angle) * speed
    eyeWhite.lifetime = 0
    eyeWhite.maxLifetime = 2.0
    //
    // Update eye
    //
    eyeWhite.onUpdate(() => {
      eyeWhite.lifetime += k.dt()
      eyeWhite.vel.x *= 0.98
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
    particles.push(eyeWhite)
  }
  return particles
}
//
// Helper function to calculate particle dimensions based on shape type
//
function getParticleDimensions(k, shapeType, particleSize, scale) {
  const outlineSize = particleSize + 1
  let pWidth, pHeight, oWidth, oHeight

  if (shapeType === 'square') {
    pWidth = pHeight = particleSize * scale
    oWidth = oHeight = outlineSize * scale
  } else if (shapeType === 'rect_h') {
    pWidth = particleSize * scale * k.rand(1.3, 1.8)
    pHeight = particleSize * scale * k.rand(0.6, 0.8)
    oWidth = pWidth + 1 * scale
    oHeight = pHeight + 1 * scale
  } else if (shapeType === 'rect_v') {
    pWidth = particleSize * scale * k.rand(0.6, 0.8)
    pHeight = particleSize * scale * k.rand(1.3, 1.8)
    oWidth = pWidth + 1 * scale
    oHeight = pHeight + 1 * scale
  } else {
    pWidth = pHeight = particleSize * scale * k.rand(0.7, 0.9)
    oWidth = oHeight = pWidth + 1 * scale
  }

  return { pWidth, pHeight, oWidth, oHeight }
}
//
// Helper function to create a particle with outline
//
function createParticleWithOutline(k, x, y, colorHex, shapeType, rotation, particleSize, scale) {
  const [r, g, b] = parseHex(colorHex)
  const { pWidth, pHeight, oWidth, oHeight } = getParticleDimensions(k, shapeType, particleSize, scale)

  return k.add([
    k.pos(x, y),
    k.anchor("center"),
    k.rotate(rotation),
    k.z(CFG.visual.zIndex.assemblyParticles),
    {
      draw() {
        //
        // Draw outline first (behind)
        //
        k.drawRect({
          width: oWidth,
          height: oHeight,
          pos: k.vec2(0, 0),
          anchor: "center",
          color: getRGB(k, CFG.visual.colors.outline)
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
}
