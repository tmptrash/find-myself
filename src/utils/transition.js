import { CFG } from '../cfg.js'
import { parseHex } from './helper.js'
import { setSectionCompleted, set } from './progress.js'
import * as Sound from './sound.js'
import { stopTimeSectionMusic } from '../sections/time/components/scene-helper.js'

/**
 * Level transition configuration - maps current level to next level
 */
// TODO: complete this by two items arrays
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
  'level-touch.1': 'level-touch.2',
  'level-touch.2': 'level-touch.3',
  'level-touch.3': 'touch-complete',
  'touch-complete': 'menu'
}

// Subtitles shown BEFORE entering each level (shifted forward by one)
// Format: [text, sound_id, hold_duration] or just text (for touch section)
const LEVEL_SUBTITLES = {
  'menu': '',
  'menu-time': '',
  'menu-touch': '',
  'level-word.0': ['you are inside your own head now. these words\n\nare your thoughts — the voices within you.\n\nsome of them cut deeper than blades.', 'word0-pre', 13],
  'level-word.1': ['sharp words don\'t cut - they make you fall', 'word1-pre', 3.5],
  'level-word.2': ['the words you can\'t forget hurt the most', 'word2-pre', 3.0],
  'level-word.3': ['sharp words move fast - so must you', 'word3-pre', 3.0],
  'level-word.4': ['words that kill...', 'word4-pre', 2.5],
  'level-time.0': ['you are young and everything is new. time moves\n\nforward even when you stand still. this is the\n\nfirst thing you learn. you start to notice it\n\nslipping — and you start to run.', 'time0-pre', 14],
  'level-time.1': ['you are growing. you are learning. numbers begin\n\nto surround you. growing up means learning what you\n\ncan touch — and what you should leave alone. do not\n\ntouch the one.', 'time1-pre', 17],
  'level-time.2': ['rules appear. some protect you, some punish you.\n\nmistakes are allowed — but not forever. digits sum\n\neven safe, sum odd deadly.', 'time2-pre', 18],
  'level-time.3': ['life consumes time while you hesitate. act too\n\nslow — and it will catch you. throw snow. move\n\nfast. everything happens at once.', 'time3-pre', 16],
  'level-touch.0': ['gather what crawls together to reach what stands above.\n\npay attention to how they behave when you are near.', 'touch0-pre', 8],
  'level-touch.1': ['touch the roots in sequence - find the melody that awakens', 'touch1-pre', 5],
  'level-touch.2': ['jump to reveal the path - find what stands nearby', 'touch2-pre', 4],
}

const FADE_TO_BLACK_DURATION = 0.8   // Duration of fade to black
const BLACK_PAUSE_DURATION = 0.5     // Pause before text appears
const TEXT_FADE_IN_DURATION = 1.0    // Duration of text fade in
const DEFAULT_TEXT_HOLD_DURATION = 3.0  // Default duration if not specified in subtitle
const TEXT_FADE_OUT_DURATION = 1.0   // Duration of text fade out
const FINAL_PAUSE_DURATION = 0.3     // Pause after text fades out before level load
const SCENE_FADE_IN_DURATION = 0.5   // Duration of fade-in overlay when entering new scene
const TEXT_OUTLINE_OFFSET = 2        // Pixel offset for text outline shadows
//
// Subtitle colors per section (matches anti-hero hover color in menu scene)
//
const TIME_SUBTITLE_COLOR = '#FF8C00'
const SECTION_SUBTITLE_COLORS = {
  time: TIME_SUBTITLE_COLOR,
  word: CFG.visual.colors.sections.word.body,
  touch: CFG.visual.colors.sections.touch.body,
  feel: CFG.visual.colors.sections.feel.body,
  mind: CFG.visual.colors.sections.mind.body,
  stress: CFG.visual.colors.sections.stress.body
}
const DEFAULT_SUBTITLE_COLOR = '#6B8E9F'

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
  // Validate target level exists in known transitions
  //
  if (!targetLevel || !LEVEL_TRANSITIONS[targetLevel]) {
    const isValidTarget = Object.values(LEVEL_TRANSITIONS).includes(targetLevel)
    if (!isValidTarget) {
      k.go('menu')
      return
    }
  }
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
    k.go(targetLevel)
  }
}
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
  const nextLevel = LEVEL_TRANSITIONS[currentLevel] || null
  //
  // Check if section is completed (last level of section going to completion screen)
  //
  if (nextLevel === 'word-complete' || nextLevel === 'time-complete' || nextLevel === 'touch-complete') {
    //
    // Extract section name from level name (e.g., 'level-word.4' -> 'word')
    //
    const sectionMatch = currentLevel.match(/level-(\w+)\.\d+/)
    if (sectionMatch) {
      const sectionName = sectionMatch[1]
      setSectionCompleted(sectionName)
    }
    //
    // Save completion screen as lastLevel so continue returns to menu
    //
    //
    // Set lastLevel to the first level of the NEXT section
    //
    if (nextLevel === 'word-complete') set('lastLevel', 'level-touch.0')
    if (nextLevel === 'time-complete') set('lastLevel', 'level-word.0')
    if (nextLevel === 'touch-complete') set('lastLevel', 'menu')
    //
    // Go directly to completion screen without transition overlay
    //
    k.go(nextLevel)
    return
  }
  
  if (!nextLevel) {
    // No transition defined, go directly
    onComplete?.()
    return
  }
  //
  // IMMEDIATELY stop all background sounds when transition starts
  // This prevents sounds from playing during transition text
  //
  stopTimeSectionMusic(k)
  //
  // Mute procedural sounds (like spike glints)
  //
  Sound.muteProceduralSounds()
  //
  // Store original volume and mute all sounds
  //
  const originalVolume = k.volume()
  k.volume(0)
  const soundsToStop = ['clock', 'time', 'time0-kids', 'word', 'breath', 'touch', 'menu', 'boss']
  soundsToStop.forEach(soundName => {
    try {
      const sound = k.getSound(soundName)
      if (sound) {
        sound.stop()
        sound.paused = true
      }
    } catch (e) {
      // Sound not found or already stopped
    }
  })
  //
  // Save progress for next level immediately (before showing transition)
  // This ensures progress is saved even if user interrupts transition with ESC
  // But DON'T save progress for transitions from menu/menu-time/menu-touch, as these are entry points
  //
  const isLevelToLevelTransition = currentLevel.startsWith('level-') && nextLevel.startsWith('level-')
  if (isLevelToLevelTransition) {
    set('lastLevel', nextLevel)
  } else if (nextLevel === 'time-complete') {
    //
    // When completing time section, save first level of next section (word) instead of completion screen
    //
    set('lastLevel', 'level-word.0')
  }
  
  let timer = 0
  //
  // Check if transitioning from a level, menu-time, or menu-touch (not from menu)
  // If so, start with black_pause phase since overlay is already opaque (no slow fade)
  //
  const isFromLevel = currentLevel !== 'menu' && currentLevel.startsWith('level-')
  const isFromMenuTime = currentLevel === 'menu-time'
  const isFromMenuTouch = currentLevel === 'menu-touch'
  // Start with fade_to_black phase (unless from menu, menu-time, menu-touch or level, then skip to black_pause)
  let phase = (currentLevel === 'menu' || isFromLevel || isFromMenuTime || isFromMenuTouch) ? 'black_pause' : 'fade_to_black'
  
  // Instance object to store text reference
  const inst = {
    textObj: null,
    outlineTexts: null,
    skipped: false,
    skipEnabled: false,
    skipEnableTimer: 0,
    textHoldDuration: DEFAULT_TEXT_HOLD_DURATION,
    soundName: null,
    textSound: null,
    soundsStopped: false,
    originalVolume: originalVolume
  }
  
  //
  // Set background to menu color when transitioning from level, menu-time, or menu-touch
  //
  const transitionBgHex = CFG.visual.colors.menu.platformColor
  const [bgR, bgG, bgB] = parseHex(transitionBgHex)
  if (isFromLevel || isFromMenuTime || isFromMenuTouch) {
    k.setBackground(k.Color.fromHex(transitionBgHex))
  }
  //
  // Create overlay matching menu background color
  // Starts fully opaque if from level, menu-time, or menu-touch, transparent if from menu
  //
  let overlay = k.add([
    k.rect(k.width(), k.height()),
    k.pos(0, 0),
    k.color(bgR, bgG, bgB),
    k.opacity(isFromLevel || isFromMenuTime || isFromMenuTouch ? 1 : (currentLevel === 'menu' ? 1 : 0)),
    k.z(CFG.visual.zIndex.ui + 100),
    k.fixed()
  ])
  
  // Function to skip transition and go directly to next level
  const skipTransition = () => {
    if (inst.skipped) return // Already skipped
    inst.skipped = true
    
    // Clean up
    transitionInterval.cancel()
    inst.textObj && inst.textObj.exists() && k.destroy(inst.textObj)
    inst.outlineTexts && inst.outlineTexts.forEach(o => o.exists() && k.destroy(o))
    //
    // Restore volume and unmute procedural sounds before going to next level
    //
    k.volume(inst.originalVolume)
    Sound.unmuteProceduralSounds()
    //
    // Go to next level and add fade-in overlay so new scene doesn't flash
    //
    k.go(nextLevel)
    createSceneFadeIn(k, bgR, bgG, bgB)
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
      //
      // Stop all background sounds immediately when transition starts
      //
      if (timer === 0 || !inst.soundsStopped) {
        inst.soundsStopped = true
        stopTimeSectionMusic(k)
        const soundsToStop = ['clock', 'time', 'time0-kids', 'word', 'breath', 'touch', 'menu', 'boss']
        soundsToStop.forEach(soundName => {
          try {
            const sound = k.getSound(soundName)
            if (sound) {
              sound.stop()
            }
          } catch (e) {
            // Sound not found or already stopped
          }
        })
      }
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
        const subtitle = Array.isArray(LEVEL_SUBTITLES[nextLevel]) ? LEVEL_SUBTITLES[nextLevel]?.[0] : LEVEL_SUBTITLES[nextLevel]
        const soundName = Array.isArray(LEVEL_SUBTITLES[nextLevel]) ? LEVEL_SUBTITLES[nextLevel]?.[1] : null
        const textHoldDuration = Array.isArray(LEVEL_SUBTITLES[nextLevel]) ? LEVEL_SUBTITLES[nextLevel]?.[2] : DEFAULT_TEXT_HOLD_DURATION
        
        inst.soundName = soundName
        inst.textHoldDuration = textHoldDuration || DEFAULT_TEXT_HOLD_DURATION

        if (subtitle) {
          //
          // Stop all music and sound effects, keep only voice-over (xxx-pre files)
          //
          stopTimeSectionMusic(k)
          //
          // Stop all Kaplay sounds except voice-over (xxx-pre files)
          // Stop clock.mp3, time.mp3, time0-kids.mp3, word.mp3, touch.mp3, menu.mp3
          //
          const soundsToStop = ['clock', 'time', 'time0-kids', 'word', 'breath', 'touch', 'menu', 'boss']
          soundsToStop.forEach(soundName => {
            try {
              const sound = k.getSound(soundName)
              if (sound) {
                sound.stop()
              }
            } catch (e) {
              // Sound not found or already stopped
            }
          })
          //
          // Stop global background music if playing
          //
          const soundInst = Sound.create()
          Sound.stopBackgroundMusic(soundInst)
          //
          // Get color based on section (matches anti-hero hover color in menu)
          //
          const levelColorHex = getSectionSubtitleColor(nextLevel)
          
          const [r, g, b] = parseHex(levelColorHex)
          const textSize = k.height() * 0.04
          const textX = k.width() / 2
          const textY = k.height() / 2
          //
          // Create 8-direction outline shadows (black)
          //
          const outlineOffsets = [
            [-TEXT_OUTLINE_OFFSET, 0], [TEXT_OUTLINE_OFFSET, 0],
            [0, -TEXT_OUTLINE_OFFSET], [0, TEXT_OUTLINE_OFFSET],
            [-TEXT_OUTLINE_OFFSET, -TEXT_OUTLINE_OFFSET], [TEXT_OUTLINE_OFFSET, -TEXT_OUTLINE_OFFSET],
            [-TEXT_OUTLINE_OFFSET, TEXT_OUTLINE_OFFSET], [TEXT_OUTLINE_OFFSET, TEXT_OUTLINE_OFFSET]
          ]
          const outlineTexts = outlineOffsets.map(([dx, dy]) => k.add([
            k.text(subtitle, { size: textSize, align: "center" }),
            k.pos(textX + dx, textY + dy),
            k.anchor("center"),
            k.color(0, 0, 0),
            k.opacity(0),
            k.z(CFG.visual.zIndex.ui + 101),
            k.fixed()
          ]))
          //
          // Create main colored text above outlines
          //
          const textObj = k.add([
            k.text(subtitle, { size: textSize, align: "center" }),
            k.pos(textX, textY),
            k.anchor("center"),
            k.color(r, g, b),
            k.opacity(0),
            k.z(CFG.visual.zIndex.ui + 102),
            k.fixed()
          ])
          inst.textObj = textObj
          inst.outlineTexts = outlineTexts
        } else {
          // No subtitle, go to next level immediately
          transitionInterval.cancel()
          overlay.exists() && k.destroy(overlay)
          //
          // Restore volume and unmute procedural sounds before going to next level
          //
          k.volume(inst.originalVolume)
          Sound.unmuteProceduralSounds()
          k.go(nextLevel)
        }
      }
    } else if (phase === 'text_fade_in') {
      //
      // Start level related description sound before it starts
      //
      if (!inst.textSound && inst.soundName) {
        // Restore volume to play transition sound (xxx-pre.mp3)
        k.volume(inst.originalVolume)
        inst.textSound = Sound.playInScene(k, inst.soundName, CFG.audio.backgroundMusic.words)
        // Don't mute again - let the transition sound play
      }
      // Fade in text
      const progress = Math.min(timer / TEXT_FADE_IN_DURATION, 1)
      if (inst.textObj) {
        inst.textObj.opacity = progress
        inst.outlineTexts && inst.outlineTexts.forEach(o => { o.opacity = progress })
      }
      
      if (progress >= 1) {
        phase = 'text_hold'
        timer = 0
      }
    } else if (phase === 'text_hold') {
      // Hold text visible
      if (timer >= inst.textHoldDuration) {
        phase = 'text_fade_out'
        timer = 0
      }
    } else if (phase === 'text_fade_out') {
      // Fade out text
      const progress = Math.min(timer / TEXT_FADE_OUT_DURATION, 1)
      if (inst.textObj) {
        inst.textObj.opacity = 1 - progress
        inst.outlineTexts && inst.outlineTexts.forEach(o => { o.opacity = 1 - progress })
      }
      
      if (progress >= 1) {
        // Clean up text and outlines
        if (inst.textObj) {
          inst.textObj.exists() && k.destroy(inst.textObj)
          inst.textObj = null
        }
        if (inst.outlineTexts) {
          inst.outlineTexts.forEach(o => o.exists() && k.destroy(o))
          inst.outlineTexts = null
        }
        
        phase = 'final_pause'
        timer = 0
      }
    } else if (phase === 'final_pause') {
      // Short pause after text fades out before loading new level
      if (timer >= FINAL_PAUSE_DURATION) {
        transitionInterval.cancel()
        //
        // Restore volume and unmute procedural sounds before going to next level
        //
        k.volume(inst.originalVolume)
        Sound.unmuteProceduralSounds()
        //
        // Go to next level and add fade-in overlay so new scene doesn't flash
        //
        k.go(nextLevel)
        createSceneFadeIn(k, bgR, bgG, bgB)
      }
    }
  }
  
  const transitionInterval = k.onUpdate(updateTransition)
  
  // Return cleanup function
  return () => {
    transitionInterval.cancel()
    overlay && overlay.exists() && k.destroy(overlay)
    inst.textObj && inst.textObj.exists() && k.destroy(inst.textObj)
    inst.outlineTexts && inst.outlineTexts.forEach(o => o.exists() && k.destroy(o))
    inst?.textSound?.stop()
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

/**
 * Extracts section name from level identifier and returns matching subtitle color
 * @param {string} level - Level name (e.g., 'level-word.2', 'menu-touch')
 * @returns {string} Hex color string for that section's subtitle
 */
function getSectionSubtitleColor(level) {
  if (!level) return DEFAULT_SUBTITLE_COLOR
  //
  // Extract section from level name (handles 'level-word.2' and 'menu-touch' formats)
  //
  const match = level.match(/^(?:level-|menu-)(\w+)/)
  const section = match ? match[1] : null
  return SECTION_SUBTITLE_COLORS[section] || DEFAULT_SUBTITLE_COLOR
}

/**
 * Creates an opaque overlay in the NEW scene that fades out, preventing
 * a visual flash when k.go() destroys the old scene's transition overlay.
 * Must be called immediately after k.go() while still in the same call stack.
 * @param {Object} k - Kaplay instance
 * @param {number} r - Red component of overlay color
 * @param {number} g - Green component of overlay color
 * @param {number} b - Blue component of overlay color
 */
function createSceneFadeIn(k, r, g, b) {
  const fadeOverlay = k.add([
    k.rect(k.width(), k.height()),
    k.pos(0, 0),
    k.color(r, g, b),
    k.opacity(1),
    k.z(CFG.visual.zIndex.ui + 100),
    k.fixed()
  ])
  let fadeTimer = 0
  fadeOverlay.onUpdate(() => {
    fadeTimer += k.dt()
    const progress = Math.min(fadeTimer / SCENE_FADE_IN_DURATION, 1)
    fadeOverlay.opacity = 1 - progress
    if (progress >= 1 && fadeOverlay.exists()) {
      k.destroy(fadeOverlay)
    }
  })
}
