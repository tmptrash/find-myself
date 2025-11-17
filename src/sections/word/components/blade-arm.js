import { CFG } from '../../../cfg.js'
import { getColor } from '../../../utils/helper.js'
import * as Sound from '../../../utils/sound.js'
import * as Hero from '../../../components/hero.js'
import * as Blades from './blades.js'

// Blade arm parameters
const EXTENSION_DURATION = 1.0  // Duration of extension animation (seconds)
const PAUSE_DURATION = 1.0  // Duration of pause between extensions (seconds)

/**
 * Creates a blade arm that extends from the left side of the screen
 * @param {Object} config - Configuration
 * @param {Object} config.k - Kaplay instance
 * @param {number} config.y - Y position (center of blade)
 * @param {Object} config.hero - Hero instance for collision detection
 * @param {string} config.color - Blade color in hex format
 * @param {Object} [config.sfx] - Sound instance
 * @param {string} config.currentLevel - Current level name for restart
 * @returns {Object} Blade arm instance
 */
export function create(config) {
  const { k, y, hero, color, sfx = null, currentLevel } = config
  
  const spikeWidth = Blades.getSpikeWidth(k)
  const spikeHeight = Blades.getSpikeHeight(k)
  const singleSpikeWidth = Blades.getSingleSpikeWidth(k)
  const sideWallWidth = 192  // Side walls width (10% of 1920)
  const extensionStep = spikeWidth * 2 * 0.8  // Extends by 2 spike widths per cycle, reduced by 20%
  
  // Arm thickness = single spike width (base of one blade when rotated 90 degrees)
  const armThickness = singleSpikeWidth
  
  // Start position: right edge of left wall (inside game room)
  const startX = sideWallWidth
  
  // Create the blade at the end of the arm (floor orientation, will be rotated)
  const blade = Blades.create({
    k,
    x: startX,
    y: y,
    hero,
    orientation: Blades.ORIENTATIONS.FLOOR,
    onHit: () => handleCollision(inst),
    sfx,
    color: color,
    spikeCount: 1  // Single pyramid
  })
  
  // Rotate blade 90 degrees clockwise to point right
  blade.spike.angle = 90
  blade.spike.opacity = 1
  blade.spike.z = CFG.visual.zIndex.platforms + 2
  
  //
  // Get block size for outline
  //
  const blockSize = Blades.getSpikeBlockSize(k)
  const outlineWidth = blockSize
  
  // Create the arm (horizontal rectangle with width of spike base)
  // Start with minimal width, will grow over time
  // Position at top-left corner, so y is the top edge
  const armY = y - armThickness / 2
  
  const arm = k.add([
    k.rect(0, armThickness),
    k.pos(startX, armY),
    k.anchor("topleft"),
    k.area(),
    k.body({ isStatic: true }),
    getColor(k, color),
    k.z(CFG.visual.zIndex.platforms + 1),
    "blade-arm"
  ])
  
  //
  // Create black outline strips (top and bottom)
  // Outline width = one block size
  //
  const armOutlineTop = k.add([
    k.rect(0, outlineWidth),
    k.pos(startX, armY - outlineWidth),
    k.anchor("topleft"),
    k.color(0, 0, 0),
    k.z(CFG.visual.zIndex.platforms + 2),
    "blade-arm-outline"
  ])
  
  const armOutlineBottom = k.add([
    k.rect(0, outlineWidth),
    k.pos(startX, armY + armThickness),
    k.anchor("topleft"),
    k.color(0, 0, 0),
    k.z(CFG.visual.zIndex.platforms + 2),
    "blade-arm-outline"
  ])
  
  const inst = {
    k,
    arm,
    armOutlineTop,
    armOutlineBottom,
    blade,
    hero,
    sfx,
    currentLevel,
    state: 'initial_pause',  // initial_pause, extending or paused
    timer: 0,
    startX,
    currentWidth: 0,  // Current width of the arm
    targetWidth: extensionStep,  // Target width for current extension (first step)
    extensionStep,  // How much to extend per cycle
    armThickness,
    spikeHeight
  }
  
  // Start the animation cycle
  arm.onUpdate(() => updateBladeArm(inst))
  
  // Handle collision with arm
  arm.onCollide("player", () => handleCollision(inst))
  
  return inst
}

/**
 * Handle collision with blade arm
 * @param {Object} inst - Blade arm instance
 */
function handleCollision(inst) {
  Hero.death(inst.hero, () => inst.k.go(inst.currentLevel))
}

/**
 * Update blade arm animation (extends in bursts with pauses)
 * @param {Object} inst - Blade arm instance
 */
function updateBladeArm(inst) {
  //
  // Stop animation and sound if hero is annihilating
  //
  if (inst.hero.isAnnihilating) {
    return
  }
  
  const { k, arm, sfx, extensionStep } = inst
  
  inst.timer += k.dt()
  
  if (inst.state === 'initial_pause') {
    // Initial pause: wait 1 second before first extension
    if (inst.timer >= 1.0) {
      inst.state = 'extending'
      inst.timer = 0
    }
  } else if (inst.state === 'extending') {
    // Extending phase: grow width over EXTENSION_DURATION
    const progress = Math.min(1, inst.timer / EXTENSION_DURATION)
    
    // Smoothly interpolate from current width to target width
    const startWidth = inst.targetWidth - extensionStep
    inst.currentWidth = startWidth + (extensionStep * progress)
    arm.width = inst.currentWidth
    
    //
    // Update outline widths to match arm
    //
    inst.armOutlineTop.width = inst.currentWidth
    inst.armOutlineBottom.width = inst.currentWidth
    
    // Update blade position to be at the end of the arm
    updateBladePosition(inst)
    
    // When extension completes, switch to pause
    if (progress >= 1) {
      inst.state = 'paused'
      inst.timer = 0
      sfx && Sound.playSpikeSound(sfx)
    }
  } else if (inst.state === 'paused') {
    // Paused phase: wait for PAUSE_DURATION
    if (inst.timer >= PAUSE_DURATION) {
      inst.state = 'extending'
      inst.timer = 0
      inst.targetWidth += extensionStep  // Set new target for next extension
    }
  }
}

/**
 * Update blade position to match arm position
 * @param {Object} inst - Blade arm instance
 */
function updateBladePosition(inst) {
  const { arm, blade, startX, currentWidth } = inst
  // Position blade at the end of the arm
  blade.spike.pos.x = startX + currentWidth
}

