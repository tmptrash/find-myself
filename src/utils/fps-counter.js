import { CFG } from '../cfg.js'

//
// HUD typography for the FPS counter, level timer and green target time.
// 24 px keeps the whole row readable on mobile letterbox without spilling
// off the right edge of the play area like the previous 48 px size did.
//
const HUD_FONT_SIZE = 24
//
// Gap between FPS / time / target slots. Tight enough to keep "time" right
// next to the FPS readout but still visually distinct.
//
const HUD_GAP = 18

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
  const font = CFG.visual.fonts.regularFull.replace(/'/g, '')
  //
  // FPS readout — centered anchor so the position stays stable as the
  // numeric content changes.
  //
  const fpsText = k.add([
    k.text('FPS: 30', { size: HUD_FONT_SIZE, font }),
    k.pos(0, topY),
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
      k.text('time: 00:00', { size: HUD_FONT_SIZE, font }),
      k.pos(0, topY),
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
        k.text(targetTimeStr, { size: HUD_FONT_SIZE, font }),
        k.pos(0, topY),
        k.anchor('center'),
        k.z(CFG.visual.zIndex.ui),
        k.color(k.rgb(100, 255, 100)),
        k.opacity(0.7)
      ])
    }
  }
  //
  // Lay out FPS + timer + target as a single horizontally centered row.
  //
  layoutHudRow(k, [fpsText, timerText, targetText])
  
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
    //
    // Pad the FPS number to two characters so the centered HUD row keeps a
    // stable width (the monospace font keeps every digit pair the same px).
    //
    fpsText.text = `FPS: ${averageFps.toString().padStart(2, ' ')}`
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
//
// Centers a horizontal row of pre-created HUD text objects (FPS, timer,
// target) around the viewport's horizontal center. null entries are
// skipped so callers can pass optional slots without filtering first.
//
function layoutHudRow(k, texts) {
  const presentTexts = texts.filter(t => t)
  if (presentTexts.length === 0) return
  //
  // Sum widths + gaps between consecutive elements so the whole strip can
  // be anchored to the viewport center as one unit.
  //
  let totalWidth = 0
  presentTexts.forEach((t, i) => {
    totalWidth += t.width
    if (i > 0) totalWidth += HUD_GAP
  })
  let cursorX = k.width() / 2 - totalWidth / 2
  presentTexts.forEach(t => {
    t.pos.x = cursorX + t.width / 2
    cursorX += t.width + HUD_GAP
  })
}

