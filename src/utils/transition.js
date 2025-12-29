import { CFG } from '../cfg.js'
import { parseHex } from './helper.js'
import { markSectionComplete, saveLastLevel } from './progress.js'

/**
 * Level transition configuration - maps current level to next level
 */
const LEVEL_TRANSITIONS = {
  'menu': 'level-word.0',
  'menu-time': 'level-time.0',
  'menu-touch': 'level-touch.0',
  'level-word.0': 'level-word.1',
  'level-word.1': 'level-word.2',
  'level-word.2': 'level-word.3',
  'level-word.3': 'level-word.4',
  'level-word.4': 'word-complete',
  'word-complete': 'menu',
  'level-time.0': 'level-time.1',
  'level-time.1': 'level-time.2',
  'level-time.2': 'level-time.3',
  'level-time.3': 'time-complete',
  'time-complete': 'menu',
  'level-touch.0': 'level-touch.1',
  'level-touch.1': 'menu'
}

/**
 * Get next level name
 * @param {string} currentLevel - Current level name
 * @returns {string|null} Next level name or null if not found
 */
export function getNextLevel(currentLevel) {
  return LEVEL_TRANSITIONS[currentLevel] || null
}

/**
 * Get previous level name (reverse lookup in LEVEL_TRANSITIONS)
 * @param {string} targetLevel - Target level name
 * @returns {string|null} Previous level name or null if not found
 */
function getPreviousLevel(targetLevel) {
  for (const [current, next] of Object.entries(LEVEL_TRANSITIONS)) {
    if (next === targetLevel) {
      return current
    }
  }
  return null
}

/**
 * Show transition screen and go to the specified target level
 * Finds the appropriate previous level to show the correct subtitle
 * @param {Object} k - Kaplay instance
 * @param {string} targetLevel - Target level to go to (e.g., 'level-word.2')
 */
export function showTransitionToLevel(k, targetLevel) {
  //
  // Find previous level to show correct subtitle
  //
  const previousLevel = getPreviousLevel(targetLevel)
  
  if (previousLevel) {
    //
    // Use normal transition from previous level
    //
    createLevelTransition(k, previousLevel)
  } else {
    //
    // No previous level found, go directly (shouldn't happen normally)
    //
    k.go(targetLevel)
  }
}

// Subtitles shown BEFORE entering each level (shifted forward by one)
const LEVEL_SUBTITLES = {
  'menu': '',
  'menu-time': '',
  'menu-touch': '',
  'level-word.0': 'words, they cut deeper than blades',
  'level-word.1': "sharp words don't cut - they make you fall",
  'level-word.2': "the words you can't forget hurt the most",
  'level-word.3': 'sharp words move fast - so must you',
  'level-word.4': 'words that kill',
  'level-time.0': 'time never waits, and neither should you',
  'level-time.1': 'do not touch the one',
  'level-time.2': 'digits sum even safe, sum odd deadly',
  'level-time.3': 'sections switch controls - watch the clocks',
  'level-touch.0': 'gather what crawls together to reach what stands above',
  'level-touch.1': 'the path is yours to climb'
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
 * User can press Space, ENTER or click mouse to skip the transition and go directly to next level
 * 
 * @param {Object} k - Kaplay instance
 * @param {string} currentLevel - Current level name (e.g., 'level-word.0' or 'menu')
 * @param {Function} onComplete - Callback when transition completes
 */
export function createLevelTransition(k, currentLevel, onComplete) {
  const nextLevel = LEVEL_TRANSITIONS[currentLevel]
  
  //
  // Check if section is completed (last level of section going to completion screen)
  //
  if (nextLevel === 'word-complete' || nextLevel === 'time-complete') {
    //
    // Extract section name from level name (e.g., 'level-word.4' -> 'word')
    //
    const sectionMatch = currentLevel.match(/level-(\w+)\.\d+/)
    if (sectionMatch) {
      const sectionName = sectionMatch[1]
      markSectionComplete(sectionName)
    }
  }
  
  if (!nextLevel) {
    // No transition defined, go directly
    onComplete?.()
    return
  }
  
  //
  // Save progress for next level immediately (before showing transition)
  // This ensures progress is saved even if user interrupts transition with ESC
  // But DON'T save progress for transitions from menu/menu-time, as these are entry points
  //
  const isLevelToLevelTransition = currentLevel.startsWith('level-') && nextLevel.startsWith('level-')
  if (isLevelToLevelTransition) {
    saveLastLevel(nextLevel)
  }
  
  let timer = 0
  //
  // Check if transitioning from a level or menu-time (not from menu)
  // If so, start with black_pause phase since overlay is already opaque
  //
  const isFromLevel = currentLevel !== 'menu' && currentLevel.startsWith('level-')
  const isFromMenuTime = currentLevel === 'menu-time'
  // Start with fade_to_black phase (unless from menu, menu-time or level, then skip to black_pause)
  let phase = (currentLevel === 'menu' || isFromLevel || isFromMenuTime) ? 'black_pause' : 'fade_to_black'
  const centerX = k.width() / 2
  const centerY = k.height() / 2
  
  // Instance object to store text reference
  const inst = {
    textObj: null,
    skipped: false,
    skipEnabled: false,  // Skip is disabled initially to prevent accidental skip
    skipEnableTimer: 0
  }
  
  //
  // Set background to black when transitioning from level or menu-time to hide gray platforms
  //
  if (isFromLevel || isFromMenuTime) {
    k.setBackground(k.Color.fromHex("#000000"))
  }
  
  //
  // Create black overlay (starts fully opaque if from level or menu-time, transparent if from menu)
  // Use very high z-index to ensure it covers all level elements including platforms
  //
  let overlay = k.add([
    k.rect(k.width(), k.height()),
    k.pos(0, 0),
    k.color(0, 0, 0),
    k.opacity(isFromLevel || isFromMenuTime ? 1 : (currentLevel === 'menu' ? 1 : 0)), // Start opaque if from level, menu-time or menu
    k.z(CFG.visual.zIndex.ui + 100),  // Very high z-index to cover all elements
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
    
    // Check for mouse click to skip (same as space/enter)
    if (inst.skipEnabled && k.isMousePressed()) {
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
          //
          // Get color based on section
          //
          let levelColorHex = "#6B8E9F" // Default steel blue (for word section)
          
          if (nextLevel.startsWith('level-time')) {
            //
            // Time section uses medium gray color
            //
            levelColorHex = "#808080"
          } else if (nextLevel.startsWith('level-word')) {
            //
            // Word section uses steel blue
            //
            levelColorHex = "#6B8E9F"
          } else if (nextLevel.startsWith('level-touch') || nextLevel === 'menu-touch') {
            //
            // Touch section uses reddened leaf color from first layer trees
            // More red version for better visibility
            //
            levelColorHex = "#8B4A3A"  // More red color similar to reddened autumn leaves
          }
          
          const [r, g, b] = parseHex(levelColorHex)
          
          const textObj = k.add([
            k.text(subtitle, {
              size: k.height() * 0.04,
              align: "center"
            }),
            k.pos(k.width() / 2, k.height() / 2),
            k.anchor("center"),
            k.color(r, g, b),
            k.opacity(0),
            k.z(CFG.visual.zIndex.ui + 101),  // Above overlay (which is ui + 100)
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
  //
  // We need access to AudioContext, so we'll create a simple version
  // In a real implementation, this would use the Sound module
  //
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
    const now = audioContext.currentTime
    //
    // High frequency sweep down (the "whine")
    //
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
    //
    // Low "thump" at the end
    //
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
    //
    // Silently fail if audio context is not available
    //
  }
}
