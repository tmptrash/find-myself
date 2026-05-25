import { CFG } from '../cfg.js'

//
// HUD typography for the FPS counter, level timer and green target time.
//
const HUD_FONT_SIZE = 28
//
// Gap between HUD slots; extra space after FPS before the "time:" label.
//
const HUD_GAP = 18
const HUD_GAP_AFTER_FPS = 28
const HUD_OUTLINE_OFFSET = 1

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
  // FPS readout with black outline
  //
  const fpsText = createOutlinedHudText(k, 'FPS: 30', font, k.rgb(200, 200, 200), topY)
  //
  // Optional level timer + green target time (shown for time-trial levels).
  //
  let timerText = null
  let targetText = null
  if (showTimer) {
    timerText = createOutlinedHudText(k, 'time: 00:00', font, k.rgb(200, 200, 200), topY)
    if (targetTime) {
      const targetMinutes = Math.floor(targetTime / 60)
      const targetSeconds = Math.floor(targetTime % 60)
      const targetTimeStr = `${targetMinutes.toString().padStart(2, '0')}:${targetSeconds.toString().padStart(2, '0')}`
      targetText = createOutlinedHudText(k, targetTimeStr, font, k.rgb(100, 255, 100), topY)
    }
  }
  layoutHudRow(k, [fpsText, timerText, targetText])
  const inst = {
    k,
    fpsText: fpsText.main,
    fpsTextOutlines: fpsText.outlineNodes,
    timerText: timerText?.main ?? null,
    timerTextOutlines: timerText?.outlineNodes ?? [],
    targetText: targetText?.main ?? null,
    targetTextOutlines: targetText?.outlineNodes ?? [],
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
  const { k, fpsText, fpsTextOutlines, timerText, timerTextOutlines, targetText, targetTextOutlines, targetTime } = inst
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
    setOutlinedHudText({ main: timerText, outlineNodes: timerTextOutlines }, `time: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)
    //
    // Update target time (remaining time)
    //
    if (targetText && targetTime && targetText.main.exists()) {
      const remainingTime = Math.max(0, targetTime - inst.levelTime)
      if (remainingTime > 0) {
        const remainingMinutes = Math.floor(remainingTime / 60)
        const remainingSeconds = Math.floor(remainingTime % 60)
        setOutlinedHudText({ main: targetText, outlineNodes: targetTextOutlines }, `${remainingMinutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`)
      } else {
        destroyOutlinedHudText(k, { main: targetText, outlineNodes: targetTextOutlines })
        inst.targetText = null
        inst.targetTextOutlines = []
      }
    }
  }
  //
  // Update display once per second
  //
  if (inst.updateTimer >= 1.0) {
    const averageFps = Math.round(inst.fpsSum / inst.fpsCount)
    setOutlinedHudText({ main: fpsText, outlineNodes: fpsTextOutlines }, `FPS: ${averageFps.toString().padStart(2, ' ')}`)
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
// Creates HUD text with an eight-direction black outline.
//
function createOutlinedHudText(k, text, font, color, topY) {
  const outlineNodes = buildOutlineOffsets(HUD_OUTLINE_OFFSET).map(([dx, dy]) => k.add([
    k.text(text, { size: HUD_FONT_SIZE, font }),
    k.pos(0, topY + dy),
    k.anchor('center'),
    k.z(CFG.visual.zIndex.ui),
    k.color(k.rgb(0, 0, 0)),
    k.opacity(0.7)
  ]))
  const main = k.add([
    k.text(text, { size: HUD_FONT_SIZE, font }),
    k.pos(0, topY),
    k.anchor('center'),
    k.z(CFG.visual.zIndex.ui + 1),
    k.color(color),
    k.opacity(0.7)
  ])
  return { main, outlineNodes }
}
//
// Updates outlined HUD label text on main and outline nodes.
//
function setOutlinedHudText(node, text) {
  node.main.text = text
  node.outlineNodes.forEach(outline => {
    outline.exists?.() && (outline.text = text)
  })
}
//
// Removes outlined HUD nodes from the scene.
//
function destroyOutlinedHudText(k, node) {
  node.main.exists?.() && k.destroy(node.main)
  node.outlineNodes.forEach(outline => outline.exists?.() && k.destroy(outline))
}
//
// Eight-direction outline offset pairs
//
function buildOutlineOffsets(thickness) {
  return [
    [-thickness, -thickness],
    [0, -thickness],
    [thickness, -thickness],
    [-thickness, 0],
    [thickness, 0],
    [-thickness, thickness],
    [0, thickness],
    [thickness, thickness]
  ]
}
//
// Centers a horizontal row of pre-created HUD text objects (FPS, timer,
// target) around the viewport's horizontal center. null entries are
// skipped so callers can pass optional slots without filtering first.
//
function layoutHudRow(k, texts) {
  const presentTexts = texts.filter(t => t)
  if (presentTexts.length === 0) return
  let totalWidth = 0
  presentTexts.forEach((t, i) => {
    totalWidth += t.main.width
    if (i > 0) {
      totalWidth += i === 1 ? HUD_GAP_AFTER_FPS : HUD_GAP
    }
  })
  let cursorX = k.width() / 2 - totalWidth / 2
  presentTexts.forEach((t, i) => {
    const centerX = cursorX + t.main.width / 2
    t.main.pos.x = centerX
    const outlineOffsets = buildOutlineOffsets(HUD_OUTLINE_OFFSET)
    t.outlineNodes.forEach((outline, oi) => {
      const [dx, dy] = outlineOffsets[oi]
      outline.pos.x = centerX + dx
    })
    cursorX += t.main.width + (i === 0 ? HUD_GAP_AFTER_FPS : HUD_GAP)
  })
}
