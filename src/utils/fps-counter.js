import { CFG } from '../cfg.js'

/**
 * Creates FPS counter display
 * @param {Object} config - Configuration
 * @param {Object} config.k - Kaplay instance
 * @returns {Object} FPS counter instance
 */
export function create(config) {
  const { k } = config
  
  const centerX = k.width() / 2
  const topY = 55
  //
  // Create FPS text
  //
  const fpsText = k.add([
    k.text('FPS: 30', {
      size: 16,
      font: CFG.visual.fonts.regularFull.replace(/'/g, '')
    }),
    k.pos(centerX, topY),
    k.anchor('center'),
    k.z(CFG.visual.zIndex.ui),
    k.color(k.rgb(200, 200, 200)),
    k.opacity(0.7)
  ])
  
  const inst = {
    k,
    fpsText,
    updateTimer: 0,
    fpsSum: 0,
    fpsCount: 0
  }
  
  return inst
}
/**
 * Updates FPS counter
 * @param {Object} inst - FPS counter instance
 */
export function onUpdate(inst) {
  const { k, fpsText } = inst
  //
  // Calculate FPS from delta time
  //
  const currentFps = 1 / k.dt()
  inst.fpsSum += currentFps
  inst.fpsCount++
  inst.updateTimer += k.dt()
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

