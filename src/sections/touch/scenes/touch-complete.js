import * as Sound from '../../../utils/sound.js'
import { setSectionCompleted } from '../../../utils/progress.js'

const FINAL_MESSAGE = "you learned to reach out — to touch and be touched.\n\nnow you feel the difference between contact\n\nand connection."
const MESSAGE_HOLD_DURATION = 5.0
const FADE_IN_DURATION = 1.0
const FADE_OUT_DURATION = 1.5
//
// Touch section completion message color (pink, matches section body color)
//
const MESSAGE_COLOR_R = 255
const MESSAGE_COLOR_G = 192
const MESSAGE_COLOR_B = 203

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
    //
    // Create sound instance and stop background music
    //
    const sound = Sound.create()
    Sound.stopBackgroundMusic(sound)
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
    // Create final message text (pink, matching touch section color)
    //
    const messageText = k.add([
      k.text(FINAL_MESSAGE, {
        size: k.height() * 0.04,
        align: "center"
      }),
      k.pos(centerX, centerY),
      k.anchor("center"),
      k.color(MESSAGE_COLOR_R, MESSAGE_COLOR_G, MESSAGE_COLOR_B),
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
  inst.k.go('menu')
}
