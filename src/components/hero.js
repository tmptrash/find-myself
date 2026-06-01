import { CFG } from '../cfg.js'
import { getHex, isAnyKeyDown, onPhysicalKeyPress, getColor, parseHex, getRGB, toCanvas } from '../utils/helper.js'
import * as TouchControls from '../utils/touch-controls.js'
import * as Sound from '../utils/sound.js'
import { createLevelTransition, getNextLevel } from '../utils/transition.js'
import { set } from '../utils/progress.js'
//
// Sprite rendering: 96x96 at scale 1 for crisp 1px outlines
//
const SPRITE_SIZE = 96
const RENDER_SCALE = 1
//
// Collision box parameters (in 96x96 local sprite space)
//
const COLLISION_WIDTH = 30
const COLLISION_HEIGHT = 69
const COLLISION_OFFSET_X = 0
//
// Shift collision down so bottom aligns with sprite feet.
// Top edge lowered to avoid collision above hero's head.
//
const COLLISION_OFFSET_Y = 3
//
// Hero parameters — scale 1 since sprites are already at display resolution
//
const HERO_SCALE = 1
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
// Touch section completion tint — steel teal matching the anti-hero
// body colour used across touch levels (`#5A8898`).
//
const TOUCH_SECTION_HERO_COLOR = CFG.visual.colors.sections.touch.body
//
// Landing dust particles
//

const DUST_PARTICLE_COUNT = 6
const DUST_PARTICLE_SIZE = 6
const DUST_PARTICLE_SPEED = 80
const DUST_PARTICLE_LIFETIME = 0.4
//
// Footprint trail: small fading marks left where the hero steps
//
const FOOTPRINT_LIFETIME = 2.0
const FOOTPRINT_RADIUS_X = 5
const FOOTPRINT_RADIUS_Y = 2
const FOOTPRINT_OFFSET_X = 4
const FOOTPRINT_OFFSET_Y = -1
const FOOTPRINT_COLOR_R = 35
const FOOTPRINT_COLOR_G = 25
const FOOTPRINT_COLOR_B = 18
const FOOTPRINT_OPACITY_START = 0.55
const FOOTPRINT_Z = 9
//
// Idle vocalization: notes drift from the hero's mouth while standing still
// and a soft humming/whistling note plays in the background. Disabled by
// passing `idleVocalization: null` (used by scenes that already render
// another mouth effect, e.g. cold breath in winter levels).
//
const IDLE_NOTE_OFFSET_Y = -28          // Mouth height above hero center (pixels)
const IDLE_NOTE_OFFSET_X = 4            // Forward offset in the facing direction
const IDLE_NOTE_LIFETIME = 2.2          // How long each note stays visible (seconds)
const IDLE_NOTE_RISE_SPEED = 28         // Vertical drift speed (px/s, upward)
const IDLE_NOTE_DRIFT_AMPLITUDE = 16    // Horizontal sway amplitude (px)
const IDLE_NOTE_DRIFT_FREQ = 1.4        // Horizontal sway frequency (Hz)
const IDLE_NOTE_FONT_SIZE = 22          // Glyph size for drawText
const IDLE_NOTE_Z = 9999                // Render notes in front of every other object
const IDLE_NOTE_EMIT_MIN = 0.6          // Min seconds between note particles
const IDLE_NOTE_EMIT_MAX = 1.6          // Max seconds between note particles
//
// Glyph set per vocalization mode. The 'sleeping' mode (default for the
// anti-hero) shows soft "z-Z" letters to imply quiet snoring instead of
// musical singing.
//
const IDLE_NOTE_GLYPHS = {
  humming: ['♪', '♫', '♩', '♬'],
  whistling: ['♪', '♫', '♩', '♬'],
  sleeping: ['z', 'Z', 'z']
}
//
// Vocalization only starts after the hero has been standing still for
// this many seconds — keeps the audio quiet during normal play and only
// kicks in when the player visibly pauses.
//
const IDLE_VOCALIZATION_DELAY = 2.0
//
// Pentatonic scale keeps the hum melodious even with a random note pick.
// Only the hero is heard — the anti-hero produces visual notes but stays
// silent so the soundscape never feels crowded by two voices.
//
const IDLE_HUM_SCALE_HERO = [523.25, 587.33, 659.25, 784.0, 880.0]
//
// Module-level kill switch for idle vocalization. Toggled from the scene
// transition code so the menu hero stops emitting notes while the
// pre-level overlay is on screen (notes are drawn at a very high z and
// would otherwise float over the subtitle text).
//
let idleVocalizationSuppressed = false
//
// Death animation timing
//
const DEATH_ANIMATION_DURATION = 0.4
const DEATH_PARTICLE_POINTS = 20
//
// Corner radii for rounded body parts — tuned for smooth cartoon look at 96px
//
const HEAD_CORNER_RADIUS = 12
const ARM_CORNER_RADIUS = 4
const LEG_CORNER_RADIUS = 4
//
// Character width (head + body have same width, no shoulder bulge in new design)
//
const CHAR_WIDTH = 30
//
// Arm dimensions: each arm is exactly half of a full leg pill, cut vertically.
// ARM_HALF_W is the fill half-width (half of leg fill width 9, rounded up).
// ARM_H equals the default leg height so proportions match perfectly.
//
const ARM_HALF_W = 5
const ARM_H = 28
//
// Eye geometry constants (all in 96px sprite coordinates)
//
const EYE_RING_RADIUS = 5
const EYE_WHITE_RADIUS = 4
const PUPIL_RADIUS = 2
const EYE_OFFSET_X_LEFT = 9
const EYE_OFFSET_X_RIGHT = 21
const EYE_OFFSET_Y = 9
const EYE_PUPIL_SHIFT = 2
const PUPIL_SIDE_SHIFT = 2

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
    addWatch = false,      // If true, draw small watch on right wrist (requires addArms)
    outlineOnly = false,   // If true, draw only outline (no body fill)
    hitboxPadding = 0      // Additional padding around collision box (for menu hover/click)
  } = config
  //
  // Idle vocalization defaults: the hero whistles a soft tune ('humming'),
  // the anti-hero shows quiet "z-Z" sleeping glyphs without sound. Scenes
  // can override by passing an explicit `idleVocalization` (use `null` to
  // disable entirely — useful when another mouth effect like cold breath
  // is already rendered).
  //
  const defaultVocalization = type === HEROES.ANTIHERO ? 'sleeping' : 'humming'
  const idleVocalization = config.idleVocalization !== undefined ? config.idleVocalization : defaultVocalization

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
      addWatch,
      outlineOnly,
      character: null  // Marker to indicate this is an inst-like object
    })
  } catch (error) {
    console.error('Failed to load hero sprites:', error)
  }
  //
  // Generate sprite prefix based on customization (colors already have # removed)
  //
  const spritePrefix = `${type}_${effectiveBodyColor}_${effectiveOutlineColor}${addMouth ? '_mouth' : ''}${addArms ? '_arms' : ''}${addWatch ? '_watch' : ''}${outlineOnly ? '_outline' : ''}`
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
        addArms,
        addWatch,
        outlineOnly
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
        spriteComponent = k.rect(SPRITE_SIZE * RENDER_SCALE, SPRITE_SIZE * RENDER_SCALE)
      }
    } catch (fallbackError) {
      //
      // If everything fails, use rectangle placeholder
      //
      spriteComponent = k.rect(SPRITE_SIZE * RENDER_SCALE, SPRITE_SIZE * RENDER_SCALE)
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
    isStatic,
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
    crouchTimer: 0,   // Remaining time the hero is forced into the squat pose
    isCrouching: false, // True while crouchTimer > 0 and hero is grounded
    eyeOffsetX: 0,
    eyeOffsetY: 0,
    targetEyeX: 0,
    targetEyeY: 0,
    eyeTimer: 0,
    currentEyeSprite: null,
    lookAtPos: null,
    isAnnihilating: false,
    isDying: false,
    isSpawned: false,   // Flag to prevent controls before spawn completes
    invulnerabilityTimer: 0,  // Timer for spawn invulnerability
    isInvulnerable: false,  // Flag for spawn invulnerability
    controlsReversed: false,  // Flag for control inversion (time section level 3)
    controlsDisabled: false,  // Flag to temporarily disable controls during zone transitions
    footprints: [],          // Trail of footprints left by walking, fade out over FOOTPRINT_LIFETIME
    lastFootprintFoot: 1,    // Alternates between -1 (left foot) and +1 (right foot)
    //
    // Idle vocalization state: notes drift up from the mouth and a soft
    // humming/whistling sound plays while the hero stands still.
    //
    idleVocalization,
    idleNotes: [],
    idleNoteEmitTimer: IDLE_NOTE_EMIT_MIN + Math.random() * (IDLE_NOTE_EMIT_MAX - IDLE_NOTE_EMIT_MIN),
    idleStillTime: 0
  }
  //
  // Check ground touch through collisions
  //
  character.onCollide(CFG.game.platformName, () => onCollisionPlatform(inst))
  character.onUpdate(() => onUpdate(inst))
  controllable && setupControls(inst)
  antiHero && character.onCollide(ANTIHERO_TAG, () => onAnnihilationCollide(inst))
  //
  // Footprint renderer: a single fixed entity that draws and ages footprints
  // for this hero. Drawn behind the player so prints sit on the ground.
  //
  k.add([
    k.z(FOOTPRINT_Z),
    {
      update() {
        onUpdateFootprints(inst)
      },
      draw() {
        drawFootprints(k, inst)
      }
    }
  ])
  //
  // Idle vocalization renderer: drifts music notes above the hero's mouth.
  // Drawn slightly above the player (z = IDLE_NOTE_Z) so notes never hide
  // behind the sprite while it animates.
  //
  k.add([
    k.z(IDLE_NOTE_Z),
    {
      update() {
        onUpdateIdleNotes(inst)
      },
      draw() {
        drawIdleNotes(k, inst)
      }
    }
  ])

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
 * @param {boolean} [addWatch=false] - Add watch on right wrist
 */
export function loadHeroSprites(inst, type = null, bodyColor = null, outlineColor = null, addMouth = false, addArms = false, addWatch = false) {
  //
  // Determine if called with inst or individual parameters
  //
  let k, heroType, color, outline, mouth, arms, watch, hollow

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
    watch = inst.addWatch || false
    hollow = inst.outlineOnly || false
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
    watch = addWatch
    hollow = false
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
  const prefix = `${heroType}_${bodyColorForPrefix}_${outlineColorForPrefix}${mouth ? '_mouth' : ''}${arms ? '_arms' : ''}${watch ? '_watch' : ''}${hollow ? '_outline' : ''}`
  //
  // Skip generation if sprites for this configuration are already in the asset registry.
  //
  try { if (k.getSprite(`${prefix}_0_0`)) return } catch (e) {}
  //
  // Load all eye variants (9 positions) for idle animation
  //
  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      const spriteName = `${prefix}_${x}_${y}`
      try {
        const spriteData = createFrame(heroType, 'idle', 0, x, y, effectiveBodyColor, effectiveOutlineColor, mouth, arms, hollow, watch)
        //
        // createFrame now returns an HTMLCanvasElement (was a data URL string).
        // Ensure we got a valid sprite source before passing to loadSprite.
        //
        if (spriteData) {
          try {
            k.loadSprite(spriteName, spriteData)
            spriteData.width = 0
            spriteData.height = 0
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
      const spriteData = createFrame(heroType, 'jump', frame, 0, 0, effectiveBodyColor, effectiveOutlineColor, mouth, arms, hollow, watch)
      if (spriteData) {
        try {
          k.loadSprite(`${prefix}-jump-${frame}`, spriteData)
          spriteData.width = 0
          spriteData.height = 0
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
      const spriteData = createFrame(heroType, 'run', frame, 0, 0, effectiveBodyColor, effectiveOutlineColor, mouth, arms, hollow, watch)
      if (spriteData) {
        try {
          k.loadSprite(`${prefix}-run-${frame}`, spriteData)
          spriteData.width = 0
          spriteData.height = 0
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
 * Sets a world position for the hero to look at. When set, eyes
 * track this position instead of wandering randomly.
 * Pass null to resume random eye movement.
 * @param {Object} inst - Hero instance
 * @param {Object|null} pos - { x, y } world position or null
 */
export function setLookAtPos(inst, pos) {
  inst.lookAtPos = pos
}

/**
 * Globally suppresses idle vocalization (visual notes + whistle sounds)
 * for every hero/anti-hero instance. Used by the pre-level transition
 * overlay so the menu hero's notes don't bleed in front of the subtitle.
 */
export function suppressIdleVocalization() {
  idleVocalizationSuppressed = true
}

/**
 * Re-enables idle vocalization after a previous suppressIdleVocalization()
 * call. Pre-existing per-instance settings (idleVocalization: null) are
 * unaffected — only the module-level kill switch is released.
 */
export function unsuppressIdleVocalization() {
  idleVocalizationSuppressed = false
}

/**
 * Forces the hero into the squat (jump-frame-0) pose for a short duration.
 * Used to make the hero visibly cower when something startles him, e.g. a
 * bug crawling onto his feet. Only affects controllable, grounded heroes
 * and is suppressed while annihilating or dying.
 * @param {Object} inst - Hero instance
 * @param {number} duration - Crouch hold time in seconds
 */
export function crouch(inst, duration = 0.4) {
  if (!inst || inst.isAnnihilating || inst.isDying) return
  if (!inst.character?.exists?.()) return
  //
  // Extend existing crouch instead of restarting, so repeated bug taps
  // keep the pose smooth.
  //
  inst.crouchTimer = Math.max(inst.crouchTimer || 0, duration)
  inst.isCrouching = true
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
  // Character is approximately SPRITE_SIZE x RENDER_SCALE pixels
  //
  const charSize = SPRITE_SIZE * RENDER_SCALE
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
        // Restore original position (body may have fallen during assembly)
        //
        character.pos.x = x
        character.pos.y = y
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
 * Create particles around hero when a new body part is added
 * @param {Object} inst - Hero instance
 */
function createBodyPartParticles(inst) {
  const k = inst.k
  const heroX = inst.character.pos.x
  const heroY = inst.character.pos.y
  const particleCount = 12
  const bodyColor = inst.bodyColor || CFG.visual.colors.hero.body
  //
  // Create heart particles flying outward (hero body color with black outline)
  //
  for (let i = 0; i < particleCount; i++) {
    const angle = (Math.PI * 2 * i) / particleCount
    const speed = 80 + Math.random() * 40
    const lifetime = 0.6 + Math.random() * 0.4
    const heartSize = 20 + Math.random() * 10
    //
    // Create black outline hearts (8 directions)
    //
    const outlineOffset = 1.5
    const outlineOffsets = [
      [-outlineOffset, -outlineOffset],
      [0, -outlineOffset],
      [outlineOffset, -outlineOffset],
      [-outlineOffset, 0],
      [outlineOffset, 0],
      [-outlineOffset, outlineOffset],
      [0, outlineOffset],
      [outlineOffset, outlineOffset]
    ]
    
    outlineOffsets.forEach(([dx, dy]) => {
      const outlineParticle = k.add([
        k.text('♥', { size: heartSize }),
        k.pos(heroX + dx, heroY + dy),
        k.color(0, 0, 0),
        k.opacity(1),
        k.z(50)
      ])
      //
      // Animate outline particle
      //
      const startTime = k.time()
      outlineParticle.onUpdate(() => {
        const elapsed = k.time() - startTime
        if (elapsed > lifetime) {
          k.destroy(outlineParticle)
          return
        }
        outlineParticle.pos.x += Math.cos(angle) * speed * k.dt()
        outlineParticle.pos.y += Math.sin(angle) * speed * k.dt()
        outlineParticle.opacity = 1 - (elapsed / lifetime)
      })
    })
    //
    // Create main colored heart
    //
    const colorClean = String(bodyColor).replace('#', '')
    const r = parseInt(colorClean.substring(0, 2), 16)
    const g = parseInt(colorClean.substring(2, 4), 16)
    const b = parseInt(colorClean.substring(4, 6), 16)
    
    const particle = k.add([
      k.text('♥', { size: heartSize }),
      k.pos(heroX, heroY),
      k.color(r, g, b),
      k.opacity(1),
      k.z(51)
    ])
    //
    // Animate particle outward with fade
    //
    const startTime = k.time()
    particle.onUpdate(() => {
      const elapsed = k.time() - startTime
      if (elapsed > lifetime) {
        k.destroy(particle)
        return
      }
      particle.pos.x += Math.cos(angle) * speed * k.dt()
      particle.pos.y += Math.sin(angle) * speed * k.dt()
      particle.opacity = 1 - (elapsed / lifetime)
    })
  }
}

/**
 * Update character animation and state
 * @param {Object} inst - Hero instance
 */
function onUpdate(inst) {
  //
  // Virtual jump button (touch devices)
  //
  TouchControls.processVirtualJump()
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
    let isMovingLeft = false
    let isMovingRight = false
    if (TouchControls.needsTouchControls()) {
      isMovingLeft = TouchControls.isMoveLeftHeld() || isAnyKeyDown(inst.k, CFG.controls.moveLeft)
      isMovingRight = TouchControls.isMoveRightHeld() || isAnyKeyDown(inst.k, CFG.controls.moveRight)
    } else {
      isMovingLeft = isAnyKeyDown(inst.k, CFG.controls.moveLeft)
      isMovingRight = isAnyKeyDown(inst.k, CFG.controls.moveRight)
    }
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
  // Determine movement state; requires spawn so keys don't trigger sounds before hero appears
  //
  const isMoving = inst.isSpawned && !inst.controlsDisabled && (
    TouchControls.needsTouchControls()
      ? (TouchControls.isMoveLeftHeld() || TouchControls.isMoveRightHeld()
        || isAnyKeyDown(inst.k, CFG.controls.moveLeft) || isAnyKeyDown(inst.k, CFG.controls.moveRight))
      : (isAnyKeyDown(inst.k, CFG.controls.moveLeft) || isAnyKeyDown(inst.k, CFG.controls.moveRight))
  )
  //
  // Check if character is grounded (use isGrounded method or check if falling/jumping)
  //
  const isGrounded = inst.character.isGrounded()
  //
  // Forced crouch pose (e.g. bug touch reaction). Holds the hero in the
  // squat sprite for a short duration and blocks the rest of the animation
  // pipeline so running/idle frames don't immediately override it.
  //
  if (inst.crouchTimer > 0 && isGrounded) {
    inst.crouchTimer -= inst.k.dt()
    if (inst.crouchTimer <= 0) {
      inst.crouchTimer = 0
      inst.isCrouching = false
    } else {
      inst.isCrouching = true
      const prefix = inst.spritePrefix || inst.type
      if (inst.jumpFrame !== 0) {
        inst.jumpFrame = 0
        inst.character.use(inst.k.sprite(`${prefix}-jump-0`))
      }
      inst.character.flipX = inst.direction === -1
      return
    }
  }
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
      // Create dust particles when starting to run (skip in water)
      //
      !inst.suppressDust && createRunStartDust(inst, inst.direction)
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
      // Step sound + footprint on frame 0 (when foot touches ground)
      //
      if (inst.runFrame === 0) {
        inst.sfx && Sound.playStepSound(inst.sfx, inst.currentLevel)
        spawnFootprint(inst)
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
  // Eye animation: track lookAtPos if set, otherwise random wander
  //
  if (inst.lookAtPos) {
    const heroPos = inst.character?.pos
    if (heroPos) {
      const dx = inst.lookAtPos.x - heroPos.x
      const dy = inst.lookAtPos.y - heroPos.y
      inst.targetEyeX = dx > 20 ? 1 : dx < -20 ? -1 : 0
      inst.targetEyeY = dy > 20 ? 1 : dy < -20 ? -1 : 0
    }
  } else {
    inst.eyeTimer += inst.k.dt()
    if (inst.eyeTimer > inst.k.rand(EYE_ANIM_MIN_DELAY, EYE_ANIM_MAX_DELAY)) {
      inst.targetEyeX = inst.k.choose([-1, 0, 1])
      inst.targetEyeY = inst.k.choose([-1, 0, 1])
      inst.eyeTimer = 0
    }
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
  // Jump action handler
  //
  const jumpAction = () => {
    if (!inst.isSpawned || inst.isAnnihilating || inst.controlsDisabled) return
    if (inst.canJump && !inst.isSquashing) {
      inst.isSquashing = true
      inst.squashTimer = 0
      inst.jumpFrame = 0
      const prefix = inst.spritePrefix || inst.type
      inst.character.use(inst.k.sprite(`${prefix}-jump-0`))
      inst.sfx && Sound.playJumpSound(inst.sfx, inst.currentLevel)
    }
  }
  //
  // Register jump keys (Kaplay key names + physical key codes for non-English layouts)
  //
  CFG.controls.jump.forEach(key => {
    if (key.length > 1 && key.startsWith('Key')) {
      onPhysicalKeyPress(key, jumpAction)
    } else {
      inst.k.onKeyPress(key, jumpAction)
    }
  })
  TouchControls.registerVirtualJumpHandler(jumpAction)
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
 * Spawns a small footprint at the hero's current foot position.
 * Footprints alternate left/right and fade out over FOOTPRINT_LIFETIME.
 * @param {Object} inst - Hero instance
 */
function spawnFootprint(inst) {
  if (!inst.character?.pos) return
  const footY = inst.character.pos.y + (COLLISION_HEIGHT / 2) + COLLISION_OFFSET_Y + FOOTPRINT_OFFSET_Y
  //
  // Alternate left/right foot offset so footprints zigzag slightly
  //
  inst.lastFootprintFoot = -inst.lastFootprintFoot
  const footX = inst.character.pos.x + inst.lastFootprintFoot * FOOTPRINT_OFFSET_X
  inst.footprints.push({
    x: footX,
    y: footY,
    life: FOOTPRINT_LIFETIME
  })
}
/**
 * Ages footprints over time and removes expired entries.
 * @param {Object} inst - Hero instance
 */
function onUpdateFootprints(inst) {
  const dt = inst.k.dt()
  const arr = inst.footprints
  for (let i = arr.length - 1; i >= 0; i--) {
    arr[i].life -= dt
    if (arr[i].life <= 0) arr.splice(i, 1)
  }
}
/**
 * Draws all live footprints for this hero as small fading dark ovals.
 * @param {Object} k - Kaplay instance
 * @param {Object} inst - Hero instance
 */
function drawFootprints(k, inst) {
  for (const fp of inst.footprints) {
    const alpha = (fp.life / FOOTPRINT_LIFETIME) * FOOTPRINT_OPACITY_START
    k.drawEllipse({
      pos: k.vec2(fp.x, fp.y),
      radiusX: FOOTPRINT_RADIUS_X,
      radiusY: FOOTPRINT_RADIUS_Y,
      color: k.rgb(FOOTPRINT_COLOR_R, FOOTPRINT_COLOR_G, FOOTPRINT_COLOR_B),
      opacity: alpha
    })
  }
}

//
// True when the hero/anti-hero meets all conditions to emit idle notes
// and (for the hero only) the whistle sound. The sfx gate is intentionally
// lenient so the anti-hero still shows visual notes even when no audio
// instance is passed in. Decorative (non-controllable / static) characters
// — e.g. the central hero on the main menu — bypass the spawn/ground
// checks so they can vocalize without needing a level scene around them.
//
function canVocalize(inst) {
  if (idleVocalizationSuppressed) return false
  if (!inst.idleVocalization) return false
  if (!inst.character?.exists?.()) return false
  if (inst.isAnnihilating || inst.isDying) return false
  if (inst.controlsDisabled) return false
  if (inst.isRunning || inst.wasJumping) return false
  const isDecorative = inst.controllable === false || inst.isStatic === true
  if (!isDecorative) {
    if (!inst.isSpawned) return false
    if (!inst.character.isGrounded?.()) return false
  }
  return true
}

//
// Updates floating note particles and schedules new emissions + hum sounds.
// Run every frame; cheap when no notes are alive and vocalization is off.
//
function onUpdateIdleNotes(inst) {
  const dt = inst.k.dt()
  const active = canVocalize(inst)
  //
  // Track how long the hero has been continuously idle. Moving, jumping,
  // dying, etc. all reset the timer so the singing only starts after a
  // visible pause.
  //
  if (active) {
    inst.idleStillTime += dt
  } else {
    inst.idleStillTime = 0
  }
  //
  // Always age + drift existing notes so they fade out naturally if the
  // hero starts moving mid-emission.
  //
  for (const note of inst.idleNotes) {
    note.age += dt
    note.x = note.baseX + Math.sin((note.age + note.driftPhase) * IDLE_NOTE_DRIFT_FREQ * Math.PI * 2) * IDLE_NOTE_DRIFT_AMPLITUDE * (note.age / IDLE_NOTE_LIFETIME)
    note.y -= IDLE_NOTE_RISE_SPEED * dt
  }
  inst.idleNotes = inst.idleNotes.filter(n => n.age < IDLE_NOTE_LIFETIME)
  //
  // Only emit fresh notes/sounds after the idle warm-up has elapsed.
  //
  if (!active) return
  if (inst.idleStillTime < IDLE_VOCALIZATION_DELAY) return
  //
  // Single timer drives both the visual glyph and (for the hero) the
  // whistle note, so every note the player sees coincides with the
  // matching pitch in the audio.
  //
  inst.idleNoteEmitTimer -= dt
  if (inst.idleNoteEmitTimer <= 0) {
    spawnIdleNote(inst)
    playIdleVocalNote(inst)
    inst.idleNoteEmitTimer = IDLE_NOTE_EMIT_MIN + Math.random() * (IDLE_NOTE_EMIT_MAX - IDLE_NOTE_EMIT_MIN)
  }
}

//
// Pushes a new note particle near the hero's mouth, biased forward in the
// facing direction so the notes appear to flow from the lips.
//
function spawnIdleNote(inst) {
  const ch = inst.character
  if (!ch?.pos) return
  const mouthX = ch.pos.x + IDLE_NOTE_OFFSET_X * inst.direction
  const mouthY = ch.pos.y + IDLE_NOTE_OFFSET_Y
  const glyphs = IDLE_NOTE_GLYPHS[inst.idleVocalization] || IDLE_NOTE_GLYPHS.humming
  inst.idleNotes.push({
    baseX: mouthX,
    x: mouthX,
    y: mouthY,
    age: 0,
    driftPhase: Math.random(),
    glyph: glyphs[Math.floor(Math.random() * glyphs.length)],
    angle: (Math.random() - 0.5) * 18
  })
}

//
// Picks a pleasant pitch from the hero's scale and triggers a soft whistle
// note through the shared sound system. The anti-hero and any "sleeping"
// vocalization stay silent on purpose — only the hero is heard, while
// other characters still get visual glyphs for atmosphere.
//
function playIdleVocalNote(inst) {
  if (!inst.sfx) return
  if (inst.type === HEROES.ANTIHERO) return
  if (inst.idleVocalization === 'sleeping') return
  const frequency = IDLE_HUM_SCALE_HERO[Math.floor(Math.random() * IDLE_HUM_SCALE_HERO.length)]
  Sound.playIdleHumNote(inst.sfx, {
    frequency,
    duration: 0.45,
    whistleMode: true
  })
}

//
// Renders the live note glyphs above the hero. Notes fade from full opacity
// at birth to zero just before they expire.
//
function drawIdleNotes(k, inst) {
  if (!inst.idleNotes?.length) return
  const fontName = CFG?.visual?.fonts?.regularFull
  for (const note of inst.idleNotes) {
    const fade = 1 - note.age / IDLE_NOTE_LIFETIME
    const alpha = Math.max(0, Math.min(1, fade))
    k.drawText({
      text: note.glyph,
      pos: k.vec2(note.x, note.y),
      size: IDLE_NOTE_FONT_SIZE,
      anchor: 'center',
      color: k.rgb(255, 255, 255),
      opacity: alpha * 0.85,
      angle: note.angle,
      font: fontName
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
    //
    // Skip dust particles when suppressDust is set (e.g. landing in water)
    //
    !inst.suppressDust && createLandingDust(inst)
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
  //
  // Touch level 3: hero grows arms when meeting the anti-hero
  //
  inst.currentLevel === 'level-touch.3' && !inst.addArms && applyHeroArms(inst)

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
            // STEP 7: Check if this is the last level of word, touch or time section
            //
            const nextLevel = getNextLevel(inst.currentLevel)
            const isLastWordLevel = inst.currentLevel === 'level-word.4' && nextLevel === 'word-complete'
            const isLastTimeLevel = inst.currentLevel === 'level-time.3' && nextLevel === 'time-complete'
            
            if (isLastWordLevel && (!inst.addMouth || inst.bodyColor !== '#DC143C')) {
              //
              // Special sequence for completing word section: add mouth and red color before transition
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
                  // Update inst: add mouth and red color (DC143C) before loading sprites
                  //
                  inst.addMouth = true
                  const redColor = '#DC143C'
                  inst.bodyColor = redColor
                  const bodyColorClean = String(redColor).replace('#', '')
                  const outlineColorClean = String(CFG.visual.colors.outline).replace('#', '')
                  inst.spritePrefix = `${inst.type}_${bodyColorClean}_${outlineColorClean}_mouth`
                    //
                    // Create visual effect (particles around hero)
                    //
                    createBodyPartParticles(inst)
                    //
                    // Reload sprites with mouth
                    //
                    loadHeroSprites({
                      k: inst.k,
                      type: inst.type,
                      bodyColor: redColor,
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
                          set('lastLevel', nextLevel)
                        }
                        inst.character.hidden = true
                        createLevelTransition(k, inst.currentLevel)
                      })
                    })
                  })
                })
              })
            } else if (inst.currentLevel === 'level-touch.3' && nextLevel === 'touch-complete' && (!inst.addArms || inst.bodyColor !== TOUCH_SECTION_HERO_COLOR)) {
              //
              // Special sequence for completing touch section: change hero color to touch anti-hero teal and add arms
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
                const FADE_DURATION = 1.0
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
                // Play transformation sound after fade completes
                //
                k.wait(1.0, () => {
                  sfx && Sound.playMouthSound(sfx)
                  //
                  // Update inst: change to touch section color and add arms
                  //
                  const touchColor = TOUCH_SECTION_HERO_COLOR
                  inst.bodyColor = touchColor
                  inst.addArms = true
                  const touchColorClean = String(touchColor).replace('#', '')
                  const outlineColorClean = String(CFG.visual.colors.outline).replace('#', '')
                  const hasMouth = inst.addMouth
                  inst.spritePrefix = `${inst.type}_${touchColorClean}_${outlineColorClean}${hasMouth ? '_mouth' : ''}_arms`
                  //
                  // Create visual effect (particles around hero)
                  //
                  createBodyPartParticles(inst)
                  //
                  // Reload sprites with touch section color and arms
                  //
                  loadHeroSprites({
                    k: inst.k,
                    type: inst.type,
                    bodyColor: touchColor,
                    outlineColor: CFG.visual.colors.outline,
                    addMouth: hasMouth,
                    addArms: true,
                    character: null
                  })
                  //
                  // Wait a frame to ensure sprites are loaded, then update character sprite
                  //
                  k.wait(0.05, () => {
                    //
                    // Use getSpriteName to get the correct sprite with pink color and arms
                    //
                    const newSpriteName = getSpriteName(inst, 0, 0)
                    //
                    // Update character sprite to show pink color with arms
                    //
                    try {
                      player.use(k.sprite(newSpriteName))
                    } catch (error) {
                      // Sprite load failed, continue with transition
                    }
                    //
                    // Play transformation sound
                    //
                    sfx && Sound.playMouthSound(sfx)
                    //
                    // Create sparkle particles around hero (pink particles)
                    //
                    createColorChangeSparkles(inst, touchColor)
                    //
                    // Pause to show the transformed hero
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
                        set('lastLevel', nextLevel)
                      }
                      inst.character.hidden = true
                      //
                      // Small pause before transitioning to touch-complete
                      //
                      k.wait(0.5, () => {
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
                        set('lastLevel', nextLevel)
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
                    set('lastLevel', nextLevel)
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
 * @param {boolean} [outlineOnly=false] - Draw only outline (no body fill)
 * @param {boolean} [addWatch=false] - Draw small watch on right wrist (requires addArms)
 * @returns {string} Base64 encoded sprite data
 */
function createFrame(type = HEROES.HERO, animation = 'idle', frame = 0, eyeOffsetX = 0, eyeOffsetY = 0, customBodyColor = null, customOutlineColor = null, addMouth = false, addArms = false, outlineOnly = false, addWatch = false) {
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
  //
  // Base parameters for different animations
  //
  let headY = 18
  let bodyY = 42
  let headX = 33
  let bodyX = 33
  let bodyHeight = 24
  let headHeight = 24
  let leftArmY = 40
  let rightArmY = 40
  let leftLegY = 66
  let rightLegY = 66
  let leftArmX = 25
  let rightArmX = 65
  let leftLegX = 33
  let rightLegX = 54
  let legHeight = 18
  let leftLegHeight = legHeight
  let rightLegHeight = legHeight
  //
  // Run animation: 3 frames with horizontal spread and vertical leg lift.
  // The ground-contact foot always reaches y=28 (same as idle).
  // The lifted foot is shorter to show a realistic stride.
  // Step sound plays on frame 0 when left foot makes contact.
  //
  if (animation === 'run') {
    if (frame === 0) {
      //
      // Contact: left foot forward on ground, right foot back and lifted
      //
      leftLegX = 33
      rightLegX = 54
      rightLegY = 63
      rightLegHeight = 12
    } else if (frame === 1) {
      //
      // Drive: right foot lands, left foot lifts
      //
      leftLegX = 33
      rightLegX = 51
      leftLegY = 63
      leftLegHeight = 12
    } else if (frame === 2) {
      //
      // Pass: both legs close together at ground level
      //
      leftLegX = 42
      rightLegX = 42
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
      headY = 45
      headHeight = 15
      bodyY = 60
      bodyHeight = 12
      leftArmY = 63
      rightArmY = 63
      //
      // Legs SHORT and wide
      //
      rightLegY = 72
      rightLegX = 54
      leftLegY = 72
      leftLegX = 33
      legHeight = 12
    } else if (frame === 1) {
      //
      // Frame 1: Stretch (ascending, in air) - hero elongated UP
      //
      headY = 9
      headHeight = 24
      bodyY = 33
      bodyHeight = 36
      leftArmY = 39
      rightArmY = 39
      //
      // Legs spread wider with gap between them
      //
      rightLegY = 69
      rightLegX = 54
      leftLegY = 69
      leftLegX = 33
      legHeight = 15
    } else if (frame === 2) {
      //
      // Frame 2: Normal (near peak) - regular proportions moved to TOP
      //
      headY = 6
      headHeight = 24
      bodyY = 30
      bodyHeight = 24
      leftArmY = 33
      rightArmY = 33
      //
      // Regular legs
      //
      rightLegY = 54
      rightLegX = 54
      leftLegY = 54
      leftLegX = 33
      legHeight = 18
    } else if (frame === 3) {
      //
      // Frame 3: Intermediate (transitioning to squash) - between normal and squash
      //
      headY = 6
      headHeight = 21
      bodyY = 27
      bodyHeight = 21
      leftArmY = 30
      rightArmY = 30
      //
      // Legs slightly taller
      //
      rightLegY = 48
      rightLegX = 54
      leftLegY = 48
      leftLegX = 33
      legHeight = 18
    } else if (frame === 4) {
      //
      // Frame 4: Squash (descending, in air) - hero compressed DOWN
      //
      headY = 6
      headHeight = 18
      bodyY = 24
      bodyHeight = 15
      leftArmY = 27
      rightArmY = 27
      //
      // Legs SHORT and spread wider
      //
      rightLegY = 39
      rightLegX = 54
      leftLegY = 39
      leftLegX = 33
      legHeight = 15
    } else if (frame === 5) {
      //
      // Frame 5: Normal (landing/idle) - regular proportions
      //
      headY = 18
      headHeight = 24
      bodyY = 42
      bodyHeight = 24
      leftArmY = 45
      rightArmY = 45
      //
      // Regular legs
      //
      rightLegY = 66
      rightLegX = 51
      leftLegY = 66
      leftLegX = 36
      legHeight = 18
    }
    leftArmX = 25
    rightArmX = 65
    //
    // Sync per-leg heights with the shared legHeight for jump frames
    //
    leftLegHeight = legHeight
    rightLegHeight = legHeight
  }
  //
  // Create sprite using toCanvas
  //
  try {
    return toCanvas({ width: SPRITE_SIZE, height: SPRITE_SIZE, pixelRatio: RENDER_SCALE }, (ctx) => {
      ctx.clearRect(0, 0, SPRITE_SIZE, SPRITE_SIZE)
      const OL = getHex(outlineColor)
      const BL = getHex(bodyColor)
      //
      // Arms are drawn only in idle mode (hidden during run and jump).
      // Fully rounded (pill) shape — shoulder top mirrors the arm bottom curvature.
      //
      const showArms = addArms && animation !== 'run' && animation !== 'jump'
      //
      // Step 1: draw all outlines in outline color (fill-based, sharp edges)
      //
      ctx.fillStyle = OL
      //
      // Arm outlines: each arm is half a leg pill (cut vertically). The flat side
      // is flush against the body outline so the arm emerges seamlessly from the torso.
      // Left arm: flat right side against body left, rounded outer-left edge.
      // Right arm: flat left side against body right, rounded outer-right edge.
      //
      if (showArms) {
        fillHalfPillLeft(ctx, headX - 1 - ARM_HALF_W, leftArmY - 1, ARM_HALF_W + 1, ARM_H + 2, ARM_CORNER_RADIUS + 1)
        fillHalfPillRight(ctx, headX + CHAR_WIDTH, rightArmY - 1, ARM_HALF_W + 1, ARM_H + 2, ARM_CORNER_RADIUS + 1)
      }
      //
      // Leg outlines: flat top so they merge seamlessly into body outline bottom
      //
      fillRoundedRectBottom(ctx, leftLegX - 1, leftLegY - 1, 11, leftLegHeight + 2, LEG_CORNER_RADIUS + 1)
      fillRoundedRectBottom(ctx, rightLegX - 1, rightLegY - 1, 11, rightLegHeight + 2, LEG_CORNER_RADIUS + 1)
      //
      // Body outline: always a clean straight-sided rect (same in both arms and no-arms mode).
      // Arms are drawn separately beside it; there are no shoulder bezier curves.
      //
      fillRoundedRectTop(ctx, headX - 1, headY - 1, CHAR_WIDTH + 2, headHeight + bodyHeight + 2, HEAD_CORNER_RADIUS + 1)
      //
      // Step 2: draw body color fills on top of outlines
      //
      if (!outlineOnly) {
        ctx.fillStyle = BL
        //
        // Arm fills: half-pill bodies, flat side overlapping body so arm merges seamlessly
        //
        if (showArms) {
          fillHalfPillLeft(ctx, headX - ARM_HALF_W, leftArmY, ARM_HALF_W, ARM_H, ARM_CORNER_RADIUS)
          fillHalfPillRight(ctx, headX + CHAR_WIDTH, rightArmY, ARM_HALF_W, ARM_H, ARM_CORNER_RADIUS)
        }
        //
        // Body fill: clean straight rect, identical in both arms and no-arms mode
        //
        fillRoundedRectTop(ctx, headX, headY, CHAR_WIDTH, headHeight + bodyHeight + 1, HEAD_CORNER_RADIUS)
        //
        // Leg fills: flat top so they merge seamlessly into body fill bottom
        //
        fillRoundedRectBottom(ctx, leftLegX, leftLegY, 9, leftLegHeight, LEG_CORNER_RADIUS)
        fillRoundedRectBottom(ctx, rightLegX, rightLegY, 9, rightLegHeight, LEG_CORNER_RADIUS)
      }
      //
      // Step 3: circular eyes (drawn on head fill)
      //
      const eyeY = headY + EYE_OFFSET_Y
      ctx.fillStyle = OL
      if (animation === 'run' || animation === 'jump') {
        ctx.beginPath()
        ctx.arc(headX + EYE_OFFSET_X_RIGHT, eyeY, EYE_RING_RADIUS, 0, Math.PI * 2)
        ctx.fill()
      } else {
        ctx.beginPath()
        ctx.arc(headX + EYE_OFFSET_X_LEFT, eyeY, EYE_RING_RADIUS, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(headX + EYE_OFFSET_X_RIGHT, eyeY, EYE_RING_RADIUS, 0, Math.PI * 2)
        ctx.fill()
      }
      //
      // Eye whites (filled inside the ring)
      //
      if (!outlineOnly) {
        ctx.fillStyle = getHex(CFG.visual.colors[type].eyeWhite)
        if (animation === 'run' || animation === 'jump') {
          ctx.beginPath()
          ctx.arc(headX + EYE_OFFSET_X_RIGHT, eyeY, EYE_WHITE_RADIUS, 0, Math.PI * 2)
          ctx.fill()
        } else {
          ctx.beginPath()
          ctx.arc(headX + EYE_OFFSET_X_LEFT, eyeY, EYE_WHITE_RADIUS, 0, Math.PI * 2)
          ctx.fill()
          ctx.beginPath()
          ctx.arc(headX + EYE_OFFSET_X_RIGHT, eyeY, EYE_WHITE_RADIUS, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      //
      // Pupils
      //
      ctx.fillStyle = OL
      if (animation === 'run' || animation === 'jump') {
        ctx.beginPath()
        ctx.arc(headX + EYE_OFFSET_X_RIGHT + PUPIL_SIDE_SHIFT, eyeY, PUPIL_RADIUS, 0, Math.PI * 2)
        ctx.fill()
      } else {
        ctx.beginPath()
        ctx.arc(headX + EYE_OFFSET_X_LEFT + eyeOffsetX * EYE_PUPIL_SHIFT, eyeY + eyeOffsetY * EYE_PUPIL_SHIFT, PUPIL_RADIUS, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(headX + EYE_OFFSET_X_RIGHT + eyeOffsetX * EYE_PUPIL_SHIFT, eyeY + eyeOffsetY * EYE_PUPIL_SHIFT, PUPIL_RADIUS, 0, Math.PI * 2)
        ctx.fill()
      }
      //
      // Mouth (optional, only for idle — small smile arc)
      //
      if (addMouth && animation === 'idle') {
        ctx.strokeStyle = OL
        ctx.lineWidth = 2
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.arc(headX + 15, headY + 17, 7, 0.15 * Math.PI, 0.85 * Math.PI)
        ctx.stroke()
      }
      //
      // Watch on right wrist — drawn at body arm position
      //
      if (addWatch && animation === 'idle') {
        const watchY = rightArmY + ARM_H - 6
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(headX + CHAR_WIDTH + 1, watchY, 3, 3)
      }
    })
  } catch (error) {
    //
    // Fallback: return a minimal valid data URL (1x1 transparent pixel)
    //
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
  }
}
//
// Adds arms to hero sprites immediately (touch level 3 annihilation)
//
function applyHeroArms(inst) {
  inst.addArms = true
  const bodyColorClean = String(inst.bodyColor || CFG.visual.colors.hero.body).replace('#', '')
  const outlineColorClean = String(CFG.visual.colors.outline).replace('#', '')
  const hasMouth = inst.addMouth
  inst.spritePrefix = `${inst.type}_${bodyColorClean}_${outlineColorClean}${hasMouth ? '_mouth' : ''}_arms`
  loadHeroSprites(inst)
  inst.character?.use?.(inst.k.sprite(getSpriteName(inst, inst.eyeOffsetX, inst.eyeOffsetY)))
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
  //
  // Death shards stay filled with body hues plus thin outline only — never solid outline blobs.
  //
  const isTimeSection = inst.currentLevel && inst.currentLevel.startsWith('level-time.')
  if (isTimeSection) {
    const { type } = inst
    return type === HEROES.HERO
      ? deathParticlePaletteFromHex('#8B5A50')
      : deathParticlePaletteFromHex('#FF8C00')
  }
  const colors = CFG.visual.colors
  return inst.type === HEROES.HERO
    ? deathParticlePaletteFromHex(inst.bodyColor || colors.hero.body)
    : deathParticlePaletteFromHex(colors.antiHero.body)
}

/**
 * Builds four body-tone hex shades from one hero colour (no outline-only shards).
 *
 * @param {string} hex - Hero fill hex
 * @returns {string[]} Four palette strings for particle bodies
 */
function deathParticlePaletteFromHex(hex) {
  const [r, g, b] = parseHex(hex)
  const clamp = (v) => Math.max(18, Math.min(248, Math.round(v)))
  const toHex = (rr, gg, bb) => `#${clamp(rr).toString(16).padStart(2, '0')}${clamp(gg).toString(16).padStart(2, '0')}${clamp(bb).toString(16).padStart(2, '0')}`
  return [
    toHex(r, g, b),
    toHex(r * 0.88, g * 0.88, b * 0.88),
    toHex(r * 0.72, g * 0.72, b * 0.72),
    toHex(Math.min(255, r * 1.08), Math.min(255, g * 1.06), Math.min(255, b * 1.04))
  ]
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
/**
 * Create color change sparkle particles around hero
 * Similar to particles when small hero completes a level
 * @param {Object} inst - Hero instance
 * @param {string} color - New body color (hex)
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
  // Create circle particles flying outward (similar to heart particles for small hero)
  //
  const particleCount = 12
  
  for (let i = 0; i < particleCount; i++) {
    const angle = (Math.PI * 2 * i) / particleCount
    const speed = 80 + Math.random() * 40
    const lifetime = 0.6 + Math.random() * 0.4
    const circleSize = 8 + Math.random() * 6
    //
    // Create black outline circles (8 directions)
    //
    const outlineOffset = 1.5
    const outlineOffsets = [
      [-outlineOffset, -outlineOffset],
      [0, -outlineOffset],
      [outlineOffset, -outlineOffset],
      [-outlineOffset, 0],
      [outlineOffset, 0],
      [-outlineOffset, outlineOffset],
      [0, outlineOffset],
      [outlineOffset, outlineOffset]
    ]
    
    outlineOffsets.forEach(([dx, dy]) => {
      const outlineParticle = k.add([
        k.circle(circleSize),
        k.pos(centerX + dx, centerY + dy),
        k.color(0, 0, 0),
        k.opacity(1),
        k.z(50)
      ])
      //
      // Animate outline particle
      //
      const startTime = k.time()
      outlineParticle.onUpdate(() => {
        const elapsed = k.time() - startTime
        if (elapsed > lifetime) {
          k.destroy(outlineParticle)
          return
        }
        outlineParticle.pos.x += Math.cos(angle) * speed * k.dt()
        outlineParticle.pos.y += Math.sin(angle) * speed * k.dt()
        outlineParticle.opacity = 1 - (elapsed / lifetime)
      })
    })
    //
    // Create main colored circle
    //
    const particle = k.add([
      k.circle(circleSize),
      k.pos(centerX, centerY),
      k.color(r, g, b),
      k.opacity(1),
      k.z(51)
    ])
    //
    // Animate particle outward with fade
    //
    const startTime = k.time()
    particle.onUpdate(() => {
      const elapsed = k.time() - startTime
      if (elapsed > lifetime) {
        k.destroy(particle)
        return
      }
      particle.pos.x += Math.cos(angle) * speed * k.dt()
      particle.pos.y += Math.sin(angle) * speed * k.dt()
      particle.opacity = 1 - (elapsed / lifetime)
    })
  }
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
    const oSize = pSize + 2
    const colorHex = k.choose(particleColors)
    const [r, g, b] = parseHex(colorHex)
    const rotation = k.rand(0, 360)
    //
    // Create invisible body for physics
    //
    const particleZ = inst.deathParticleZ ?? 20
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
      k.z(particleZ),
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
  const eyeWhiteSize = 3 * RENDER_SCALE
  const pupilSize = 1 * RENDER_SCALE
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
    const eyeZ = inst.deathParticleZ ?? 20
    const eyeWhite = k.add([
      k.rect(eyeWhiteSize, eyeWhiteSize),
      k.pos(centerX, centerY),
      k.color(eyeWhiteColor[0], eyeWhiteColor[1], eyeWhiteColor[2]),
      k.anchor("center"),
      k.z(eyeZ),
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
//
// Draws a filled rectangle with only the two bottom corners rounded.
// Flat top connects seamlessly to the flat bottom of body outline/fill,
// eliminating the body-to-leg gap visible in all animation frames.
// Caller sets ctx.fillStyle before calling.
//
function fillRoundedRectBottom(ctx, x, y, w, h, r) {
  const cr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x + w, y)
  ctx.lineTo(x + w, y + h - cr)
  ctx.arcTo(x + w, y + h, x, y + h, cr)
  ctx.lineTo(x + cr, y + h)
  ctx.arcTo(x, y + h, x, y, cr)
  ctx.lineTo(x, y)
  ctx.closePath()
  ctx.fill()
}
//
// Draws a filled rectangle with only the two top corners rounded.
// Bottom corners are flat so the shape connects to legs without narrowing.
// Caller sets ctx.fillStyle before calling.
//
function fillRoundedRectTop(ctx, x, y, w, h, r) {
  const cr = Math.min(r, w / 2, h)
  ctx.beginPath()
  ctx.moveTo(x + cr, y)
  ctx.arcTo(x + w, y, x + w, y + h, cr)
  ctx.lineTo(x + w, y + h)
  ctx.lineTo(x, y + h)
  ctx.arcTo(x, y, x + w, y, cr)
  ctx.closePath()
  ctx.fill()
}
//
// Draws the left half of a vertical pill: flat right side, rounded left/top/bottom.
// Used for the left arm — flat side is placed flush against the body left outline so
// the arm merges into the torso without any visible gap or separator.
// Caller sets ctx.fillStyle before calling.
//
function fillHalfPillLeft(ctx, x, y, w, h, r) {
  const cr = Math.min(r, w, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + w, y)
  ctx.lineTo(x + w, y + h)
  ctx.lineTo(x + cr, y + h)
  ctx.arcTo(x, y + h, x, y, cr)
  ctx.lineTo(x, y + cr)
  ctx.arcTo(x, y, x + w, y, cr)
  ctx.closePath()
  ctx.fill()
}
//
// Draws the right half of a vertical pill: flat left side, rounded right/top/bottom.
// Used for the right arm — flat side is placed flush against the body right outline so
// the arm merges into the torso without any visible gap or separator.
// Caller sets ctx.fillStyle before calling.
//
function fillHalfPillRight(ctx, x, y, w, h, r) {
  const cr = Math.min(r, w, h / 2)
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x + w - cr, y)
  ctx.arcTo(x + w, y, x + w, y + h, cr)
  ctx.lineTo(x + w, y + h - cr)
  ctx.arcTo(x + w, y + h, x, y + h, cr)
  ctx.lineTo(x, y + h)
  ctx.closePath()
  ctx.fill()
}
//
// Draws a filled rounded rectangle using arcTo for smooth corners.
// Caller sets ctx.fillStyle before calling.
//
function fillRoundedRect(ctx, x, y, w, h, r) {
  const cr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + cr, y)
  ctx.arcTo(x + w, y, x + w, y + h, cr)
  ctx.arcTo(x + w, y + h, x, y + h, cr)
  ctx.arcTo(x, y + h, x, y, cr)
  ctx.arcTo(x, y, x + w, y, cr)
  ctx.closePath()
  ctx.fill()
}
