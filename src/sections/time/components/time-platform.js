import { CFG } from '../cfg.js'
import * as Sound from '../../../utils/sound.js'
import * as Hero from '../../../components/hero.js'
//
// Time platform configuration
//
const FONT_SIZE = 48
const TIMER_DURATION = 3  // 3 seconds
const PLATFORM_WIDTH = 140
const PLATFORM_HEIGHT = 48

/**
 * Creates a time platform that disappears when timer reaches zero
 * @param {Object} config - Configuration
 * @param {Object} config.k - Kaplay instance
 * @param {number} config.x - X position
 * @param {number} config.y - Y position
 * @param {Object} config.hero - Hero instance to detect collision with
 * @param {boolean} [config.isFake=false] - If true, hero will pass through
 * @param {number} [config.duration=3] - Timer duration in seconds
 * @param {boolean} [config.persistent=false] - If true, platform never disappears and shows current time
 * @param {boolean} [config.showSecondsOnly=false] - If true, show only seconds (XX format)
 * @param {number} [config.initialTime=0] - Initial time in seconds (for persistent platforms)
 * @param {boolean} [config.killOnOne=false] - If true, kill hero when time contains digit 1
 * @param {boolean} [config.staticTime=false] - If true, time never updates (always shows initialTime)
 * @param {string} [config.currentLevel] - Current level name for restart on death
 * @param {Object} [config.sfx] - Sound instance for audio effects
 * @param {boolean} [config.hidden=false] - If true, text is hidden initially
 * @returns {Object} Time platform instance
 */
export function create(config) {
  const { k, x, y, hero, isFake = false, duration = TIMER_DURATION, persistent = false, showSecondsOnly = false, initialTime = 0, killOnOne = false, staticTime = false, currentLevel = null, sfx = null, hidden = false } = config
  //
  // Calculate platform size based on format
  // For seconds-only (XX), use smaller width to fit only two digits
  //
  const platformWidth = showSecondsOnly ? 60 : PLATFORM_WIDTH  // Smaller for XX format
  const platformHeight = PLATFORM_HEIGHT
  //
  // Create invisible collision box for the platform
  // Fake platforms have no body, so hero passes through
  // Hidden platforms also have no body until shown
  //
  const platformComponents = [
    k.rect(platformWidth, platformHeight),
    k.pos(x, y),
    k.area(),
    k.anchor("center"),
    k.opacity(0),  // Invisible, only text will be visible
    k.z(15),  // Same as platforms
    "time-platform"  // Tag for identification
  ]
  //
  // Only add body and platform tag if not fake and not hidden
  //
  if (!isFake && !hidden) {
    platformComponents.push(k.body({ isStatic: true }))
    platformComponents.push(CFG.game.platformName)
  }
  
  const platform = k.add(platformComponents)
  //
  // Create timer text
  //
  let initialText
  if (showSecondsOnly) {
    //
    // Show only seconds (XX format)
    //
    const currentSeconds = persistent ? initialTime : Math.ceil(duration)
    initialText = currentSeconds.toString().padStart(2, '0')
  } else {
    const initialSeconds = Math.ceil(duration)
    const minutes = Math.floor(initialSeconds / 60)
    const secs = initialSeconds % 60
    initialText = `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  
  //
  // Create timer text with manual outline
  // Draw black outline by creating 8 text objects with offsets
  //
  const outlineOffsets = [
    [-2, -2], [0, -2], [2, -2],
    [-2, 0],           [2, 0],
    [-2, 2],  [0, 2],  [2, 2]
  ]
  
  const outlineTexts = outlineOffsets.map(([ox, oy]) => {
    return k.add([
      k.text(initialText, {
        size: FONT_SIZE,
        font: CFG.visual.fonts.regularFull.replace(/'/g, ''),
        align: "center"
      }),
      k.pos(x + ox, y + oy),
      k.anchor("center"),
      k.color(0, 0, 0),  // Black outline
      k.z(16)  // Above platforms
    ])
  })
  
  const timerText = k.add([
    k.text(initialText, {
      size: FONT_SIZE,
      font: CFG.visual.fonts.regularFull.replace(/'/g, ''),
      align: "center"
    }),
    k.pos(x, y),
    k.anchor("center"),
    k.color(192, 192, 192),  // Light gray (same as hero)
    k.opacity(hidden ? 0 : 1),  // Hide text if hidden flag is set
    k.z(16)  // Above platforms
  ])
  
  //
  // Set initial opacity for outline texts
  //
  outlineTexts.forEach(outlineText => {
    outlineText.opacity = hidden ? 0 : 1
  })
  
  const inst = {
    k,
    platform,
    timerText,
    outlineTexts,
    hero,
    timeRemaining: duration,
    isActive: persistent,  // If persistent, always active
    isDestroyed: false,
    wasGroundedLastFrame: false,
    isFake,
    persistent,
    showSecondsOnly,
    currentTime: persistent ? initialTime : 0,  // Current time in seconds (for persistent platforms)
    initialTime: persistent ? initialTime : 0,  // Store initial time for staticTime platforms
    updateTimer: 0,  // Timer for updating persistent time
    killOnOne,
    staticTime,
    currentLevel,
    sfx,
    hidden
  }
  
  return inst
}

/**
 * Updates time platform
 * @param {Object} inst - Time platform instance
 */
export function onUpdate(inst) {
  if (inst.isDestroyed) return
  
  //
  // Handle persistent platforms (show current time, never disappear)
  //
  if (inst.persistent) {
    //
    // If staticTime is true, always show initialTime and never update
    //
    if (inst.staticTime) {
      //
      // Ensure text always shows initialTime for static platforms
      //
      let staticText
      if (inst.showSecondsOnly) {
        const secs = inst.initialTime % 60
        staticText = secs.toString().padStart(2, '0')
      } else {
        const minutes = Math.floor(inst.initialTime / 60)
        const secs = inst.initialTime % 60
        staticText = `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      }
      
      //
      // Update text if it doesn't match initialTime
      //
      if (inst.timerText.text !== staticText) {
        inst.timerText.text = staticText
      }
      inst.outlineTexts.forEach(outlineText => {
        if (outlineText.text !== staticText) {
          outlineText.text = staticText
        }
      })
    } else {
      inst.updateTimer += inst.k.dt()
      //
      // Update time every second
      //
      if (inst.updateTimer >= 1.0) {
        inst.currentTime++
        inst.updateTimer = 0
        
        let newText
        if (inst.showSecondsOnly) {
          //
          // Show only seconds (XX format)
          //
          const secs = inst.currentTime % 60
          newText = secs.toString().padStart(2, '0')
        } else {
          const minutes = Math.floor(inst.currentTime / 60)
          const secs = inst.currentTime % 60
          newText = `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
        }
        
        //
        // Update text (Kaplay should handle this automatically)
        //
        if (inst.timerText.text !== newText) {
          inst.timerText.text = newText
        }
        inst.outlineTexts.forEach(outlineText => {
          if (outlineText.text !== newText) {
            outlineText.text = newText
          }
        })
      }
    }
    //
    // Check for killOnOne logic: kill hero if time contains digit 1 and hero is on platform
    // Only kill if platform is visible (not hidden)
    //
    if (inst.killOnOne && !inst.hidden && inst.hero && inst.hero.character && !inst.hero.isDying && !inst.hero.isAnnihilating) {
      //
      // Get current displayed text
      //
      const currentText = inst.timerText.text
      //
      // Check if text contains digit 1
      //
      if (currentText.includes('1')) {
        //
        // Check if hero is on this platform
        //
        if (inst.platform.isColliding(inst.hero.character)) {
          //
          // Kill hero
          //
          Hero.death(inst.hero, () => {
            if (inst.currentLevel) {
              inst.k.go(inst.currentLevel)
            }
          })
        }
      }
    }
    return  // Persistent platforms don't disappear
  }
  
  //
  // Check if hero landed on the platform
  //
  if (!inst.isActive && inst.hero && inst.hero.character) {
    const heroChar = inst.hero.character
    const isGrounded = heroChar.isGrounded()
    //
    // Activate timer when hero lands (transitions from air to grounded)
    //
    if (isGrounded && !inst.wasGroundedLastFrame) {
      //
      // Check if hero is actually on THIS platform using collision check
      //
      if (inst.platform.isColliding(heroChar)) {
        inst.isActive = true
      }
    }
    
    inst.wasGroundedLastFrame = isGrounded
  }
  //
  // Update timer if active
  //
  if (inst.isActive && inst.timeRemaining > 0) {
    inst.timeRemaining -= inst.k.dt()
    //
    // Update text
    //
    const seconds = Math.max(0, Math.ceil(inst.timeRemaining))
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    const newText = `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    inst.timerText.text = newText
    //
    // Update outline texts
    //
    inst.outlineTexts.forEach(outlineText => {
      outlineText.text = newText
    })
    //
    // Destroy when timer reaches zero
    //
    if (inst.timeRemaining <= 0) {
      destroy(inst)
    }
  }
}

/**
 * Shows the time platform text and enables collision
 * @param {Object} inst - Time platform instance
 */
export function show(inst) {
  if (inst.isDestroyed) return
  
  inst.hidden = false
  inst.timerText.opacity = 1
  inst.outlineTexts.forEach(outlineText => {
    outlineText.opacity = 1
  })
  
  //
  // For staticTime platforms, ensure text shows initialTime
  //
  if (inst.staticTime && inst.persistent) {
    let staticText
    if (inst.showSecondsOnly) {
      const secs = inst.initialTime % 60
      staticText = secs.toString().padStart(2, '0')
    } else {
      const minutes = Math.floor(inst.initialTime / 60)
      const secs = inst.initialTime % 60
      staticText = `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    
    inst.timerText.text = staticText
    inst.outlineTexts.forEach(outlineText => {
      outlineText.text = staticText
    })
  }
  
  //
  // Add body and platform tag if platform doesn't have them yet
  // (platforms created with hidden=true don't have body initially)
  //
  if (!inst.isFake && !inst.platform.body) {
    inst.platform.use(inst.k.body({ isStatic: true }))
    inst.platform.use(CFG.game.platformName)
  }
}

/**
 * Destroys the time platform
 * @param {Object} inst - Time platform instance
 */
function destroy(inst) {
  if (inst.isDestroyed) return
  
  inst.isDestroyed = true
  //
  // Play disappear sound
  //
  if (inst.sfx) {
    Sound.playPlatformDisappearSound(inst.sfx)
  }
  //
  // Remove platform and text
  //
  if (inst.platform.exists()) {
    inst.k.destroy(inst.platform)
  }
  if (inst.timerText.exists()) {
    inst.k.destroy(inst.timerText)
  }
  //
  // Remove outline texts
  //
  inst.outlineTexts.forEach(outlineText => {
    if (outlineText.exists()) {
      inst.k.destroy(outlineText)
    }
  })
}

