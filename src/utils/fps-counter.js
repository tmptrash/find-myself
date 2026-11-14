import { CFG } from '../cfg.js'
import { getRGB } from './helper.js'
import { isTouchDevice } from './touch-input.js'

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
//
// The readout is drawn faint on desktop; on phones and tablets it is solid
// black (cfg fpsHudTextTouch), so fully opaque.
//
const HUD_OPACITY = 0.7
const HUD_TOUCH_OPACITY = 1
//
// Glyphs the FPS / timer labels can show. Baked once per engine so a
// once-per-second label change copies cells instead of re-grading pixels.
//
const FPS_GLYPH_CHARS = ' 0123456789:FPSobjtdcime'
const FPS_GLYPH_ATLAS_SEED = 4400
const glyphAtlasByK = new WeakMap()

/**
 * Creates FPS counter display
 * @param {Object} config - Configuration
 * @param {Object} config.k - Kaplay instance
 * @param {boolean} [config.showTimer=false] - Whether to show level elapsed timer
 * @param {number} [config.topY=55] - Vertical position (pixels from top)
 * @param {Object} [config.textColor] - Optional Kaplay rgb for the numerals
 * @param {Object} [config.outlineColor] - Optional Kaplay rgb for the drop shadow
 * @param {boolean} [config.shadow=true] - Draw the drop shadow under the label
 * @param {Function} [config.postBakeCanvas] - Grade/grain pass for the baked glyph atlas
 * @param {number} [config.fontScale=1] - Label size relative to the default HUD font
 * @param {boolean} [config.fpsOnly=false] - Never add the debug object / draw-call counts
 * @returns {Object} FPS counter instance
 */
export function create(config) {
  const { k, showTimer = false, topY = 55, textColor = null, outlineColor = null, postBakeCanvas = null, fontScale = 1, fpsOnly = false, shadow = true } = config
  const font = CFG.visual.fonts.regularFull.replace(/'/g, '')
  const fontSize = Math.round(HUD_FONT_SIZE * fontScale)
  const stats = !fpsOnly && Boolean(CFG.debug?.showPerformanceHud)
  //
  // HUD numerals (FPS + timer) share the same neutral grey as the
  // section indicator inactive letters and the top-right scoreboard so
  // every quiet HUD slot reads as one consistent colour.
  //
  const HUD_TEXT_GREY = isTouchDevice() ? getRGB(k, CFG.visual.colors.palette.fpsHudTextTouch) : textColor || k.rgb(176, 176, 176)
  const HUD_OUTLINE = shadow ? outlineColor || k.rgb(0, 0, 0) : null
  const fpsText = createOutlinedHudText(k, 'FPS:30', font, fontSize, HUD_TEXT_GREY, topY, HUD_OUTLINE, postBakeCanvas)
  //
  // Optional elapsed level timer
  //
  let timerText = null
  if (showTimer) {
    timerText = createOutlinedHudText(k, 'time: 00:00', font, fontSize, HUD_TEXT_GREY, topY, HUD_OUTLINE, postBakeCanvas)
  }
  layoutHudRow(k, [fpsText, timerText])
  if (stats) {
    const numObjects = k.get('*').length
    const drawCalls = countKaplayDrawCalls(k)
    setOutlinedHudText(fpsText, `FPS:30  obj: ${numObjects}  dc: ${drawCalls}`)
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
    stats,
    updateTimer: 0,
    fpsSum: 0,
    fpsCount: 0,
    levelTime: 0,
    debugUpdateTimer: 0,
    cachedObjCount: stats ? k.get('*').length : 0,
    cachedDrawCalls: stats ? countKaplayDrawCalls(k) : 0
  }
  stats && layoutAtScreenCenterX(inst, k.width() / 2)
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
  if (inst.stats) {
    inst.debugUpdateTimer += frameDt
    if (inst.debugUpdateTimer >= 0.25) {
      inst.debugUpdateTimer = 0
      inst.cachedObjCount = k.get('*').length
      inst.cachedDrawCalls = countKaplayDrawCalls(k)
    }
  }
  if (inst.updateTimer >= 1.0) {
    const averageFps = Math.round(inst.fpsSum / inst.fpsCount)
    const fpsLabel = `FPS:${averageFps}`
    const hudText = inst.stats
      ? `${fpsLabel}  obj: ${inst.cachedObjCount}  dc: ${inst.cachedDrawCalls}`
      : fpsLabel
    setOutlinedHudText(fpsHud, hudText)
    inst.updateTimer = 0
    inst.fpsSum = 0
    inst.fpsCount = 0
  }
  if (inst.leftX != null) return layoutAtScreenLeftX(inst, inst.leftX)
  inst.stats &&
    layoutAtScreenCenterX(inst, inst.layoutCenterX ?? inst.k.width() / 2)
}
/**
 * Pins FPS HUD nodes to screen space (same as FOREST label / scoreboard).
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
 * Keeps the FPS row's left edge at a fixed screen X (the label's width
 * changes with its digits, so it is laid out again on every update).
 * @param {Object} inst - FPS counter instance
 * @param {number} leftX - Screen-space left edge X
 */
export function layoutAtScreenLeftX(inst, leftX) {
  if (!inst?.fpsHud) return
  inst.leftX = leftX
  layoutAtScreenCenterX(inst, leftX + inst.fpsHud.main.width / 2)
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
// Creates HUD text with a single drop-shadow copy (forest-level style); no
// shadow when outlineColor is null.
//
function createOutlinedHudText(k, text, font, fontSize, color, topY, outlineColor, postBakeCanvas = null) {
  if (postBakeCanvas) {
    return createBakedOutlinedHudText(k, text, font, fontSize, color, topY, outlineColor, postBakeCanvas)
  }
  const outlineNodes = (outlineColor ? buildOutlineOffsets(HUD_OUTLINE_OFFSET) : []).map(([dx, dy]) => k.add([
    k.text(text, { size: fontSize, font }),
    k.pos(0, topY + dy),
    k.anchor('center'),
    k.z(CFG.visual.zIndex.ui),
    k.color(outlineColor),
    k.opacity(hudOpacity())
  ]))
  const main = k.add([
    k.text(text, { size: fontSize, font }),
    k.pos(0, topY),
    k.anchor('center'),
    k.z(CFG.visual.zIndex.ui + 1),
    k.color(color),
    k.opacity(hudOpacity())
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
// style the forest level uses.
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
      const [dx, ] = outlineOffsets[oi]
      outline.pos.x = centerX + dx
    })
    cursorX += t.main.width + (i === 0 ? HUD_GAP_AFTER_FPS : HUD_GAP)
  })
}
//
// Baked HUD text path — shadow + fill on one canvas, then postBakeCanvas grain.
//
function createBakedOutlinedHudText(k, text, font, fontSize, color, topY, outlineColor, postBakeCanvas) {
  const node = {
    k,
    main: null,
    outlineNodes: [],
    bakedHolder: true,
    postBakeCanvas,
    font,
    fontSize,
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
// Points the HUD label at new text. The glyph atlas is a Kaplay sprite
// loaded once per live k; the label is one game object that draws each
// character as a cell of that atlas, so a new string only changes what is
// drawn — no canvas, no sprite upload (re-uploading a label once a second
// cost ~165 ms of texture upload a time on phones).
//
function rebuildBakedHudTextNode(node, text, centerX) {
  const { k, font, fontSize, color, outlineColor, topY, postBakeCanvas } = node
  node.layoutCenterX = centerX
  node.lastText = text
  const atlas = fpsGlyphAtlas(k, font, fontSize, color, outlineColor, postBakeCanvas)
  node.atlas = atlas
  node.glyphs = layoutGlyphs(text, atlas, node.glyphs ?? [])
  node.measuredW = Math.max(1, Math.ceil(node.glyphs.width + HUD_OUTLINE_OFFSET))
  if (!node.main?.exists?.()) node.main = addGlyphLabel(k, node, centerX, topY)
  node.main.width = node.measuredW
}
//
// The label's game object: drawn from the glyph atlas at its centre, at the
// HUD's layer, faint or solid like the other HUD text.
//
function addGlyphLabel(k, node, centerX, topY) {
  const label = k.add([
    k.pos(centerX, topY),
    k.opacity(hudOpacity()),
    k.z(CFG.visual.zIndex.ui + 1),
    {
      draw() {
        drawGlyphLabel(k, node, this)
      }
    }
  ])
  label.width = node.measuredW
  return label
}
//
// Each glyph of the label as its cell of the atlas sprite, left to right
// from the label's left edge (the label is centred on its position).
//
function drawGlyphLabel(k, node, label) {
  const { atlas, glyphs } = node
  if (!atlas?.sprite) return
  const left = -node.measuredW / 2
  const top = -atlas.cellH / 2
  const pos = atlas.drawPos
  for (let i = 0; i < glyphs.length; i++) {
    const g = glyphs[i]
    pos.x = left + g.x
    pos.y = top
    k.drawSprite({ sprite: atlas.sprite, quad: g.cell.quad, width: g.cell.w, height: atlas.cellH, pos, opacity: label.opacity, fixed: label.fixed })
  }
}
//
// Places a string's glyphs along a line (reusing the list), each at the
// running advance; unknown characters are skipped.
//
function layoutGlyphs(text, atlas, glyphs) {
  glyphs.length = 0
  let cursor = 0
  for (const ch of text) {
    const cell = atlas.cells.get(ch)
    if (!cell) continue
    glyphs.push({ cell, x: cursor })
    cursor += cell.advance
  }
  glyphs.width = cursor
  return glyphs
}
function hudOpacity() {
  return isTouchDevice() ? HUD_TOUCH_OPACITY : HUD_OPACITY
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
//
// One graded glyph atlas per live Kaplay instance and colour pair, loaded
// once as a sprite (each glyph a quad of it).
//
function fpsGlyphAtlas(k, font, fontSize, fillColor, outlineColor, postBakeCanvas) {
  let byKey = glyphAtlasByK.get(k)
  if (!byKey) {
    byKey = new Map()
    glyphAtlasByK.set(k, byKey)
  }
  const key = `${font}|${fontSize}|${rgbToCss(fillColor)}|${outlineColor ? rgbToCss(outlineColor) : 'none'}`
  const cached = byKey.get(key)
  if (cached) return cached
  const atlas = bakeFpsGlyphAtlas(font, fontSize, fillColor, outlineColor, postBakeCanvas)
  atlas.sprite = `fps-hud-glyphs-${byKey.size}-${fontSize}`
  k.loadSprite(atlas.sprite, atlas.canvas)
  atlas.cells.forEach(cell => {
    cell.quad = k.quad(cell.x / atlas.canvas.width, 0, cell.w / atlas.canvas.width, 1)
  })
  atlas.drawPos = k.vec2(0, 0)
  byKey.set(key, atlas)
  return atlas
}
//
// Draws every HUD glyph once, then runs the section grain/grade pass.
//
function bakeFpsGlyphAtlas(font, fontSize, fillColor, outlineColor, postBakeCanvas) {
  const probe = document.createElement('canvas').getContext('2d')
  probe.font = `${fontSize}px ${font}`
  const off = HUD_OUTLINE_OFFSET
  const cellH = Math.ceil(fontSize * 1.2 + off)
  const cells = new Map()
  const layout = []
  let x = 0
  for (const ch of FPS_GLYPH_CHARS) {
    const advance = Math.max(1, probe.measureText(ch).width)
    const cellW = Math.ceil(advance + off)
    layout.push({ ch, x, advance, cellW })
    x += cellW
  }
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, x)
  canvas.height = cellH
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.font = `${fontSize}px ${font}`
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'
  const cy = cellH / 2 - off / 2
  const shadow = outlineColor ? rgbToCss(outlineColor) : null
  const fill = rgbToCss(fillColor)
  layout.forEach(cell => {
    if (shadow) {
      ctx.fillStyle = shadow
      ctx.fillText(cell.ch, cell.x + off, cy + off)
    }
    ctx.fillStyle = fill
    ctx.fillText(cell.ch, cell.x, cy)
    cells.set(cell.ch, { x: cell.x, w: cell.cellW, advance: cell.advance })
  })
  postBakeCanvas?.(canvas, FPS_GLYPH_ATLAS_SEED)
  return { canvas, cells, cellH }
}
