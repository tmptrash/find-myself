import * as Sound from '../../../utils/sound.js'
import { stopTimeSectionMusic } from '../utils/scene.js'
import { markSectionComplete } from '../../../utils/progress.js'

const FINAL_MESSAGE = "time shapes everything - even you"
const MESSAGE_HOLD_DURATION = 5.0
const FADE_IN_DURATION = 1.0
const FADE_OUT_DURATION = 1.5

/**
 * Final scene after completing all time section levels
 * Shows philosophical message, then returns to menu
 */
export function sceneTimeComplete(k) {
  k.scene("time-complete", () => {
    const centerX = k.width() / 2
    const centerY = k.height() / 2
    //
    // Mark time section as complete
    //
    markSectionComplete('time')
    //
    // Create sound instance and stop background music
    //
    const sound = Sound.create()
    Sound.stopBackgroundMusic(sound)
    //
    // Create black background
    //
    k.add([
      k.rect(k.width(), k.height()),
      k.pos(0, 0),
      k.color(0, 0, 0),
      k.z(0)
    ])
    //
    // Create final message text
    //
    const messageText = k.add([
      k.text(FINAL_MESSAGE, {
        size: k.height() * 0.04,
        align: "center"
      }),
      k.pos(centerX, centerY),
      k.anchor("center"),
      k.color(220, 20, 60),
      k.opacity(0),
      k.z(10)
    ])
    //
    // Scene state
    //
    const inst = {
      k,
      messageText,
      timer: 0,
      phase: 'fade_in',
      skipped: false
    }
    //
    // Update animation
    //
    k.onUpdate(() => {
      onUpdate(inst)
    })
    //
    // Allow skip with Space, Enter or mouse click
    //
    k.onKeyPress("space", () => skipToMenu(inst))
    k.onKeyPress("enter", () => skipToMenu(inst))
    k.onClick(() => skipToMenu(inst))
  })
}

/**
 * Update scene animation
 */
function onUpdate(inst) {
  if (inst.skipped) return
  
  inst.timer += inst.k.dt()
  
  if (inst.phase === 'fade_in') {
    //
    // Fade in message text
    //
    const progress = Math.min(1, inst.timer / FADE_IN_DURATION)
    inst.messageText.opacity = progress
    
    if (progress >= 1) {
      inst.phase = 'hold'
      inst.timer = 0
    }
  } else if (inst.phase === 'hold') {
    //
    // Hold message visible
    //
    if (inst.timer >= MESSAGE_HOLD_DURATION) {
      inst.phase = 'fade_out'
      inst.timer = 0
    }
  } else if (inst.phase === 'fade_out') {
    //
    // Fade out message
    //
    const progress = Math.min(1, inst.timer / FADE_OUT_DURATION)
    inst.messageText.opacity = 1 - progress
    
    if (progress >= 1) {
      inst.phase = 'complete'
      //
      // Stop time section music
      //
      stopTimeSectionMusic()
      inst.k.go('menu')
    }
  }
}

/**
 * Skip to menu immediately
 */
function skipToMenu(inst) {
  if (inst.skipped) return
  inst.skipped = true
  //
  // Stop time section music
  //
  stopTimeSectionMusic()
  inst.k.go('menu')
}
