import { CFG } from '../cfg.js'
import { getColor } from '../utils/helper.js'
import * as Spikes from '../sections/blades/components/spikes.js'
import * as Sound from '../utils/sound.js'

// Platform parameters
const DETECTION_DISTANCE = 100 // Distance to detect hero
const DROP_DURATION = 0.2      // Time to drop down (seconds)
const SPIKE_APPEAR_DELAY = 0.15 // Delay before spikes appear after drop starts (seconds)
const RAISE_DELAY = 2.0        // Time before raising back up (seconds)
const RAISE_TIMEOUT = 4.0      // Maximum time platform stays down (seconds)
const RAISE_DURATION = 0.5     // Time to raise up (seconds)

/**
 * Creates a moving platform that drops when hero approaches
 * @param {Object} config - Platform configuration
 * @param {Object} config.k - Kaplay instance
 * @param {number} config.x - X position (center)
 * @param {number} config.y - Y position (top of platform, at floor level)
 * @param {Object} config.hero - Hero instance to detect
 * @param {string} config.color - Platform color
 * @param {string} config.currentLevel - Current level name (e.g., 'level-1.1')
 * @param {boolean} [config.jumpToDisableSpikes=false] - If true, spikes disappear when hero jumps down
 * @param {boolean} [config.autoOpen=false] - If true, platform opens automatically on level start
 * @param {Object} [config.sfx] - Sound instance
 * @returns {Object} Platform instance
 */
export function create(config) {
  const { k, x, y, hero, color, currentLevel, jumpToDisableSpikes = false, autoOpen = false, sfx = null } = config
  
  // Calculate platform dimensions based on spike width
  const platformWidth = Spikes.getSpikeWidth(k)
  const platformHeight = k.height() - y  // Height from floor to bottom of screen
  const spikeHeight = Spikes.getSpikeHeight(k)
  
  // Create platform
  const platform = k.add([
    k.rect(platformWidth, platformHeight),
    k.pos(x, y),
    k.area(),
    k.body({ isStatic: true }),
    k.anchor("top"),
    getColor(k, color),
    k.z(CFG.visual.zIndex.platforms),
    "platform"
  ])
  
  // Create spikes at the TOP of platform (initially hidden)
  const spikes = Spikes.create({
    k,
    x: x,
    y: y - spikeHeight / 2,  // Above platform top
    hero,
    orientation: Spikes.ORIENTATIONS.FLOOR,  // Pointing up
    onHit: () => Spikes.handleCollision(spikes, currentLevel),
    sfx,
    color: CFG.colors[currentLevel]?.spikes
  })
  spikes.spike.opacity = 0  // Start hidden
  spikes.spike.z = CFG.visual.zIndex.platforms + 1  // Above platform
  spikes.collisionEnabled = false  // Disable collision when platform is up
  
  const inst = {
    platform,
    spikes,
    k,
    hero,
    sfx,
    jumpToDisableSpikes,
    platformWidth,
    heroInitialY: hero.character.pos.y,  // Store hero's initial Y position
    originalY: y,
    targetY: y,
    currentY: y,
    dropDistance: k.height() * 0.08,  // Drop by hero height (~8% of screen)
    state: 'idle',  // idle, dropping, waiting, disabled
    timer: 0,
    hasActivated: false  // Track if trap was activated at least once
  }
  
  // Auto-open platform if requested
  if (autoOpen) {
    // Start dropping immediately
    inst.state = 'dropping'
    inst.targetY = y + inst.dropDistance
    inst.timer = 0
    inst.hasActivated = true
    
    // Delay spike appearance - show spikes after platform drops a bit
    k.wait(SPIKE_APPEAR_DELAY, () => {
      // Play spike sound
      sfx && Sound.playSpikeSound(sfx)
      
      // Show spikes and enable collision
      k.tween(
        spikes.spike.opacity,
        1,
        0.3,
        (val) => spikes.spike.opacity = val,
        k.easings.linear
      )
      spikes.collisionEnabled = true
    })
  }
  
  // Update logic
  platform.onUpdate(() => updatePlatform(inst))
  
  return inst
}

/**
 * Update platform movement and detection
 * @param {Object} inst - Platform instance
 */
function updatePlatform(inst) {
  const { k, platform, spikes, hero, originalY, dropDistance, sfx, jumpToDisableSpikes, platformWidth } = inst
  
  // Check distance to hero (only check X distance, and only from left side)
  if (inst.state === 'idle' && !inst.hasActivated) {
    const distanceX = platform.pos.x - hero.character.pos.x
    
    // Hero approaching from left and within detection range
    if (distanceX > 0 && distanceX <= DETECTION_DISTANCE) {
      // Start dropping
      inst.state = 'dropping'
      inst.targetY = originalY + dropDistance
      inst.timer = 0
      inst.hasActivated = true  // Mark as activated permanently
      
      // Delay spike appearance - show spikes after platform drops a bit
      k.wait(SPIKE_APPEAR_DELAY, () => {
        // Play spike sound
        sfx && Sound.playSpikeSound(sfx)
        
        // Show spikes and enable collision
        k.tween(
          spikes.spike.opacity,
          1,
          0.3,
          (val) => spikes.spike.opacity = val,
          k.easings.linear
        )
        spikes.collisionEnabled = true  // Enable collision when spikes appear
      })
    }
  }
  
  // Handle dropping state
  if (inst.state === 'dropping') {
    inst.timer += k.dt()
    const progress = Math.min(1, inst.timer / DROP_DURATION)
    
    // Smooth drop animation
    const newY = originalY + dropDistance * progress
    const deltaY = newY - inst.currentY
    
    // Move platform
    platform.pos.y = newY
    
    // Move spikes with platform
    spikes.spike.pos.y += deltaY
    
    inst.currentY = newY
    
    if (progress >= 1) {
      inst.state = 'waiting'
      inst.timer = 0
    }
  }
  
  // Handle waiting state
  if (inst.state === 'waiting') {
    inst.timer += k.dt()
    
    // Special mode: hero jumps down to disable spikes
    if (jumpToDisableSpikes) {
      // Check if hero's CENTER is falling and is below the TOP of the platform
      const heroY = hero.character.pos.y
      const heroIsFalling = hero.character.vel && hero.character.vel.y > 0
      const platformTopY = originalY  // Top of the platform at original position
      const heroBelowPlatformTop = heroY > platformTopY + 20  // Hero center is 20px below platform top
      const heroIsNearPlatform = Math.abs(platform.pos.x - hero.character.pos.x) <= platformWidth / 2
      
      if (heroIsFalling && heroBelowPlatformTop && heroIsNearPlatform) {
        // Hero is falling into the pit! Disable spikes and start raising platform immediately
        spikes.spike.opacity = 0
        spikes.collisionEnabled = false
        
        // Start raising platform immediately (no waiting for landing)
        inst.state = 'disabled'
        inst.targetY = originalY
        inst.timer = 0
      }
    } else {
      // Standard mode: timer-based closing
      // Check if hero is still in detection range
      const distanceX = Math.abs(platform.pos.x - hero.character.pos.x)
      const heroStillNear = distanceX <= DETECTION_DISTANCE
      
      // Raise platform if: 
      // 1. Minimum delay passed AND hero left the area, OR
      // 2. Maximum timeout reached (regardless of hero position)
      const shouldRaise = (inst.timer >= RAISE_DELAY && !heroStillNear) || 
                          (inst.timer >= RAISE_TIMEOUT)
      
      if (shouldRaise) {
        inst.state = 'disabled'  // Switch to disabled state (never activates again)
        inst.targetY = originalY
        inst.timer = 0
        
        // Hide spikes and disable collision
        k.tween(
          spikes.spike.opacity,
          0,
          0.3,
          (val) => spikes.spike.opacity = val,
          k.easings.linear
        )
        spikes.collisionEnabled = false  // Disable collision when platform raises
      }
    }
  }
  
  // Handle raising state (platform returns to original position)
  if (inst.state === 'disabled') {
    inst.timer += k.dt()
    const progress = Math.min(1, inst.timer / RAISE_DURATION)
    
    // Smooth raise animation
    const startY = originalY + dropDistance
    const newY = startY + (originalY - startY) * progress
    const deltaY = newY - inst.currentY
    
    // Move platform
    platform.pos.y = newY
    
    // Move spikes with platform
    spikes.spike.pos.y += deltaY
    
    inst.currentY = newY
    
    // Stay in disabled state (never reset to idle)
    if (progress >= 1) {
      inst.state = 'disabled'  // Keep disabled, don't reset hasActivated
    }
  }
}


