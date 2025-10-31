import { CFG } from '../cfg.js'
import { getRGB } from './helper.js'

/**
 * Level transition configuration - maps current level to next level
 */
const LEVEL_TRANSITIONS = {
  'menu': 'level-1.0',
  'level-1.0': 'level-1.1',
  'level-1.1': 'level-1.2',
  'level-1.2': 'level-1.3',
  'level-1.3': 'level-1.4',
  'level-1.4': 'menu'
}

// Subtitles shown BEFORE entering each level (shifted forward by one)
const LEVEL_SUBTITLES = {
  'menu': '',      // Before Level 0
  'level-1.0': 'words, they cut deeper than steel',     // Before Level 1
  'level-1.1': 'leaving scars that never heal',         // Before Level 2
  'level-1.2': 'silent wounds that never close',        // Before Level 3
  'level-1.3': 'until nothing remains but echoes',      // Before Level 4
  'level-1.4': 'some words are sharper than any blade'  // No subtitle when returning to menu
}

const FADE_TO_BLACK_DURATION = 0.8   // Duration of fade to black
const BLACK_PAUSE_DURATION = 0.5     // Pause before text appears
const TEXT_FADE_IN_DURATION = 1.0    // Duration of text fade in
const TEXT_HOLD_DURATION = 2.0       // Duration text stays visible
const TEXT_FADE_OUT_DURATION = 1.0   // Duration of text fade out
const FINAL_PAUSE_DURATION = 0.3     // Pause after text fades out before level load

/**
 * Creates a fade to black transition effect between levels
 * Shows subtitle BEFORE entering the next level
 * 1. Fade to black (0.8s)
 * 2. Black screen pause (0.5s)
 * 3. Subtitle text appears (fade in 1s, hold 2s, fade out 1s)
 * 4. Final pause (0.3s)
 * 5. Load new level
 * 
 * User can press SPACE or ENTER to skip the transition and go directly to next level
 * 
 * @param {Object} k - Kaplay instance
 * @param {string} currentLevel - Current level name (e.g., 'level-1.0' or 'menu')
 * @param {Function} onComplete - Callback when transition completes
 */
export function createLevelTransition(k, currentLevel, onComplete) {
  const nextLevel = LEVEL_TRANSITIONS[currentLevel]
  
  if (!nextLevel) {
    // No transition defined, go directly
    onComplete?.()
    return
  }
  
  let timer = 0
  // Start with fade_to_black phase (unless from menu, then skip to black_pause)
  let phase = currentLevel === 'menu' ? 'black_pause' : 'fade_to_black'
  const centerX = k.width() / 2
  const centerY = k.height() / 2
  
  // Instance object to store text reference
  const inst = {
    textObj: null,
    skipped: false,
    skipEnabled: false,  // Skip is disabled initially to prevent accidental skip
    skipEnableTimer: 0
  }
  
  // Create black overlay (starts transparent, fades to opaque)
  let overlay = k.add([
    k.rect(k.width(), k.height()),
    k.pos(0, 0),
    k.color(0, 0, 0),
    k.opacity(currentLevel === 'menu' ? 1 : 0), // Start opaque if from menu, transparent otherwise
    k.z(CFG.visual.zIndex.ui + 10),
    k.fixed()
  ])
  
  // Function to skip transition and go directly to next level
  const skipTransition = () => {
    if (inst.skipped) return // Already skipped
    inst.skipped = true
    
    // Clean up
    transitionInterval.cancel()
    overlay && overlay.exists() && k.destroy(overlay)
    inst.textObj && inst.textObj.exists() && k.destroy(inst.textObj)
    
    // Go to next level
    k.go(nextLevel)
  }
  
  const updateTransition = () => {
    // Enable skip after 0.3 seconds to prevent accidental skip from menu button press
    if (!inst.skipEnabled) {
      inst.skipEnableTimer += k.dt()
      if (inst.skipEnableTimer >= 0.3) {
        inst.skipEnabled = true
      }
    }
    
    // Check for skip keys (space or enter) in update loop for better reliability
    if (inst.skipEnabled && (k.isKeyPressed("space") || k.isKeyPressed("enter"))) {
      skipTransition()
      return
    }
    
    timer += k.dt()
    
    if (phase === 'fade_to_black') {
      // Fade overlay from transparent to opaque
      const progress = Math.min(timer / FADE_TO_BLACK_DURATION, 1)
      overlay.opacity = progress
      
      if (progress >= 1) {
        phase = 'black_pause'
        timer = 0
      }
    } else if (phase === 'black_pause') {
      // Pause with black screen before text appears
      if (timer >= BLACK_PAUSE_DURATION) {
        phase = 'text_fade_in'
        timer = 0
        
        // Create subtitle text for NEXT level (the one we're transitioning TO)
        const subtitle = LEVEL_SUBTITLES[nextLevel] || ''
        
        if (subtitle) {
          // Get red color from level config (same as title/spikes)
          let levelColorHex = "DC143C" // Default crimson red
          
          try {
            if (CFG && CFG.colors && CFG.colors[currentLevel] && CFG.colors[currentLevel].spikes) {
              levelColorHex = CFG.colors[currentLevel].spikes
            }
          } catch (e) {
            console.warn('Could not get level color, using default:', e)
          }
          
          const rgb = getRGB(k, levelColorHex)
          
          const textObj = k.add([
            k.text(subtitle, {
              size: k.height() * 0.04,
              font: "jetbrains",
              align: "center"
            }),
            k.pos(k.width() / 2, k.height() / 2),
            k.anchor("center"),
            k.color(rgb.r, rgb.g, rgb.b),
            k.opacity(0),
            k.z(CFG.visual.zIndex.ui + 11),
            k.fixed()
          ])
          
          // Store text object in inst-like structure
          inst.textObj = textObj
        } else {
          // No subtitle, go to next level immediately
          transitionInterval.cancel()
          overlay.exists() && k.destroy(overlay)
          k.go(nextLevel)
        }
      }
    } else if (phase === 'text_fade_in') {
      // Fade in text
      const progress = Math.min(timer / TEXT_FADE_IN_DURATION, 1)
      if (inst.textObj) {
        inst.textObj.opacity = progress
      }
      
      if (progress >= 1) {
        phase = 'text_hold'
        timer = 0
      }
    } else if (phase === 'text_hold') {
      // Hold text visible
      if (timer >= TEXT_HOLD_DURATION) {
        phase = 'text_fade_out'
        timer = 0
      }
    } else if (phase === 'text_fade_out') {
      // Fade out text
      const progress = Math.min(timer / TEXT_FADE_OUT_DURATION, 1)
      if (inst.textObj) {
        inst.textObj.opacity = 1 - progress
      }
      
      if (progress >= 1) {
        // Clean up text
        if (inst.textObj) {
          inst.textObj.exists() && k.destroy(inst.textObj)
          inst.textObj = null
        }
        
        phase = 'final_pause'
        timer = 0
      }
    } else if (phase === 'final_pause') {
      // Short pause after text fades out before loading new level
      if (timer >= FINAL_PAUSE_DURATION) {
        // Clean up and go to next level
        transitionInterval.cancel()
        overlay.exists() && k.destroy(overlay)
        
        // Go to next level
        k.go(nextLevel)
      }
    }
  }
  
  const transitionInterval = k.onUpdate(updateTransition)
  
  // Return cleanup function
  return () => {
    transitionInterval.cancel()
    overlay && overlay.exists() && k.destroy(overlay)
    inst.textObj && inst.textObj.exists() && k.destroy(inst.textObj)
  }
}

/**
 * Play CRT TV shutdown sound effect
 * @param {Object} k - Kaplay instance
 */
function playCRTShutdownSound(k) {
  // We need access to AudioContext, so we'll create a simple version
  // In a real implementation, this would use the Sound module
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
    const now = audioContext.currentTime
    
    // High frequency sweep down (the "whine")
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(8000, now)
    oscillator.frequency.exponentialRampToValueAtTime(100, now + 0.3)
    
    gainNode.gain.setValueAtTime(0.3, now)
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4)
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    oscillator.start(now)
    oscillator.stop(now + 0.4)
    
    // Low "thump" at the end
    const thump = audioContext.createOscillator()
    const thumpGain = audioContext.createGain()
    
    thump.type = 'sine'
    thump.frequency.setValueAtTime(60, now + 0.5)
    
    thumpGain.gain.setValueAtTime(0, now + 0.5)
    thumpGain.gain.linearRampToValueAtTime(0.4, now + 0.52)
    thumpGain.gain.exponentialRampToValueAtTime(0.01, now + 0.7)
    
    thump.connect(thumpGain)
    thumpGain.connect(audioContext.destination)
    
    thump.start(now + 0.5)
    thump.stop(now + 0.7)
  } catch (e) {
    // Silently fail if audio context is not available
    console.warn('Could not play CRT shutdown sound:', e)
  }
}
