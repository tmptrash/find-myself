import { CFG } from '../cfg.js'
import { parseHex } from './helper.js'
import { setSectionCompleted, set, normalizeSceneName } from './progress.js'
import * as Sound from './sound.js'
import * as Tooltip from './tooltip.js'
import * as TouchControls from './touch-controls.js'
import * as Hero from '../components/hero.js'
import { stopTimeSectionMusic } from '../sections/time/components/scene-helper.js'
import { goAfterPreparingAssets, goToMenuAfterAssets, prepareSceneAssets, enterPreparedScene, bumpPrepareCancelNonce } from './lesson-assets.js'
import * as CanvasBackdrop from './canvas-backdrop.js'

/**
 * Level transition configuration - maps current level to next level
 */
// TODO: complete this by two items arrays
const LEVEL_TRANSITIONS = {
  'menu': 'lesson-word.0',
  'menu-time': 'lesson-time.0',
  'menu-touch': 'lesson-touch.0',
  'menu-glow': 'lesson-glow.0',
  'lesson-glow.0': 'glow-complete',
  'glow-complete': 'menu',
  'lesson-word.0': 'lesson-word.1',
  'lesson-word.1': 'lesson-word.2',
  'lesson-word.2': 'lesson-word.3',
  'lesson-word.3': 'lesson-word.4',
  'lesson-word.4': 'word-complete',
  'word-complete': 'menu',
  'lesson-time.0': 'lesson-time.1',
  'lesson-time.1': 'lesson-time.2',
  'lesson-time.2': 'lesson-time.3',
  'lesson-time.3': 'time-complete',
  'time-complete': 'menu',
  'lesson-touch.0': 'lesson-touch.1',
  'lesson-touch.1': 'lesson-touch.2',
  'lesson-touch.2': 'lesson-touch.3',
  'lesson-touch.3': 'touch-complete',
  'touch-complete': 'menu'
}

// Subtitles shown BEFORE entering each level (shifted forward by one)
// Format: [text, sound_id, hold_duration] or just text (for touch section)
const LEVEL_SUBTITLES = {
  'menu': '',
  'menu-time': '',
  'menu-touch': '',
  'menu-glow': '',
  'lesson-glow.0': ['Everything began with nothing... Just as you did.', 'glow0-pre', 4],
  'glow-complete': '',
  'lesson-word.0': ['You are inside your own head now. These words\nare your thoughts — the voices within you.\nSome of them cut deeper than blades.', 'word0-pre', 16, null, 'Find yourself and accept that the voices\nin your head won\'t go away'],
  'lesson-word.1': ['Sharp words don\'t cut — they make you fall', 'word1-pre', 6.5, null, 'The task is the same — find and accept yourself', 2.2],
  'lesson-word.2': ['The words you can\'t forget hurt the most', 'word2-pre', 6.0],
  'lesson-word.3': ['Sharp words move fast — so must you', 'word3-pre', 6.0],
  'lesson-word.4': ['Thoughts you can\'t stop, no matter how hard you try...', 'word4-pre', 5.5],
  'lesson-time.0': ['Time moves forward even when you stand still. You\nstart to notice it slipping — and you start to run.', 'time0-pre', 11, null, 'Platforms don\'t live forever...'],
  'lesson-time.1': ['You are growing. You are learning. Numbers begin\nto surround you. Growing up means learning what you\ncan touch — and what you should leave alone. Do not\ntouch the one.', 'time1-pre', 20, null, 'Don\'t forget the fragments of yourself —\nthey can be found in unexpected places', 4.2],
  'lesson-time.2': ['Rules appear. Some protect you, some punish you.\nMistakes are allowed — but not forever. Digits sum\neven safe, sum odd deadly.', 'time2-pre', 21],
  'lesson-time.3': ['Life consumes time while you hesitate. Act too\nslow — and it will catch you. Throw snow. Move\nfast. Everything happens at once.', 'time3-pre', 19],
  'lesson-touch.0': ['Before words, before understanding\nyou learn the world through touch', 'touch0-pre', 10, 'Find all letters of \'TOUCH\''],
  'lesson-touch.1': ['Touch the roots in sequence — find the melody that awakens', 'touch1-pre', 8, 'Here you need to figure out how to play the right melody by touching things'],
  'lesson-touch.2': ['Jump to reveal the path — find what stands nearby', 'touch2-pre', 7, 'Jumping is beautiful. Figure out how to use your legs to activate your path to yourself...'],
  'lesson-touch.3': ['When you cannot see… touch to survive', 'touch3-pre', 8, 'Touch the bugs and see what happens...']
}

const TRANSITION_SUBTITLE_Z = CFG.visual.zIndex.ui + 1500
const TRANSITION_FONT = CFG.visual.fonts.regularFull.replace(/'/g, '')
const BLACK_PAUSE_DURATION = 0.5     // Pause before text appears
const FADE_TO_BLACK_DURATION = 0.8   // Fade overlay to black before pre-level text
const TEXT_FADE_IN_DURATION = 1.0    // Duration of text fade in
const DEFAULT_TEXT_HOLD_DURATION = 3.0  // Default duration if not specified in subtitle
const TEXT_FADE_OUT_DURATION = 1.0   // Duration of text fade out
const SKIP_TEXT_FADE_DURATION = 0.35 // Fast fade out when the player skips the text
const FINAL_PAUSE_DURATION = 0.3     // Pause after text fades out before level load
const SCENE_FADE_IN_DURATION = 0.5   // Duration of fade-in overlay when entering new scene
const TEXT_OUTLINE_OFFSET = 2        // Pixel offset for text outline shadows
const SUBTITLE_LINE_SPACING = 12     // Extra vertical pixels between subtitle lines
//
// Approximate monospace char width ratio for subtitle / hint width matching
//
const HINT_CHAR_WIDTH_RATIO = 0.55
//
// Subtitle colors per section (matches anti-hero hover color in menu scene)
//
const TIME_SUBTITLE_COLOR = '#FF8C00'
const SECTION_SUBTITLE_COLORS = {
  glow: CFG.visual.colors.sections.glow.body,
  time: TIME_SUBTITLE_COLOR,
  word: CFG.visual.colors.sections.word.body,
  touch: CFG.visual.colors.sections.touch.body,
  feel: CFG.visual.colors.sections.feel.body,
  mind: CFG.visual.colors.sections.mind.body
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
 * Show the pre-level subtitle transition, then navigate to the saved level.
 * Called when the player resumes from the menu with a saved game.
 * Looks up which "menu-to-section" key produces targetLevel and replays
 * the transition from there so the subtitle is shown again.
 * @param {Object} k - Kaplay instance
 * @param {string} targetLevel - Target level to go to (e.g., 'lesson-time.0')
 */
export function showTransitionToLevel(k, targetLevel) {
  targetLevel = normalizeSceneName(targetLevel)
  if (!targetLevel) {
    goToMenuAfterAssets(k)
    return
  }
  //
  // Find the key whose transition chain starts at targetLevel.
  // E.g. if targetLevel is 'lesson-time.0', previousLevel is 'menu-time'.
  //
  const previousLevel = getPreviousLevel(targetLevel)
  if (previousLevel) {
    createLevelTransition(k, previousLevel)
  } else {
    goAfterPreparingAssets(k, targetLevel)
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
 * @param {string} currentLevel - Current level name (e.g., 'lesson-word.0' or 'menu')
 * @param {Function} onComplete - Callback when transition completes
 */
export function createLevelTransition(k, currentLevel, onComplete) {
  const nextLevel = LEVEL_TRANSITIONS[currentLevel] || null
  //
  // Check if section is completed (last level of section going to completion screen)
  //
  if (nextLevel === 'word-complete' || nextLevel === 'time-complete' || nextLevel === 'touch-complete') {
    //
    // Extract section name from level name (e.g., 'lesson-word.4' -> 'word')
    //
    const sectionMatch = currentLevel.match(/(?:level|lesson)-(\w+)\.\d+/)
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
    if (nextLevel === 'word-complete') set('lastLesson', 'lesson-time.0')
    if (nextLevel === 'time-complete') set('lastLesson', null)
    if (nextLevel === 'touch-complete') set('lastLesson', 'lesson-word.0')
    //
    // Go directly to completion screen without transition overlay
    //
    goAfterPreparingAssets(k, nextLevel)
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
  // Mute procedural sounds and suspend AudioContext to silence all active oscillators
  //
  Sound.muteProceduralSounds()
  Sound.suspendGlobalAudio()
  //
  // Suppress any active hero idle vocalization (visual notes + whistle).
  // Notes are drawn at z=9999 — without this, the menu hero's music
  // glyphs float over the pre-level subtitle text. Re-enabled when the
  // next scene actually starts (see finalizeTransitionToLevel below) or
  // if the transition is skipped/escaped.
  //
  Hero.suppressIdleVocalization()
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
  const isLessonScene = (s) => s.startsWith('level-') || s.startsWith('lesson-')
  const isLevelToLevelTransition = isLessonScene(currentLevel) && isLessonScene(nextLevel)
  const isMenuToLevelTransition = currentLevel.startsWith('menu') && isLessonScene(nextLevel)
  if (isLevelToLevelTransition || isMenuToLevelTransition) {
    set('lastLesson', nextLevel)
  }
  
  let timer = 0
  //
  // Check if transitioning from a level or a menu-section entry (not from menu)
  // If so, start with black_pause phase since overlay is already opaque (no slow fade)
  //
  const isFromLevel = currentLevel !== 'menu' && isLessonScene(currentLevel)
  const isFromMenuTime = currentLevel === 'menu-time'
  const isFromMenuTouch = currentLevel === 'menu-touch'
  const isFromMenuGlow = currentLevel === 'menu-glow'
  const isFromMenuSection = isFromMenuTime || isFromMenuTouch || isFromMenuGlow
  const postAssetPreparePhase = (currentLevel === 'menu' || isFromLevel || isFromMenuSection) ? 'black_pause' : 'fade_to_black'
  const needsEarlyAssetLoad = isLessonScene(nextLevel)
  let phase = needsEarlyAssetLoad ? 'asset_prepare' : postAssetPreparePhase
  
  // Instance object to store text reference
  const inst = {
    textObj: null,
    outlineTexts: null,
    hintTextObj: null,
    hintOutlineTexts: null,
    preTextObj: null,
    preTextOutlines: null,
    skipped: false,
    skipEnabled: false,
    skipEnableTimer: 0,
    textHoldDuration: DEFAULT_TEXT_HOLD_DURATION,
    soundName: null,
    textSound: null,
    soundsStopped: false,
    originalVolume: originalVolume,
    postAssetPreparePhase,
    assetPrepareDone: !needsEarlyAssetLoad,
    assetPreparePromise: null,
    tooltipSuppressed: false,
    entered: false
  }
  //
  // Hide all in-game tooltips for the entire pre-level transition. We also
  // hide the touch run/jump buttons so the controls don't sit on top of the
  // subtitle text — they are re-created by the next level scene.
  //
  const preLevelSubtitle = LEVEL_SUBTITLES[nextLevel]
  if ((isLevelToLevelTransition || isMenuToLevelTransition) && preLevelSubtitle) {
    Tooltip.suppressAll()
    inst.tooltipSuppressed = true
  }
  TouchControls.setVisible(false)
  
  //
  // Set background to menu color when transitioning from a level or a
  // menu-section entry.
  // Sync both Kaplay clear color and CSS letterbox bars to eliminate stripes.
  //
  const transitionBgHex = CFG.visual.colors.menu.platformColor
  const [bgR, bgG, bgB] = parseHex(transitionBgHex)
  if (isFromLevel || isFromMenuSection) {
    CanvasBackdrop.applyCanvasBackdrop(k, transitionBgHex)
  }
  //
  // Create overlay matching menu background color
  // Starts fully opaque if from a level or a menu-section entry,
  // transparent otherwise
  //
  let overlay = k.add([
    k.rect(k.width(), k.height()),
    k.pos(0, 0),
    k.color(bgR, bgG, bgB),
    k.opacity(isFromLevel || isFromMenuSection ? 1 : (currentLevel === 'menu' ? 1 : 0)),
    k.z(CFG.visual.zIndex.ui + 100),
    k.fixed()
  ])
  
  if (needsEarlyAssetLoad) {
    inst.assetPreparePromise = prepareSceneAssets(k, nextLevel).then(() => {
      inst.assetPrepareDone = true
    })
  }
  
  const finalizeTransitionToLevel = (afterGo) => {
    if (inst.entered) return
    const enter = () => {
      if (inst.entered) return
      inst.entered = true
      //
      // Re-enable tooltips now that we are entering the level
      //
      if (inst.tooltipSuppressed) {
        Tooltip.unsuppressAll()
        inst.tooltipSuppressed = false
      }
      //
      // Re-enable hero idle vocalization for the new scene. The kill
      // switch was flipped on at transition start so the menu hero's
      // notes wouldn't bleed over the subtitle text.
      //
      Hero.unsuppressIdleVocalization()
      TouchControls.setVisible(true)
      overlay.exists() && k.destroy(overlay)
      enterPreparedScene(k, nextLevel, afterGo)
    }
    if (needsEarlyAssetLoad && inst.assetPreparePromise && !inst.assetPrepareDone) {
      inst.assetPreparePromise.then(enter)
      return
    }
    enter()
  }
  
  // Function to skip transition and go directly to next level
  const skipTransition = () => {
    if (inst.skipped) return // Already skipped
    inst.skipped = true
    //
    // If the pre-level phrase is still on screen, don't cut it off — run a
    // quick fade-out instead and let the normal phase flow finish the
    // transition (final pause → level load).
    //
    if (phase === 'text_fade_in' || phase === 'text_hold') {
      inst.fastTextFade = true
      inst.textFadeFrom = inst.textObj ? inst.textObj.opacity : 1
      phase = 'text_fade_out'
      timer = 0
      return
    }
    
    // Clean up
    k.transitionCleanup?.()
    //
    // Restore volume, unmute procedural sounds, and resume AudioContext
    //
    k.volume(inst.originalVolume)
    Sound.unmuteProceduralSounds()
    Sound.resumeGlobalAudio()
    //
    // Go to next level and add fade-in overlay so new scene doesn't flash
    //
    finalizeTransitionToLevel(() => createSceneFadeIn(k, bgR, bgG, bgB))
  }
  
  const updateTransition = () => {
    if (phase === 'asset_prepare') {
      //
      // Allow Esc to cancel loading and return to menu immediately,
      // even while the asset_prepare phase is running.
      //
      if (k.isKeyPressed("escape")) {
        if (!inst.skipped) {
          inst.skipped = true
          bumpPrepareCancelNonce()
          k.transitionCleanup?.()
          k.volume(inst.originalVolume)
          Sound.unmuteProceduralSounds()
          Sound.resumeGlobalAudio()
          stopTimeSectionMusic()
          inst.tooltipSuppressed && Tooltip.unsuppressAll()
          inst.tooltipSuppressed = false
          Hero.unsuppressIdleVocalization()
          goToMenuAfterAssets(k)
        }
        return
      }
      if (inst.assetPrepareDone) {
        phase = inst.postAssetPreparePhase
        timer = 0
      }
      return
    }
    // Enable skip after 0.3 seconds to prevent accidental skip from menu button press
    if (!inst.skipEnabled) {
      inst.skipEnableTimer += k.dt()
      if (inst.skipEnableTimer >= 0.3) {
        inst.skipEnabled = true
      }
    }
    
    //
    // Esc during transition goes directly to menu
    //
    if (inst.skipEnabled && k.isKeyPressed("escape")) {
      if (inst.skipped) return
      inst.skipped = true
      bumpPrepareCancelNonce()
      k.transitionCleanup?.()
      k.volume(inst.originalVolume)
      Sound.unmuteProceduralSounds()
      Sound.resumeGlobalAudio()
      stopTimeSectionMusic()
      inst.tooltipSuppressed && Tooltip.unsuppressAll()
      inst.tooltipSuppressed = false
      Hero.unsuppressIdleVocalization()
      goToMenuAfterAssets(k)
      return
    }
    //
    // Check for skip keys (space or enter) in update loop for better reliability
    //
    if (inst.skipEnabled && (k.isKeyPressed("space") || k.isKeyPressed("enter"))) {
      skipTransition()
      return
    }
    //
    // Check for mouse click to skip (same as space/enter)
    //
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
        const subtitleEntry = LEVEL_SUBTITLES[nextLevel]
        const subtitle = Array.isArray(subtitleEntry) ? subtitleEntry[0] : subtitleEntry
        const soundName = Array.isArray(subtitleEntry) ? subtitleEntry[1] : null
        const textHoldDuration = Array.isArray(subtitleEntry) ? subtitleEntry[2] : DEFAULT_TEXT_HOLD_DURATION
        const hintText = Array.isArray(subtitleEntry) ? subtitleEntry[3] : null
        //
        // Optional gray text shown ABOVE the main subtitle (index 4)
        //
        const preText = Array.isArray(subtitleEntry) ? subtitleEntry[4] : null
        //
        // Optional Y-multiplier override for the pre-text gap (index 5).
        // Smaller value = pre-text sits closer to the main subtitle.
        // Defaults to 3.2 which works for multi-line subtitles.
        //
        const preTextYMult = Array.isArray(subtitleEntry) && subtitleEntry[5] != null ? subtitleEntry[5] : 3.2

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
          // Drop shadow (single black copy offset right+down) — the same
          // text shadow style the glow level uses.
          //
          const outlineOffsets = [
            [TEXT_OUTLINE_OFFSET, TEXT_OUTLINE_OFFSET]
          ]
          const outlineTexts = outlineOffsets.map(([dx, dy]) => k.add([
            k.text(subtitle, { size: textSize, align: "center", lineSpacing: SUBTITLE_LINE_SPACING, font: TRANSITION_FONT }),
            k.pos(textX + dx, textY + dy),
            k.anchor("center"),
            k.color(0, 0, 0),
            k.opacity(0),
            k.z(TRANSITION_SUBTITLE_Z),
            k.fixed()
          ]))
          //
          // Create main colored text above outlines
          //
          const textObj = k.add([
            k.text(subtitle, { size: textSize, align: "center", lineSpacing: SUBTITLE_LINE_SPACING, font: TRANSITION_FONT }),
            k.pos(textX, textY),
            k.anchor("center"),
            k.color(r, g, b),
            k.opacity(0),
            k.z(TRANSITION_SUBTITLE_Z + 1),
            k.fixed()
          ])
          inst.textObj = textObj
          inst.outlineTexts = outlineTexts
          //
          // Optional small hint text below the main subtitle
          //
          if (hintText) {
            const hintSize = textSize * 0.55
            const hintYOffset = nextLevel === 'lesson-touch.0' ? textSize * 2.35 : textSize * 1.9
            const hintY = textY + hintYOffset
            const wrappedHint = wrapHintToSubtitleWidth(hintText, subtitle, hintSize, textSize)
            const hintOutlineTexts = outlineOffsets.map(([dx, dy]) => k.add([
              k.text(wrappedHint, { size: hintSize, align: "center", lineSpacing: SUBTITLE_LINE_SPACING * 0.5, font: TRANSITION_FONT }),
              k.pos(textX + dx, hintY + dy),
              k.anchor("center"),
              k.color(0, 0, 0),
              k.opacity(0),
              k.z(TRANSITION_SUBTITLE_Z),
              k.fixed()
            ]))
            const hintTextObj = k.add([
              k.text(wrappedHint, { size: hintSize, align: "center", lineSpacing: SUBTITLE_LINE_SPACING * 0.5, font: TRANSITION_FONT }),
              k.pos(textX, hintY),
              k.anchor("center"),
              k.color(140, 140, 140),
              k.opacity(0),
              k.z(TRANSITION_SUBTITLE_Z + 1),
              k.fixed()
            ])
            inst.hintTextObj = hintTextObj
            inst.hintOutlineTexts = hintOutlineTexts
          }
          //
          // Optional gray pre-text shown BELOW the main subtitle.
          // Smaller than the subtitle, same neutral gray as hint text.
          //
          if (preText) {
            const preTextSize = textSize * 0.62
            const preTextY = textY + textSize * preTextYMult
            const preTextOutlines = outlineOffsets.map(([dx, dy]) => k.add([
              k.text(preText, { size: preTextSize, align: 'center', lineSpacing: SUBTITLE_LINE_SPACING * 0.5, font: TRANSITION_FONT }),
              k.pos(textX + dx, preTextY + dy),
              k.anchor('center'),
              k.color(0, 0, 0),
              k.opacity(0),
              k.z(TRANSITION_SUBTITLE_Z),
              k.fixed()
            ]))
            const preTextObj = k.add([
              k.text(preText, { size: preTextSize, align: 'center', lineSpacing: SUBTITLE_LINE_SPACING * 0.5, font: TRANSITION_FONT }),
              k.pos(textX, preTextY),
              k.anchor('center'),
              k.color(140, 140, 140),
              k.opacity(0),
              k.z(TRANSITION_SUBTITLE_Z + 1),
              k.fixed()
            ])
            inst.preTextObj = preTextObj
            inst.preTextOutlines = preTextOutlines
          }
        } else {
          // No subtitle, go to next level immediately
          k.transitionCleanup?.()
          //
          // Restore volume and unmute procedural sounds before going to next level
          //
          k.volume(inst.originalVolume)
          Sound.unmuteProceduralSounds()
          Sound.resumeGlobalAudio()
          finalizeTransitionToLevel()
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
      if (inst.hintTextObj) {
        inst.hintTextObj.opacity = progress
        inst.hintOutlineTexts && inst.hintOutlineTexts.forEach(o => { o.opacity = progress })
      }
      if (inst.preTextObj) {
        inst.preTextObj.opacity = progress
        inst.preTextOutlines && inst.preTextOutlines.forEach(o => { o.opacity = progress })
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
      //
      // Fade out text. A skip runs the same fade, only faster and starting
      // from the opacity the text had at the moment of the skip.
      //
      const fadeDuration = inst.fastTextFade ? SKIP_TEXT_FADE_DURATION : TEXT_FADE_OUT_DURATION
      const fadeFrom = inst.textFadeFrom ?? 1
      const progress = Math.min(timer / fadeDuration, 1)
      const fadeOpacity = fadeFrom * (1 - progress)
      if (inst.textObj) {
        inst.textObj.opacity = fadeOpacity
        inst.outlineTexts && inst.outlineTexts.forEach(o => { o.opacity = fadeOpacity })
      }
      if (inst.hintTextObj) {
        inst.hintTextObj.opacity = fadeOpacity
        inst.hintOutlineTexts && inst.hintOutlineTexts.forEach(o => { o.opacity = fadeOpacity })
      }
      if (inst.preTextObj) {
        inst.preTextObj.opacity = fadeOpacity
        inst.preTextOutlines && inst.preTextOutlines.forEach(o => { o.opacity = fadeOpacity })
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
        if (inst.hintTextObj) {
          inst.hintTextObj.exists() && k.destroy(inst.hintTextObj)
          inst.hintTextObj = null
        }
        if (inst.hintOutlineTexts) {
          inst.hintOutlineTexts.forEach(o => o.exists() && k.destroy(o))
          inst.hintOutlineTexts = null
        }
        if (inst.preTextObj) {
          inst.preTextObj.exists() && k.destroy(inst.preTextObj)
          inst.preTextObj = null
        }
        if (inst.preTextOutlines) {
          inst.preTextOutlines.forEach(o => o.exists() && k.destroy(o))
          inst.preTextOutlines = null
        }
        
        phase = 'final_pause'
        timer = 0
      }
    } else if (phase === 'final_pause') {
      // Short pause after text fades out before loading new level
      if (timer >= FINAL_PAUSE_DURATION) {
        k.transitionCleanup?.()
        //
        // Restore volume and unmute procedural sounds before going to next level
        //
        k.volume(inst.originalVolume)
        Sound.unmuteProceduralSounds()
        Sound.resumeGlobalAudio()
        //
        // Go to next level and add fade-in overlay so new scene doesn't flash
        //
        finalizeTransitionToLevel(() => createSceneFadeIn(k, bgR, bgG, bgB))
      }
    }
  }
  
  const transitionInterval = k.onUpdate(updateTransition)
  
  k.transitionCleanup = () => {
    transitionInterval.cancel()
    overlay.exists() && k.destroy(overlay)
    inst.textObj && inst.textObj.exists() && k.destroy(inst.textObj)
    inst.outlineTexts && inst.outlineTexts.forEach(o => o.exists() && k.destroy(o))
    inst.hintTextObj && inst.hintTextObj.exists() && k.destroy(inst.hintTextObj)
    inst.hintOutlineTexts && inst.hintOutlineTexts.forEach(o => o.exists() && k.destroy(o))
    inst?.textSound?.stop()
    inst.tooltipSuppressed && Tooltip.unsuppressAll()
    inst.tooltipSuppressed = false
    k.transitionCleanup = null
  }
  
  // Return cleanup function
  return () => {
    transitionInterval.cancel()
    overlay && overlay.exists() && k.destroy(overlay)
    inst.textObj && inst.textObj.exists() && k.destroy(inst.textObj)
    inst.outlineTexts && inst.outlineTexts.forEach(o => o.exists() && k.destroy(o))
    inst.hintTextObj && inst.hintTextObj.exists() && k.destroy(inst.hintTextObj)
    inst.hintOutlineTexts && inst.hintOutlineTexts.forEach(o => o.exists() && k.destroy(o))
    inst?.textSound?.stop()
    inst.tooltipSuppressed && Tooltip.unsuppressAll()
    inst.tooltipSuppressed = false
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
 * @param {string} level - Level name (e.g., 'lesson-word.2', 'menu-touch')
 * @returns {string} Hex color string for that section's subtitle
 */
function getSectionSubtitleColor(level) {
  if (!level) return DEFAULT_SUBTITLE_COLOR
  //
  // Extract section from level name (handles 'lesson-word.2', 'level-word.2'
  // and 'menu-touch' formats)
  //
  const match = level.match(/^(?:lesson-|level-|menu-)(\w+)/)
  const section = match ? match[1] : null
  return SECTION_SUBTITLE_COLORS[section] || DEFAULT_SUBTITLE_COLOR
}

//
// Wraps hint copy so no line is wider than the longest main-subtitle line
//
function wrapHintToSubtitleWidth(hintText, subtitle, hintSize, textSize) {
  const subtitleLines = subtitle.split('\n')
  let maxLen = 0
  for (const line of subtitleLines) {
    if (line.length > maxLen) maxLen = line.length
  }
  const maxWidth = maxLen * textSize * HINT_CHAR_WIDTH_RATIO
  const charWidth = hintSize * HINT_CHAR_WIDTH_RATIO
  const maxChars = Math.max(16, Math.floor(maxWidth / charWidth))
  const words = hintText.split(' ')
  const lines = []
  let current = ''
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (candidate.length > maxChars && current) {
      lines.push(current)
      current = word
    } else {
      current = candidate
    }
  }
  current && lines.push(current)
  return lines.join('\n')
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
//
// Reverse lookup: find the key that maps to targetLevel in LEVEL_TRANSITIONS.
// Returns the previous level name or null if not found.
//
function getPreviousLevel(targetLevel) {
  for (const [key, value] of Object.entries(LEVEL_TRANSITIONS)) {
    if (value === targetLevel) return key
  }
  return null
}
