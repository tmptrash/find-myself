import { CFG } from '../cfg.js'

//
// HUD typography for the FPS counter and level timer.
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
 * @param {boolean} [config.showTimer=false] - Whether to show level elapsed timer
 * @param {number} [config.topY=55] - Vertical position (pixels from top)
 * @param {Object} [config.textColor] - Optional Kaplay rgb for the numerals
 * @param {Object} [config.outlineColor] - Optional Kaplay rgb for the drop shadow
 * @returns {Object} FPS counter instance
 */
export function create(config) {
  const { k, showTimer = false, topY = 55, textColor = null, outlineColor = null, postBakeCanvas = null } = config
  const font = CFG.visual.fonts.regularFull.replace(/'/g, '')
  //
  // HUD numerals (FPS + timer) share the same neutral grey as the
  // section indicator inactive letters and the top-right scoreboard so
  // every quiet HUD slot reads as one consistent colour.
  //
  const HUD_TEXT_GREY = textColor || k.rgb(176, 176, 176)
  const HUD_OUTLINE = outlineColor || k.rgb(0, 0, 0)
  const fpsText = createOutlinedHudText(k, 'FPS: 30', font, HUD_TEXT_GREY, topY, HUD_OUTLINE, postBakeCanvas)
  //
  // Optional elapsed level timer
  //
  let timerText = null
  if (showTimer) {
    timerText = createOutlinedHudText(k, 'time: 00:00', font, HUD_TEXT_GREY, topY, HUD_OUTLINE, postBakeCanvas)
  }
  layoutHudRow(k, [fpsText, timerText])
  if (CFG.debug?.showPerformanceHud) {
    const numObjects = k.get('*').length
    const drawCalls = countKaplayDrawCalls(k)
    setOutlinedHudText(fpsText, `FPS: 30  obj: ${numObjects}  dc: ${drawCalls}`)
  }
  const inst = {
    k,
    topY,
    fpsHud: fpsText,
    timerHud: timerText,
    fpsText: fpsText.main,
    fpsTextOutlines: fpsText.outlineNodes,
    timerText: timerText?.main ?? null,
    timerTextOutlines: timerText?.outlineNodes ?? [],
    postBakeCanvas,
    updateTimer: 0,
    fpsSum: 0,
    fpsCount: 0,
    levelTime: 0,
    debugUpdateTimer: 0,
    cachedObjCount: CFG.debug?.showPerformanceHud ? k.get('*').length : 0,
    cachedDrawCalls: CFG.debug?.showPerformanceHud ? countKaplayDrawCalls(k) : 0
  }
  CFG.debug?.showPerformanceHud && layoutAtScreenCenterX(inst, k.width() / 2)
  return inst
}
/**
 * Updates FPS counter
 * @param {Object} inst - FPS counter instance
 */
export function onUpdate(inst) {
  const { k, fpsHud, timerHud } = inst
  const frameDt = k.dt()
  //
  // Kaplay's dt() is the fixed/sim timestep — rawFPS() is the real display
  // refresh rate (e.g. 120 Hz monitors). Fall back to 1/dt when unavailable.
  //
  const currentFps = typeof k.rawFPS === 'function'
    ? k.rawFPS()
    : (frameDt > 0 ? 1 / frameDt : 0)
  inst.fpsSum += currentFps
  inst.fpsCount++
  inst.updateTimer += frameDt
  //
  // Track level time and update elapsed timer
  //
  if (timerHud) {
    inst.levelTime += frameDt
    const minutes = Math.floor(inst.levelTime / 60)
    const seconds = Math.floor(inst.levelTime % 60)
    setOutlinedHudText(timerHud, `time: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)
  }
  //
  // Update display once per second
  //
  if (CFG.debug?.showPerformanceHud) {
    inst.debugUpdateTimer += frameDt
    if (inst.debugUpdateTimer >= 0.25) {
      inst.debugUpdateTimer = 0
      inst.cachedObjCount = k.get('*').length
      inst.cachedDrawCalls = countKaplayDrawCalls(k)
    }
  }
  if (inst.updateTimer >= 1.0) {
    const averageFps = Math.round(inst.fpsSum / inst.fpsCount)
    const fpsLabel = `FPS: ${averageFps.toString().padStart(2, ' ')}`
    const hudText = CFG.debug?.showPerformanceHud
      ? `${fpsLabel}  obj: ${inst.cachedObjCount}  dc: ${inst.cachedDrawCalls}`
      : fpsLabel
    setOutlinedHudText(fpsHud, hudText)
    inst.updateTimer = 0
    inst.fpsSum = 0
    inst.fpsCount = 0
  }
  CFG.debug?.showPerformanceHud &&
    layoutAtScreenCenterX(inst, inst.layoutCenterX ?? inst.k.width() / 2)
}
/**
 * Get current level time in seconds
 * @param {Object} inst - FPS counter instance
 * @returns {number} Level time in seconds
 */
export function getLevelTime(inst) {
  return inst.levelTime
}
/**
 * Shows or hides the FPS counter HUD (timer slot follows when present).
 * @param {Object} inst - FPS counter instance
 * @param {boolean} visible - Whether the HUD is visible
 */
export function setVisible(inst, visible) {
  if (!inst) return
  const opacity = visible ? 0.7 : 0
  inst.fpsText.opacity = opacity
  inst.fpsTextOutlines.forEach(outline => {
    outline.exists?.() && (outline.opacity = opacity)
  })
  inst.timerText && (inst.timerText.opacity = opacity)
  inst.timerTextOutlines?.forEach(outline => {
    outline.exists?.() && (outline.opacity = opacity)
  })
}
/**
 * Pins FPS HUD nodes to screen space (same as GLOW label / scoreboard).
 * @param {Object} inst - FPS counter instance
 */
export function pinScreenFixed(inst) {
  if (!inst) return
  const pin = (obj) => obj?.exists?.() && (obj.fixed = true)
  pin(inst.fpsText)
  inst.fpsTextOutlines.forEach(pin)
  inst.timerText && pin(inst.timerText)
  inst.timerTextOutlines?.forEach(pin)
}
/**
 * Centers the FPS row at a fixed screen X (between HUD slots).
 * @param {Object} inst - FPS counter instance
 * @param {number} centerX - Screen-space anchor X
 */
export function layoutAtScreenCenterX(inst, centerX) {
  if (!inst?.fpsHud) return
  inst.layoutCenterX = centerX
  inst.fpsHud.layoutCenterX = centerX
  const topY = inst.topY
  const outlineOffsets = buildOutlineOffsets(HUD_OUTLINE_OFFSET)
  inst.fpsHud.main.pos.x = centerX
  inst.fpsHud.main.pos.y = topY
  inst.fpsHud.outlineNodes.forEach((outline, oi) => {
    const [dx, dy] = outlineOffsets[oi]
    outline.pos.x = centerX + dx
    outline.pos.y = topY + dy
  })
  if (!inst.timerHud) return
  const gap = HUD_GAP_AFTER_FPS
  const timerCenterX = centerX + inst.fpsHud.main.width / 2 + gap + inst.timerHud.main.width / 2
  inst.timerHud.main.pos.x = timerCenterX
  inst.timerHud.main.pos.y = topY
  inst.timerHud.outlineNodes.forEach((outline, oi) => {
    const [dx, dy] = outlineOffsets[oi]
    outline.pos.x = timerCenterX + dx
    outline.pos.y = topY + dy
  })
}
//
// Creates HUD text with a single drop-shadow copy (glow-level style).
//
function createOutlinedHudText(k, text, font, color, topY, outlineColor, postBakeCanvas = null) {
  if (postBakeCanvas) {
    return createBakedOutlinedHudText(k, text, font, color, topY, outlineColor, postBakeCanvas)
  }
  const outlineNodes = buildOutlineOffsets(HUD_OUTLINE_OFFSET).map(([dx, dy]) => k.add([
    k.text(text, { size: HUD_FONT_SIZE, font }),
    k.pos(0, topY + dy),
    k.anchor('center'),
    k.z(CFG.visual.zIndex.ui),
    k.color(outlineColor),
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
  node.bakedHolder
    ? syncBakedHudText(node, text)
    : (() => {
      node.main.text = text
      node.outlineNodes.forEach(outline => {
        outline.exists?.() && (outline.text = text)
      })
    })()
}
//
// Eight-direction outline offset pairs
//
//
// Drop shadow (single black copy offset right+down) — the same text shadow
// style the glow level uses.
//
function buildOutlineOffsets(thickness) {
  return [[thickness, thickness]]
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
//
// Baked HUD text path — shadow + fill on one canvas, then postBakeCanvas grain.
//
function createBakedOutlinedHudText(k, text, font, color, topY, outlineColor, postBakeCanvas) {
  const node = {
    k,
    main: null,
    outlineNodes: [],
    bakedHolder: true,
    postBakeCanvas,
    font,
    color,
    outlineColor,
    topY,
    measuredW: 0,
    lastText: null,
    layoutCenterX: null
  }
  rebuildBakedHudTextNode(node, text, k.width() / 2)
  return node
}
//
// Rebakes the FPS HUD sprite when the label string changes.
//
function syncBakedHudText(node, text) {
  if (node.lastText === text) return
  const centerX = node.layoutCenterX ?? node.k.width() / 2
  rebuildBakedHudTextNode(node, text, centerX)
}
//
// Draws outlined HUD text to a canvas and loads it as a Kaplay sprite.
//
function rebuildBakedHudTextNode(node, text, centerX) {
  const { k, font, color, outlineColor, topY, postBakeCanvas } = node
  node.layoutCenterX = centerX
  node.lastText = text
  const canvas = bakeFpsHudTextCanvas(text, font, color, outlineColor)
  postBakeCanvas?.(canvas, fpsHudTextHash(text))
  const spriteName = 'fps-hud-bake-' + fpsHudTextHash(text)
  k.loadSprite(spriteName, canvas)
  node.measuredW = canvas.width
  canvas.width = 0
  canvas.height = 0
  const prevMain = node.main
  const wasFixed = prevMain?.fixed
  const wasOpacity = prevMain?.opacity ?? 0.7
  prevMain?.exists?.() && k.destroy(prevMain)
  node.main = k.add([
    k.sprite(spriteName),
    k.pos(centerX, topY),
    k.anchor('center'),
    k.color(k.rgb(255, 255, 255)),
    k.opacity(wasOpacity),
    k.z(CFG.visual.zIndex.ui + 1)
  ])
  wasFixed && (node.main.fixed = true)
  node.main.width = node.measuredW
}
//
// Renders FPS HUD label with a single drop-shadow copy onto a canvas.
//
function bakeFpsHudTextCanvas(text, fontFamily, fillColor, outlineColor) {
  const pad = 4
  const off = HUD_OUTLINE_OFFSET
  const probe = document.createElement('canvas').getContext('2d')
  probe.font = `${HUD_FONT_SIZE}px ${fontFamily}`
  const textW = probe.measureText(text).width
  //
  // Symmetric padding so the drop shadow does not pull the baked label right
  // when the sprite is anchored at the canvas centre.
  //
  const w = Math.ceil(textW + pad * 2 + off * 2)
  const h = Math.ceil(HUD_FONT_SIZE * 1.2 + pad * 2 + off * 2)
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, w)
  canvas.height = Math.max(1, h)
  const ctx = canvas.getContext('2d')
  ctx.font = `${HUD_FONT_SIZE}px ${fontFamily}`
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'center'
  const cx = canvas.width / 2 - off / 2
  const cy = canvas.height / 2 - off / 2
  ctx.fillStyle = rgbToCss(outlineColor)
  ctx.fillText(text, cx + off, cy + off)
  ctx.fillStyle = rgbToCss(fillColor)
  ctx.fillText(text, cx, cy)
  return canvas
}
//
// Stable hash for FPS HUD sprite names.
//
function fpsHudTextHash(text) {
  let h = 0
  for (let i = 0; i < text.length; i++) {
    h = (h * 31 + text.charCodeAt(i)) | 0
  }
  return h >>> 0
}
//
// Converts Kaplay rgb to a CSS colour string.
//
function rgbToCss(rgb) {
  const r = rgb.r ?? rgb[0] ?? 0
  const g = rgb.g ?? rgb[1] ?? 0
  const b = rgb.b ?? rgb[2] ?? 0
  return `rgb(${r | 0},${g | 0},${b | 0})`
}
//
// Approximate draw-call count: visible Kaplay objects with a draw() hook.
//
function countKaplayDrawCalls(k) {
  let drawCalls = 0
  k.get('*').forEach(obj => {
    !obj.hidden && typeof obj.draw === 'function' && drawCalls++
  })
  return drawCalls
}
