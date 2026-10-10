import * as Sound from '../../../utils/sound.js'
import { setSectionCompleted, set } from '../../../utils/progress.js'
import { goToMenuAfterAssets } from '../../../utils/lesson-assets.js'
import { addFixedTextWithShadow } from '../utils/touch-text-shadow.js'

const FINAL_MESSAGE = "You learned to reach out — to touch and be touched.\n\nNow you feel the difference between contact\n\nand connection with yourself."
const MESSAGE_HOLD_DURATION = 11.0
const FADE_IN_DURATION = 1.0
const FADE_OUT_DURATION = 1.5
const TOUCH_END_MUSIC_PATH = 'assets/sounds/touch-end.mp3'
const TOUCH_END_MUSIC_VOLUME = 0.7
//
// Touch section completion message color (brown, matches pre-level subtitle color)
//
const MESSAGE_COLOR_R = 139
const MESSAGE_COLOR_G = 90
const MESSAGE_COLOR_B = 80

/**
 * Final scene after completing all touch section levels
 * Shows philosophical message, then returns to menu
 */
export function sceneTouchComplete(k) {
  k.scene("touch-complete", () => {
    const centerX = k.width() / 2
    const centerY = k.height() / 2
    //
    // Mark touch section as complete
    //
    setSectionCompleted('touch')
    set('lastLesson', 'lesson-time.0')
    //
    // Create sound instance and stop background music
    //
    const sound = Sound.create()
    Sound.stopBackgroundMusic(sound)
    //
    // Play touch-end music using HTML Audio API (no preload needed)
    //
    const endMusic = new Audio(TOUCH_END_MUSIC_PATH)
    endMusic.loop = true
    endMusic.volume = TOUCH_END_MUSIC_VOLUME
    endMusic.play().catch(() => {})
    //
    // Set canvas background to black
    //
    k.setBackground(k.Color.fromHex("#000000"))
    //
    // Create black background rectangle
    //
    k.add([
      k.rect(k.width(), k.height()),
      k.pos(0, 0),
      k.color(0, 0, 0),
      k.z(0)
    ])
    //
    // Create final message text (brown, matching touch section color)
    //
    const messageSize = k.height() * 0.04
    const messageNodes = addFixedTextWithShadow(k, {
      text: FINAL_MESSAGE,
      x: centerX,
      y: centerY,
      size: messageSize,
      align: 'center',
      colorR: MESSAGE_COLOR_R,
      colorG: MESSAGE_COLOR_G,
      colorB: MESSAGE_COLOR_B,
      zIndex: 10,
      opacity: 0
    })
    const messageText = messageNodes.main
    const messageShadow = messageNodes.shadow
    //
    // Scene state
    //
    const inst = {
      k,
      messageText,
      messageShadow,
      endMusic,
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
    k.onMousePress(() => skipToMenu(inst))
  })
}

/**
 * Update scene animation (fade in → hold → fade out → go to menu)
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
    inst.messageShadow && (inst.messageShadow.opacity = progress * 0.85)

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
    const fade = 1 - progress
    inst.messageText.opacity = fade
    inst.messageShadow && (inst.messageShadow.opacity = fade * 0.85)

    if (progress >= 1) {
      inst.phase = 'complete'
      if (inst.endMusic) {
        inst.endMusic.pause()
        inst.endMusic.currentTime = 0
      }
      goToMenuAfterAssets(inst.k)
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
  // Stop the end music before going to menu
  //
  if (inst.endMusic) {
    inst.endMusic.pause()
    inst.endMusic.currentTime = 0
  }
  goToMenuAfterAssets(inst.k)
}
