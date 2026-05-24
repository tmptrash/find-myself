import { CFG } from '../cfg.js'

//
// Matches the top-left section indicator letters (48 px in section level
// indicators) so the FPS counter and timer share the same HUD typography.
//
const HUD_FONT_SIZE = 48
//
// Horizontal gaps between the FPS / timer / target time slots, scaled up
// from the previous 150/240 layout to fit the larger 48 px text.
//
const TIMER_OFFSET_X = 420
const TARGET_OFFSET_X = 690

/**
 * Creates FPS counter display
 * @param {Object} config - Configuration
 * @param {Object} config.k - Kaplay instance
 * @param {boolean} [config.showTimer=false] - Whether to show level timer
 * @param {number} [config.targetTime=null] - Target time for speed bonus (in seconds)
 * @param {number} [config.topY=55] - Vertical position (pixels from top)
 * @returns {Object} FPS counter instance
 */
export function create(config) {
  const { k, showTimer = false, targetTime = null, topY = 55 } = config

  const centerX = k.width() / 2 - 100
  //
  // FPS readout text — centered anchor so position stays stable as the
  // numeric content changes.
  //
  const fpsText = k.add([
    k.text('FPS: 30', {
      size: HUD_FONT_SIZE,
      font: CFG.visual.fonts.regularFull.replace(/'/g, '')
    }),
    k.pos(centerX, topY),
    k.anchor('center'),
    k.z(CFG.visual.zIndex.ui),
    k.color(k.rgb(200, 200, 200)),
    k.opacity(0.7)
  ])
  //
  // Optional level timer + green target time (shown for time-trial levels).
  //
  let timerText = null
  let targetText = null
  if (showTimer) {
    timerText = k.add([
      k.text('time: 00:00', {
        size: HUD_FONT_SIZE,
        font: CFG.visual.fonts.regularFull.replace(/'/g, '')
      }),
      k.pos(centerX + TIMER_OFFSET_X, topY),
      k.anchor('center'),
      k.z(CFG.visual.zIndex.ui),
      k.color(k.rgb(200, 200, 200)),
      k.opacity(0.7)
    ])
    if (targetTime) {
      const targetMinutes = Math.floor(targetTime / 60)
      const targetSeconds = Math.floor(targetTime % 60)
      const targetTimeStr = `${targetMinutes.toString().padStart(2, '0')}:${targetSeconds.toString().padStart(2, '0')}`

      targetText = k.add([
        k.text(targetTimeStr, {
          size: HUD_FONT_SIZE,
          font: CFG.visual.fonts.regularFull.replace(/'/g, '')
        }),
        k.pos(centerX + TARGET_OFFSET_X, topY),
        k.anchor('center'),
        k.z(CFG.visual.zIndex.ui),
        k.color(k.rgb(100, 255, 100)),
        k.opacity(0.7)
      ])
    }
  }
  
  const inst = {
    k,
    fpsText,
    timerText,
    targetText,
    targetTime,
    updateTimer: 0,
    fpsSum: 0,
    fpsCount: 0,
    levelTime: 0
  }
  
  return inst
}
/**
 * Updates FPS counter
 * @param {Object} inst - FPS counter instance
 */
export function onUpdate(inst) {
  const { k, fpsText, timerText, targetText, targetTime } = inst
  //
  // Calculate FPS from delta time
  //
  const currentFps = 1 / k.dt()
  inst.fpsSum += currentFps
  inst.fpsCount++
  inst.updateTimer += k.dt()
  //
  // Update level time
  //
  if (timerText) {
    inst.levelTime += k.dt()
    const minutes = Math.floor(inst.levelTime / 60)
    const seconds = Math.floor(inst.levelTime % 60)
    timerText.text = `time: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    //
    // Update target time (remaining time)
    //
    if (targetText && targetTime && targetText.exists()) {
      const remainingTime = Math.max(0, targetTime - inst.levelTime)
      
      if (remainingTime > 0) {
        const remainingMinutes = Math.floor(remainingTime / 60)
        const remainingSeconds = Math.floor(remainingTime % 60)
        targetText.text = `${remainingMinutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
      } else {
        //
        // Hide target text when time is up
        //
        k.destroy(targetText)
      }
    }
  }
  //
  // Update display once per second
  //
  if (inst.updateTimer >= 1.0) {
    const averageFps = Math.round(inst.fpsSum / inst.fpsCount)
    fpsText.text = `FPS: ${averageFps}`
    //
    // Reset counters
    //
    inst.updateTimer = 0
    inst.fpsSum = 0
    inst.fpsCount = 0
  }
}
/**
 * Get current level time in seconds
 * @param {Object} inst - FPS counter instance
 * @returns {number} Level time in seconds
 */
export function getLevelTime(inst) {
  return inst.levelTime
}

