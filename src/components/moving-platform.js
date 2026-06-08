import { CFG } from '../cfg.js'
import { getColor } from '../utils/helper.js'
import * as Blades from '../sections/word/components/blades.js'
import * as Sound from '../utils/sound.js'

// Platform parameters
const DETECTION_DISTANCE = 100  // Distance to detect hero
const DROP_DURATION = 0.2       // Time to drop down (seconds)
const SPIKE_APPEAR_DELAY = 0.15 // Delay before blades appear after drop starts (seconds)
const RAISE_DELAY = 2.0         // Time before raising back up (seconds)
const RAISE_TIMEOUT = 6.0       // Maximum time platform stays down (seconds)
const RAISE_DURATION = 0.5      // Time to raise up (seconds)
//
// Quick blade fade when hero runs away before the pit closes —
// blades disappear first so the animation reads clearly
//
const BLADE_FADE_DURATION = 0.12
//
// Horizontal velocity below which the hero is considered stationary.
// Used by the stationaryOnly closing mode (word L4 right pit).
//
const STATIONARY_VEL_THRESHOLD = 20
const PIT_RATTLE_RANGE = 140
const PIT_RATTLE_COOLDOWN = 0.35
const PIT_STAND_VOLUME_SCALE = 1.85

/**
 * Creates a moving platform that drops when hero approaches
 * @param {Object} config - Platform configuration
 * @param {Object} config.k - Kaplay instance
 * @param {number} config.x - X position (center)
 * @param {number} config.y - Y position (top of platform, at floor level)
 * @param {Object} config.hero - Hero instance to detect
 * @param {string} config.color - Platform color
 * @param {string} config.currentLevel - Current level name (e.g., 'level-word.1')
 * @param {boolean} [config.jumpToDisableBlades=false] - If true, blades disappear when hero jumps down
 * @param {boolean} [config.autoOpen=false] - If true, platform opens automatically on level start
 * @param {Object} [config.sfx] - Sound instance
 * @param {number} [config.raiseTimeout] - Custom timeout before platform raises (seconds)
 * @param {number} [config.raiseDelay] - Minimum wait before pit closes after hero leaves (seconds)
 * @param {Function} [config.onBladeHit] - Custom callback when hero hits blades (overrides default)
 * @returns {Object} Platform instance
 */
export function create(config) {
  const { 
    k, 
    x, 
    y, 
    hero, 
    color, 
    currentLevel, 
    jumpToDisableBlades = false, 
    autoOpen = false, 
    sfx = null,
    raiseTimeout = RAISE_TIMEOUT,
    raiseDelay = RAISE_DELAY,
    onBladeHit = null,
    stationaryOnly = false
  } = config
  
  // Calculate platform dimensions based on blade width
  const platformWidth = Blades.getBladeWidth(k)
  const platformHeight = k.height() - y  // Height from floor to bottom of screen
  const bladeHeight = Blades.getBladeHeight(k)
  const dropDistance = k.height() * 0.08  // Drop by hero height (~8% of screen)
  
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
  
  // Create blades at the BOTTOM of the pit (where platform will drop to)
  const pitBottomY = y + dropDistance  // Bottom of pit when platform drops
  const blades = Blades.create({
    k,
    x: x,
    y: pitBottomY - bladeHeight / 2,  // Just above the floor of the pit
    hero,
    orientation: Blades.ORIENTATIONS.FLOOR,  // Pointing up
    onHit: onBladeHit ? () => onBladeHit(blades) : () => Blades.handleCollision(blades, currentLevel),
    sfx,
    color: CFG.visual.colors[currentLevel]?.blades,
    disableAnimation: true  // Disable vibration and glint for trap blades
  })
  blades.blade.opacity = 0  // Start hidden
  blades.blade.z = CFG.visual.zIndex.platforms + 1  // Above platform
  blades.collisionEnabled = false  // Disable collision when platform is up
  
  const inst = {
    platform,
    blades,
    k,
    hero,
    sfx,
    jumpToDisableBlades,
    raiseTimeout,
    raiseDelay,
    platformWidth,
    heroInitialY: hero.character.pos.y,
    originalY: y,
    targetY: y,
    currentY: y,
    dropDistance,
    state: 'idle',
    timer: 0,
    hasActivated: false,
    rattleCooldown: 0,
    //
    // When true the detection fires from either side (set automatically in reset())
    //
    bidirectional: false,
    //
    // When true closing timer only runs while the hero is stationary near the pit.
    // Useful for pits that should punish hesitation, not proximity (word L4 right pit).
    //
    stationaryOnly,
    //
    // Set to true when the pit closes due to the hero running away (temporary).
    // After the platform finishes rising the trap resets to idle so it can
    // re-open the next time the hero approaches.
    //
    shouldResetAfterRise: false,
    initialBladeY: blades.blade.pos.y
  }
  
  // Auto-open platform if requested
  if (autoOpen) {
    // Start dropping immediately
    inst.state = 'dropping'
    inst.targetY = y + inst.dropDistance
    inst.timer = 0
    inst.hasActivated = true
    
    // Delay blade appearance - show blades after platform drops a bit
    k.wait(SPIKE_APPEAR_DELAY, () => {
      // Play blade sound
      sfx && Sound.playBladeSound(sfx)
      
      // Show blades and enable collision
      k.tween(
        blades.blade.opacity,
        1,
        0.3,
        (val) => blades.blade.opacity = val,
        k.easings.linear
      )
      blades.collisionEnabled = true
    })
  }
  
  platform.onUpdate(() => onUpdate(inst))
  
  return inst
}

/**
 * Resets a platform trap to its initial idle state so it can fire again.
 * Call this when all traps must restart (e.g. anti-hero escape in word L2).
 * @param {Object} inst - Platform instance returned by create()
 */
export function reset(inst) {
  const { blades } = inst
  inst.state = 'idle'
  inst.hasActivated = false
  inst.shouldResetAfterRise = false
  //
  // After a reset the hero can approach from either side (e.g. returning from
  // the right in word L2 after the anti-hero escape).
  //
  inst.bidirectional = true
  inst.timer = 0
  inst.currentY = inst.originalY
  inst.platform.pos.y = inst.originalY
  blades.blade.pos.y = inst.initialBladeY
  blades.glintDrawer.pos.y = inst.initialBladeY
  blades.glintDrawer.hidden = false
  blades.blade.opacity = 0
  blades.collisionEnabled = false
}
//
// Update platform movement and detection
//
function onUpdate(inst) {
  const { k, platform, blades, hero, originalY, dropDistance, sfx, jumpToDisableBlades, platformWidth } = inst
  
  updatePitProximityRattle(inst)
  
  //
  // Check distance to hero and trigger the drop.
  // Normal mode: only detects hero approaching from the left (distanceX > 0).
  // Bidirectional mode (set after reset()): detects from either side — used when
  // the hero returns from the right after the anti-hero escape in word L2.
  //
  if (inst.state === 'idle' && !inst.hasActivated) {
    const distanceX = platform.pos.x - hero.character.pos.x
    const withinRange = inst.bidirectional
      ? Math.abs(distanceX) <= DETECTION_DISTANCE
      : (distanceX > 0 && distanceX <= DETECTION_DISTANCE)
    if (withinRange) {
      // Start dropping
      inst.state = 'dropping'
      inst.targetY = originalY + dropDistance
      inst.timer = 0
      inst.hasActivated = true  // Mark as activated permanently
      
      // Delay blade appearance - show blades after platform drops a bit
      k.wait(SPIKE_APPEAR_DELAY, () => {
        // Play blade sound
        sfx && Sound.playBladeSound(sfx)
        
        // Show blades and enable collision
        k.tween(
          blades.blade.opacity,
          1,
          0.3,
          (val) => blades.blade.opacity = val,
          k.easings.linear
        )
        blades.collisionEnabled = true  // Enable collision when blades appear
      })
    }
  }
  
  // Handle dropping state
  if (inst.state === 'dropping') {
    inst.timer += k.dt()
    const progress = Math.min(1, inst.timer / DROP_DURATION)
    
    // Smooth drop animation
    const newY = originalY + dropDistance * progress
    
    // Move platform
    platform.pos.y = newY
    
    inst.currentY = newY
    
    if (progress >= 1) {
      inst.state = 'waiting'
      inst.timer = 0
    }
  }
  
  //
  // Handle waiting state
  //
  if (inst.state === 'waiting') {
    //
    // Timer for jumpToDisableBlades timeout tracking (not used in proximity mode)
    //
    jumpToDisableBlades && (inst.timer += k.dt())
    //
    // Special mode: hero jumps down to disable blades
    //
    if (jumpToDisableBlades) {
      // Check if hero is falling and is above or near the pit
      const heroY = hero.character.pos.y
      const heroIsFalling = hero.character.vel && hero.character.vel.y > 0
      const platformTopY = originalY  // Top of the platform at original position
      const heroNearPlatformLevel = heroY >= platformTopY - 50  // Hero is near platform level (50px above or below)
      const heroIsNearPlatform = Math.abs(platform.pos.x - hero.character.pos.x) <= platformWidth / 2
      
      if (heroIsFalling && heroNearPlatformLevel && heroIsNearPlatform) {
        // Hero is falling into the pit! Disable blades immediately and start raising platform
        blades.blade.opacity = 0
        blades.collisionEnabled = false
        
        // Start raising platform immediately (no waiting for landing)
        inst.state = 'disabled'
        inst.targetY = originalY
        inst.timer = 0
      }
    } else {
      //
      // Proximity-based closing:
      // • Hero leaves  → pit closes immediately (temporary: resets to idle so
      //   the trap can fire again next time hero approaches).
      // • Hero stands near for raiseDelay seconds → pit closes permanently
      //   (stays disabled, same behaviour as before).
      //
      const distanceX = Math.abs(platform.pos.x - hero.character.pos.x)
      const heroStillNear = distanceX <= DETECTION_DISTANCE
      if (!heroStillNear) {
        //
        // Hero ran away — fade blades out first, then raise the platform.
        // blades_fading state prevents the disabled handler from running
        // until the quick fade is complete.
        //
        inst.timer = 0
        inst.shouldResetAfterRise = true
        inst.state = 'blades_fading'
        blades.collisionEnabled = false
        k.tween(blades.blade.opacity, 0, BLADE_FADE_DURATION, val => blades.blade.opacity = val, k.easings.linear)
      } else {
        //
        // stationaryOnly: timer only runs while the hero is not moving —
        // the pit closes after the hero has been standing still for raiseDelay.
        // Normal mode: always count (hero just needs to stay near).
        //
        if (inst.stationaryOnly) {
          const heroVelX = hero.character.vel ? Math.abs(hero.character.vel.x) : 0
          heroVelX < STATIONARY_VEL_THRESHOLD && (inst.timer += k.dt())
        } else {
          inst.timer += k.dt()
        }
      }
      const shouldRaise = inst.timer >= inst.raiseDelay && heroStillNear
      if (shouldRaise) {
        //
        // Fade blades out first (same quick BLADE_FADE_DURATION), then raise permanently.
        // shouldResetAfterRise = false keeps the trap in the disabled state after rising.
        //
        inst.timer = 0
        inst.shouldResetAfterRise = false
        inst.state = 'blades_fading'
        blades.collisionEnabled = false
        k.tween(blades.blade.opacity, 0, BLADE_FADE_DURATION, val => blades.blade.opacity = val, k.easings.linear)
      }
    }
  }
  
  //
  // Blades fade quickly before the platform rises (hero ran away path).
  // Once the fade timer elapses, hand off to the disabled / rise handler.
  //
  if (inst.state === 'blades_fading') {
    inst.timer += k.dt()
    if (inst.timer >= BLADE_FADE_DURATION) {
      inst.timer = 0
      inst.state = 'disabled'
      inst.targetY = originalY
    }
  }
  //
  // Handle raising state (platform returns to original position)
  //
  if (inst.state === 'disabled') {
    inst.timer += k.dt()
    const progress = Math.min(1, inst.timer / RAISE_DURATION)
    
    // Smooth raise animation
    const startY = originalY + dropDistance
    const newY = startY + (originalY - startY) * progress
    const deltaY = newY - inst.currentY
    
    // Move platform
    platform.pos.y = newY
    
    // Move blades with platform (they rise together)
    blades.blade.pos.y += deltaY
    blades.glintDrawer.pos.y += deltaY  // Move glint drawer too
    
    // Fade out blades much faster (disappear at 25% of raise animation)
    const fadeProgress = Math.min(1, progress * 4)  // 4x faster fade
    blades.blade.opacity = Math.max(0, 1 - fadeProgress)
    blades.glintDrawer.hidden = fadeProgress > 0  // Hide glint drawer immediately
    
    inst.currentY = newY
    
    if (progress >= 1) {
      if (inst.shouldResetAfterRise) {
        //
        // Temporary close: restore the trap to idle so it can fire again
        //
        inst.state = 'idle'
        inst.hasActivated = false
        inst.shouldResetAfterRise = false
        blades.blade.opacity = 0
        blades.blade.pos.y = inst.initialBladeY
        blades.glintDrawer.pos.y = inst.initialBladeY
        blades.glintDrawer.hidden = false
        blades.collisionEnabled = false
      } else {
        //
        // Permanent close: keep disabled, trap will not re-open
        //
        inst.state = 'disabled'
        blades.blade.opacity = 0
        blades.glintDrawer.hidden = true
        blades.collisionEnabled = false
      }
    }
  }
}

//
// Plays blade rattle while the pit is open; stops when blades are hidden
//
function updatePitProximityRattle(inst) {
  const { k, blades, hero, sfx, platform, platformWidth } = inst
  if (!sfx || !hero?.character?.pos || blades.blade.opacity < 0.08) return
  inst.rattleCooldown -= k.dt()
  if (inst.rattleCooldown > 0) return
  const dx = hero.character.pos.x - platform.pos.x
  const dy = hero.character.pos.y - blades.blade.pos.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist >= PIT_RATTLE_RANGE) return
  const proximity = 1 - dist / PIT_RATTLE_RANGE
  const overPitX = Math.abs(hero.character.pos.x - platform.pos.x) <= platformWidth / 2
  const volumeScale = overPitX ? PIT_STAND_VOLUME_SCALE : 1
  Sound.playBladeProximityRattle(sfx, proximity, volumeScale)
  inst.rattleCooldown = PIT_RATTLE_COOLDOWN
}


