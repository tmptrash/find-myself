import { CFG } from '../cfg.js'
import { getHex } from '../../../utils/helper.js'
import * as Sound from '../../../utils/sound.js'
import * as Hero from '../../../components/hero.js'

//
// Blade parameters
//
const SPIKE_COUNT = 3
const SPIKE_HEIGHT_BLOCKS = 4
const SINGLE_SPIKE_WIDTH_BLOCKS = 7
const SPIKE_GAP_BLOCKS = 1
const SPIKE_SCALE = 1
const SPIKE_BLOCK_SIZE = 4

//
// Blade animation parameters - realistic metal vibration
//
const VIBRATION_AMPLITUDE = 0.3  // Degrees of subtle vibration
const VIBRATION_SPEED = 20  // High frequency vibration (realistic metal)
const MICRO_SHAKE = 0.2  // Tiny position shifts in pixels

export const ORIENTATIONS = {
  FLOOR: 'floor',
  CEILING: 'ceiling',
  LEFT: 'left',
  RIGHT: 'right'
}

/**
 * Get blade height in pixels for current screen resolution
 * @param {Object} k - Kaplay instance
 * @returns {number} Blade height in pixels
 */
export function getBladeHeight(k) {
  return SPIKE_HEIGHT_BLOCKS * getBladeBlockSize(k)
}

/**
 * Get blade width in pixels for current screen resolution
 * @param {Object} k - Kaplay instance
 * @returns {number} Blade width in pixels
 */
export function getBladeWidth(k) {
  const blockSize = getBladeBlockSize(k)
  return (SINGLE_SPIKE_WIDTH_BLOCKS * SPIKE_COUNT + SPIKE_GAP_BLOCKS * (SPIKE_COUNT - 1)) * blockSize
}

/**
 * Get single blade (pyramid) width in pixels
 * @param {Object} k - Kaplay instance
 * @returns {number} Single blade width in pixels
 */
export function getSingleBladeWidth(k) {
  const blockSize = getBladeBlockSize(k)
  return SINGLE_SPIKE_WIDTH_BLOCKS * blockSize
}

/**
 * Creates blades with collision detection
 * @param {Object} config - Blade configuration
 * @param {Object} config.k - Kaplay instance
 * @param {number} config.x - X position
 * @param {number} config.y - Y position
 * @param {Object} [config.hero] - Hero instance (required for collision handling)
 * @param {string} [config.orientation='floor'] - Blade orientation
 * @param {Function} [config.onHit] - Callback when hero hits blades
 * @param {Object} [config.sfx] - Sound instance for audio effects
 * @param {string} [config.color] - Hex color for the blade (defaults to level blade color)
 * @param {number} [config.bladeCount=3] - Number of blade pyramids to draw
 * @param {number} [config.scale=1] - Scale multiplier for the blade
 * @param {number} [config.zIndex] - Custom z-index (defaults to platforms)
 * @param {boolean} [config.disableAnimation=false] - Disable vibration and glint animation
 * @returns {Object} Blades instance with blade object and state
 */
export function create(config) {
  const {
    k,
    x,
    y,
    hero = null,
    orientation = ORIENTATIONS.FLOOR,
    onHit = null,
    sfx = null,
    color = CFG.visual.colors.blades,
    bladeCount = 3,
    scale = 1,
    zIndex = CFG.visual.zIndex.platforms,
    disableAnimation = false
  } = config

  // Calculate dynamic sizes based on screen resolution
  const blockSize = getBladeBlockSize(k)
  //
  // For text-based blades, calculate actual text dimensions
  //
  const fontSize = 40
  const letterSpacing = 0
  const approximateLetterWidth = fontSize * 0.6
  const bladeWidth = approximateLetterWidth * bladeCount + letterSpacing * (bladeCount - 1) - 8  // Reduce 4px from each side
  const bladeHeight = fontSize - 8  // Reduce 12px from bottom total

  // Load blade sprite with custom color and blade count
  const spriteKey = `blade_${orientation}_${color}_${bladeCount}_v14`
  if (!k.getSprite(spriteKey)) {
    k.loadSprite(spriteKey, createBladeSprite(orientation, blockSize, color, bladeCount))
  }

  // Determine rotation and collision box based on orientation
  const rotation = getRotation(orientation)
  const collisionSize = getCollisionSize(orientation, bladeWidth, bladeHeight)

  const blade = k.add([
    k.sprite(spriteKey),
    k.pos(x, y),
    k.area({
      shape: new k.Rect(
        k.vec2(0, -8),
        collisionSize.width,
        collisionSize.height
      )
    }),
    k.anchor("center"),
    k.rotate(rotation),
    k.scale(SPIKE_SCALE * scale),
    k.z(zIndex),
    k.opacity(0),
    "blade"
  ])
  
  //
  // Create invisible object for drawing glint on top layer
  //
  const glintDrawer = k.add([
    k.pos(0, 0),
    k.z(zIndex + 1),  // Above blade
    {
      draw() {
        drawGlint(inst)
      }
    }
  ])

  const inst = {
    blade,
    glintDrawer,
    k,
    hero,
    orientation,
    onHit,
    sfx,
    isVisible: false,
    animationTimer: 0,
    fadeInDuration: 0.3,
    visibleDuration: 0.3,
    fadeOutDuration: 0.3,
    animationComplete: false,
    wasShownOnDeath: false,
    collisionEnabled: true,
    baseX: x,
    baseY: y,
    baseRotation: rotation,
    baseScale: SPIKE_SCALE * scale,
    bladeWidth: collisionSize.width * SPIKE_SCALE * scale,
    bladeHeight: collisionSize.height * SPIKE_SCALE * scale,
    swayTime: Math.random() * Math.PI * 2,
    squatTime: Math.random() * Math.PI * 2,
    glintTimer: Math.random() * CFG.visual.bladeGlint.intervalMax,
    glintProgress: 0,
    isGlinting: false,
    glintSoundPlayed: false,
    glintDirection: 0,  // Will be set when glint starts (left or right stroke)
    glintLetter: 0,  // Will be set when glint starts (left or right 'A')
    disableAnimation  // Store animation flag
  }

  // Setup collision detection with hero (works even when invisible)
  blade.onCollide("player", () => {
    // Only trigger collision if enabled
    if (inst.collisionEnabled) {
      onHit?.(inst)
    }
  })
  
  //
  // Start living animation (only if not disabled)
  //
  if (!disableAnimation) {
    blade.onUpdate(() => updateLivingAnimation(inst))
  }

  return inst
}

/**
 * Loads all blade sprites for different orientations
 * Should be called once on game initialization
 * @param {Object} k - Kaplay instance
 */
export function loadSprites(k) {
  const blockSize = getBladeBlockSize(k)
  const defaultColor = CFG.visual.colors.blades  // Default blade color
  const defaultBladeCount = 3  // Default 3 pyramids
  Object.values(ORIENTATIONS).forEach(orientation => {
    const spriteData = createBladeSprite(orientation, blockSize, defaultColor, defaultBladeCount)
    k.loadSprite(`blade_${orientation}`, spriteData)
  })
}

/**
 * Starts the blade animation cycle with delay
 * @param {Object} inst - Blade instance
 * @param {number} delaySeconds - Delay before first appearance
 */
export function startAnimation(inst, delaySeconds = 1) {
  const { blade, k, sfx } = inst
  
  // Wait for initial delay, then start animation cycle
  k.wait(delaySeconds, () => {
    // Don't start animation if blades were already shown on death
    if (inst.wasShownOnDeath) return
    
    // Play blade sound when blades start appearing
    sfx && Sound.playBladeSound(sfx)
    
    blade.onUpdate(() => updateAnimation(inst))
  })
}

/**
 * Shows blades instantly (used when hero dies)
 * @param {Object} inst - Blade instance
 */
export function show(inst) {
  inst.blade.opacity = 1
  inst.isVisible = true
  inst.glintDrawer.hidden = false  // Ensure glint drawer is visible
}

/**
 * Handle blade collision with hero (shows blades and triggers hero death)
 * @param {Object} inst - Blade instance
 * @param {string} currentLevel - Level to restart on death
 */
export function handleCollision(inst, currentLevel) {
  inst.wasShownOnDeath = true  // Mark that blades were shown on death (stops glint)
  show(inst)
  Hero.death(inst.hero, () => inst.k.go(currentLevel))
}

/**
 * Update living animation for blades (realistic metal vibration with glints)
 * @param {Object} inst - Blade instance
 */
function updateLivingAnimation(inst) {
  const { blade, k, orientation, baseRotation, sfx, disableAnimation } = inst
  
  //
  // Stop animation if disabled
  //
  if (disableAnimation) return
  
  //
  // Stop animation after death
  //
  if (inst.wasShownOnDeath) return
  
  //
  // Only animate floor-oriented blades
  //
  if (orientation !== ORIENTATIONS.FLOOR) return
  
  //
  // Only animate when visible
  //
  if (!inst.isVisible && blade.opacity === 0) return
  
  const dt = k.dt()
  
  //
  // Update vibration timers (high frequency, subtle)
  //
  inst.swayTime += dt * VIBRATION_SPEED
  inst.squatTime += dt * (VIBRATION_SPEED * 1.3)  // Slightly different frequency
  
  //
  // Realistic metal vibration (very subtle, high frequency)
  // Combine multiple frequencies for natural resonance
  //
  const vibration = Math.sin(inst.swayTime) * VIBRATION_AMPLITUDE * 0.6 +
                    Math.sin(inst.swayTime * 2.3) * VIBRATION_AMPLITUDE * 0.3 +
                    Math.sin(inst.swayTime * 4.7) * VIBRATION_AMPLITUDE * 0.1
  
  //
  // Micro position shake (barely visible, adds realism)
  //
  const microShakeX = Math.sin(inst.squatTime * 1.1) * MICRO_SHAKE * 0.5 +
                      Math.sin(inst.squatTime * 3.7) * MICRO_SHAKE * 0.3
  const microShakeY = Math.cos(inst.squatTime * 1.5) * MICRO_SHAKE * 0.3 +
                      Math.cos(inst.squatTime * 5.1) * MICRO_SHAKE * 0.2
  
  //
  // Apply vibration
  //
  blade.angle = baseRotation + vibration
  blade.pos.x = inst.baseX + microShakeX
  blade.pos.y = inst.baseY + microShakeY
  
  //
  // Light glint system (periodic light reflections)
  // Stop glint if blade is lifted (disappearing)
  //
  if (inst.isLifted) {
    inst.isGlinting = false
    inst.glintProgress = 0
    return
  }
  
  inst.glintTimer -= dt
  
  if (inst.glintTimer <= 0 && !inst.isGlinting) {
    //
    // Start new glint
    //
    inst.isGlinting = true
    inst.glintProgress = 0
    inst.glintSoundPlayed = false
    inst.glintLetter = Math.random() > 0.5 ? -1 : 1  // Choose left (-1) or right (+1) 'A'
    inst.glintDirection = Math.random() > 0.5 ? -1 : 1  // Choose left or right stroke of that 'A'
    inst.glintTimer = CFG.visual.bladeGlint.intervalMin + Math.random() * (CFG.visual.bladeGlint.intervalMax - CFG.visual.bladeGlint.intervalMin)
  }
  
  if (inst.isGlinting) {
    inst.glintProgress += dt / CFG.visual.bladeGlint.duration
    
    //
    // Play katana slash sound at glint start
    //
    if (!inst.glintSoundPlayed && inst.glintProgress > 0.05 && sfx) {
      const swishVolume = CFG.audio.bladeGlint.swishVolume
      const ringVolume = CFG.audio.bladeGlint.ringVolume
      Sound.playMetalPingSound(sfx, swishVolume, ringVolume)
      inst.glintSoundPlayed = true
    }
    
    if (inst.glintProgress >= 1) {
      //
      // End glint
      //
      inst.isGlinting = false
      inst.glintProgress = 0
    }
  }
}

/**
 * Update blade animation (fade in, stay visible, fade out once)
 * @param {Object} inst - Blade instance
 */
function updateAnimation(inst) {
  const { blade, k, fadeInDuration, visibleDuration, fadeOutDuration } = inst
  
  // Stop updating if animation is complete
  if (inst.animationComplete) return
  
  inst.animationTimer += k.dt()
  const elapsed = inst.animationTimer
  
  // Phase 1: Fade in
  if (elapsed < fadeInDuration) {
    const progress = elapsed / fadeInDuration
    blade.opacity = progress
    inst.isVisible = true
  }
  // Phase 2: Stay visible
  else if (elapsed < fadeInDuration + visibleDuration) {
    blade.opacity = 1
    inst.isVisible = true
  }
  // Phase 3: Fade out
  else if (elapsed < fadeInDuration + visibleDuration + fadeOutDuration) {
    const fadeOutElapsed = elapsed - fadeInDuration - visibleDuration
    const progress = fadeOutElapsed / fadeOutDuration
    blade.opacity = 1 - progress
    inst.isVisible = progress < 0.5
  }
  // Phase 4: Stay invisible forever
  else {
    blade.opacity = 0
    inst.isVisible = false
    inst.animationComplete = true
  }
}
/**
 * Get blade block size
 * @param {Object} k - Kaplay instance
 * @returns {number} Size of one block in pixels
 */
export function getBladeBlockSize(k) {
  return SPIKE_BLOCK_SIZE
}
/**
 * Get rotation angle based on orientation
 * @param {string} orientation - Blade orientation
 * @returns {number} Rotation angle in degrees
 */
function getRotation(orientation) {
  switch (orientation) {
    case ORIENTATIONS.FLOOR:
      return 0
    case ORIENTATIONS.CEILING:
      return 180
    case ORIENTATIONS.LEFT:
      return 270
    case ORIENTATIONS.RIGHT:
      return 90
    default:
      return 0
  }
}

/**
 * Get collision box size based on orientation
 * @param {string} orientation - Blade orientation
 * @param {number} width - Blade width in pixels
 * @param {number} height - Blade height in pixels
 * @returns {Object} Width and height for collision box
 */
function getCollisionSize(orientation, width, height) {
  if (orientation === ORIENTATIONS.LEFT || orientation === ORIENTATIONS.RIGHT) {
    return { width: height, height: width }
  }
  return { width, height }
}

/**
 * Draw light glint effect (moving light with rays)
 * @param {Object} inst - Blade instance
 */
function drawGlint(inst) {
  const { k, isGlinting, glintProgress, blade, baseX, baseY, bladeWidth, bladeHeight, glintDirection, glintLetter, wasShownOnDeath, isLifted, disableAnimation } = inst
  
  //
  // Only draw when glinting and not after death, not when lifted (disappearing), and animation is enabled
  //
  if (!isGlinting || glintProgress === 0 || wasShownOnDeath || isLifted || disableAnimation) return
  
  //
  // Calculate glint position moving along the diagonal of one letter 'A'
  // Path: top of chosen 'A' stroke → down along that stroke
  //
  // "AA" consists of two letters, we choose one
  // Each 'A' is roughly bladeWidth/2 wide
  //
  const letterWidth = bladeWidth / 2.5  // Width of one 'A'
  const letterCenterX = baseX + (letterWidth / 2) * glintLetter  // Center of chosen 'A'
  
  //
  // Start at the TOP of the chosen stroke
  // For left stroke: start slightly left of center
  // For right stroke: start slightly right of center
  //
  const topStrokeOffset = (letterWidth / 3.5) * glintDirection  // Offset at top
  const startX = letterCenterX + topStrokeOffset
  const startY = baseY - bladeHeight / 2.2  // Top of the 'A'
  
  //
  // End at bottom of the chosen 'A', on left or right stroke
  // Bottom is MUCH wider than top (letter A shape)
  // We need strong diagonal movement!
  //
  const bottomStrokeOffset = (letterWidth / 1.2) * glintDirection  // Much wider at bottom!
  const endX = letterCenterX + bottomStrokeOffset
  const endY = baseY + bladeHeight / 2.5  // Bottom of the 'A'
  
  //
  // Interpolate position along the diagonal stroke
  //
  const glintX = startX + (endX - startX) * glintProgress
  const glintY = startY + (endY - startY) * glintProgress
  
  //
  // Opacity curve (fade in quickly, fade out slowly)
  //
  let glintOpacity
  if (glintProgress < 0.3) {
    glintOpacity = (glintProgress / 0.3)
  } else {
    glintOpacity = ((1 - glintProgress) / 0.7)
  }
  
  //
  // Draw central bright core (smaller, more focused)
  //
  const coreSize = 10
  
  k.drawCircle({
    pos: k.vec2(glintX, glintY),
    radius: coreSize / 2,
    color: k.rgb(255, 255, 255),
    opacity: glintOpacity * 0.95
  })
  
  //
  // Draw soft glow around core (larger halo)
  //
  const glowSize = 24
  
  k.drawCircle({
    pos: k.vec2(glintX, glintY),
    radius: glowSize / 2,
    color: k.rgb(255, 255, 255),
    opacity: glintOpacity * 0.25
  })
  
  //
  // Draw light rays (6 rays in all directions)
  //
  const rayLength = 22
  const rayWidth = 2
  const rayAngles = [0, 60, 120, 180, 240, 300]  // 6 rays evenly distributed
  
  rayAngles.forEach(angle => {
    const angleRad = (angle * Math.PI) / 180
    const endX = glintX + Math.cos(angleRad) * rayLength
    const endY = glintY + Math.sin(angleRad) * rayLength
    
    k.drawLine({
      p1: k.vec2(glintX, glintY),
      p2: k.vec2(endX, endY),
      width: rayWidth,
      color: k.rgb(255, 255, 255),
      opacity: glintOpacity * 0.55
    })
  })
  
  //
  // Draw extra sparkle (tiny cross)
  //
  const sparkleSize = 6
  
  k.drawLine({
    p1: k.vec2(glintX - sparkleSize, glintY),
    p2: k.vec2(glintX + sparkleSize, glintY),
    width: 1.5,
    color: k.rgb(255, 255, 255),
    opacity: glintOpacity * 0.8
  })
  
  k.drawLine({
    p1: k.vec2(glintX, glintY - sparkleSize),
    p2: k.vec2(glintX, glintY + sparkleSize),
    width: 1.5,
    color: k.rgb(255, 255, 255),
    opacity: glintOpacity * 0.8
  })
}

/**
 * Create blade sprite procedurally - renders letters 'A' instead of pyramids
 * @param {string} orientation - Blade orientation
 * @param {number} blockSize - Size of one block in pixels
 * @param {string} color - Hex color string for the blade
 * @param {number} bladeCount - Number of letters to render
 * @returns {string} Base64 encoded sprite data
 */
function createBladeSprite(orientation, blockSize, color, bladeCount = 3) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  
  //
  // Font settings
  //
  const fontSize = 40
  const fontFamily = CFG.visual.fonts.thinFull
  const outlineWidth = 2
  const letterSpacing = 0
  
  //
  // Measure text to get dimensions
  //
  ctx.font = `${fontSize}px ${fontFamily}`
  const letterText = 'A'.repeat(bladeCount)
  const metrics = ctx.measureText(letterText)
  const textWidth = metrics.width + (bladeCount - 1) * letterSpacing
  const textHeight = fontSize * 1.4
  
  //
  // Set canvas size with padding for outline
  //
  const padding = outlineWidth * 4
  canvas.width = textWidth + padding * 2
  canvas.height = textHeight + padding * 2
  
  //
  // Set text rendering properties
  //
  ctx.font = `${fontSize}px ${fontFamily}`
  ctx.textBaseline = 'bottom'
  ctx.textAlign = 'left'
  
  const baseX = padding
  const baseY = canvas.height - padding - 12
  
  //
  // Draw black outline by rendering text multiple times with offset
  //
  const offsets = [
    [-outlineWidth, -outlineWidth],
    [0, -outlineWidth],
    [outlineWidth, -outlineWidth],
    [-outlineWidth, 0],
    [outlineWidth, 0],
    [-outlineWidth, outlineWidth],
    [0, outlineWidth],
    [outlineWidth, outlineWidth]
  ]
  
  ctx.fillStyle = '#000000'
  for (let i = 0; i < bladeCount; i++) {
    const letterX = baseX + i * (fontSize * 0.6 + letterSpacing)
    offsets.forEach(([offsetX, offsetY]) => {
      ctx.fillText('A', letterX + offsetX, baseY + offsetY)
    })
  }
  
  //
  // Draw main text (colored)
  //
  ctx.fillStyle = getHex(color)
  for (let i = 0; i < bladeCount; i++) {
    const letterX = baseX + i * (fontSize * 0.6 + letterSpacing)
    ctx.fillText('A', letterX, baseY)
  }

  return canvas.toDataURL()
}

