import { CFG } from '../cfg.js'
import * as TouchInput from './touch-input.js'

//
// Tooltip styling constants
//
const FONT_SIZE = 26
const FADE_SPEED = 6
const TOUCH_INSTANT_OPACITY = 1
const TOOLTIP_Y_OFFSET = -50
const TOOLTIP_Z_INDEX = 500
const TOOLTIP_Z_STACK_SPAN = 12
const SCREEN_EDGE_MARGIN = 6
const LINE_SPACING = 6
//
// Bubble appearance
//
const BUBBLE_PADDING_X = 14
const BUBBLE_PADDING_Y = 10
const BUBBLE_BORDER_WIDTH = 3
const BUBBLE_CORNER_RADIUS = 10
const BUBBLE_BG_R = 245
const BUBBLE_BG_G = 242
const BUBBLE_BG_B = 235
const BUBBLE_BG_OPACITY = 0.92
const BUBBLE_BORDER_R = 20
const BUBBLE_BORDER_G = 20
const BUBBLE_BORDER_B = 20
//
// Triangle pointer below bubble
//
const POINTER_WIDTH = 12
const POINTER_HEIGHT = 10
//
// Text color (dark on light background)
//
const TEXT_COLOR_R = 30
const TEXT_COLOR_G = 30
const TEXT_COLOR_B = 30
//
// Vertical gap between stacked tooltips
//
const STACK_GAP = 8
//
// Frame-level registry for active tooltip positions to prevent overlap
//
const activeTooltipRects = []
let lastRegistryFrame = -1
//
// Global suppression flag: when true, all tooltips are hidden
//
let globalSuppressed = false

/**
 * Creates a tooltip system that shows a speech-bubble hint when the mouse
 * hovers over target areas. Each target is a rectangular zone with associated text.
 * Targets can have static positions or dynamic positions via functions for moving objects.
 * The tooltip renders in front of all game objects using a high z-index.
 * @param {Object} cfg - Configuration
 * @param {Object} cfg.k - Kaplay instance
 * @param {Array<Object>} cfg.targets - Array of hover targets
 * @param {number|Function} cfg.targets[].x - Center X of hover zone (or function returning X)
 * @param {number|Function} cfg.targets[].y - Center Y of hover zone (or function returning Y)
 * @param {number} cfg.targets[].width - Width of hover zone
 * @param {number} cfg.targets[].height - Height of hover zone
 * @param {string} cfg.targets[].text - Tooltip text (supports \n for multiline)
 * @param {number} [cfg.targets[].offsetY] - Custom Y offset for tooltip (default: TOOLTIP_Y_OFFSET)
 * @param {boolean} [cfg.targets[].forceBelow] - Force tooltip to appear below the target
 * @param {boolean} [cfg.targets[].forceAbove] - Keep the bubble above the target even if it overlaps the HUD
 * @param {boolean} [cfg.forceVisible] - Skip hover detection, keep tooltip always visible
 * @param {Object} [cfg.clampInset] - Extra screen inset when clamping the bubble
 * @param {number} [cfg.clampInset.left] - Left playfield / chrome inset
 * @param {number} [cfg.clampInset.right] - Right playfield / chrome inset
 * @param {number} [cfg.clampInset.top] - Top playfield / chrome inset
 * @param {number} [cfg.clampInset.bottom] - Bottom playfield / chrome inset
 * @returns {Object} Tooltip instance with destroy() method
 */
export function create(cfg) {
  const { k, targets, forceVisible = false, clampInset = null, customDraw = null } = cfg
  const font = CFG.visual.fonts.regularFull.replace(/'/g, '')
  //
  // Tooltip rendering state
  //
  const inst = {
    k,
    targets,
    activeTarget: null,
    opacity: 0,
    font,
    frozenX: 0,
    frozenY: 0,
    forceVisible,
    clampInset,
    customDraw
  }
  //
  // One drawer: bubble then pointer then text so the ear sits on its own
  // cloud. Stack z puts an earlier (lower) tooltip above a later one, so a
  // downward ear that crosses a neighbour is covered by that neighbour.
  //
  const drawer = k.add([
    k.pos(0, 0),
    k.z(TOOLTIP_Z_INDEX),
    k.fixed(),
    { draw() { onDraw(inst) } }
  ])
  //
  // Update: check mouse position against targets and fade in/out
  //
  const updateHandler = k.onUpdate(() => onUpdate(inst))
  inst.drawer = drawer
  inst.updateHandler = updateHandler
  return inst
}

/**
 * Removes all tooltip handlers and game objects
 * @param {Object} inst - Tooltip instance
 */
export function destroy(inst) {
  inst.drawer?.exists?.() && inst.k.destroy(inst.drawer)
  inst.updateHandler?.cancel()
}

/**
 * Suppresses all tooltips globally (e.g. during life deduction animation)
 */
export function suppressAll() {
  globalSuppressed = true
}

/**
 * Restores normal tooltip behavior after suppression
 */
export function unsuppressAll() {
  globalSuppressed = false
}
//
// Resolve pointer position for hit-testing (screen space or world space).
//
function pointerForTarget(k, pointerPos, target) {
  if (target.screenSpace) return pointerPos
  return k.toWorld(pointerPos)
}
//
// Converts a world position to screen coordinates for fixed UI drawing.
//
function worldToScreen(k, wx, wy) {
  const cam = k.camPos()
  return {
    x: wx - cam.x + k.width() / 2,
    y: wy - cam.y + k.height() / 2
  }
}
//
// Resolves a target centre to screen space (HUD targets are already screen space).
//
function targetScreenPos(k, target) {
  const tx = getTargetX(target)
  const ty = getTargetY(target)
  return target.screenSpace ? { x: tx, y: ty } : worldToScreen(k, tx, ty)
}
//
// Keeps forced-visible bubbles pinned in screen space (moving world targets).
//
function syncFrozenScreenPos(inst, target) {
  const screen = targetScreenPos(inst.k, target)
  inst.frozenX = Math.round(screen.x)
  inst.frozenY = Math.round(screen.y)
}
function getTargetX(target) {
  return typeof target.x === 'function' ? target.x() : target.x
}
//
// Resolve target Y position
//
function getTargetY(target) {
  return typeof target.y === 'function' ? target.y() : target.y
}
//
// Measure text dimensions using Kaplay's formatText for precise sizing
//
function measureText(k, text, font) {
  const fmt = k.formatText({
    text,
    size: FONT_SIZE,
    font,
    align: "center",
    lineSpacing: LINE_SPACING
  })
  return { width: fmt.width, height: fmt.height }
}
//
// Ear sits on its own bubble; a neighbour with higher z covers this ear
// when the triangle stretches into that other cloud.
//
function onDraw(inst) {
  const layout = inst._layout
  if (!layout) return
  if (inst.customDraw) {
    inst.customDraw(inst, layout)
    return
  }
  const { k } = inst
  k.drawRect({
    pos: k.vec2(layout.bubbleX - BUBBLE_BORDER_WIDTH, layout.bubbleY - BUBBLE_BORDER_WIDTH),
    width: layout.totalW,
    height: layout.totalH,
    radius: BUBBLE_CORNER_RADIUS + BUBBLE_BORDER_WIDTH,
    color: layout.borderColor,
    opacity: inst.opacity,
    fixed: true
  })
  k.drawRect({
    pos: k.vec2(layout.bubbleX, layout.bubbleY),
    width: layout.bubbleW,
    height: layout.bubbleH,
    radius: BUBBLE_CORNER_RADIUS,
    color: layout.bgColor,
    opacity: inst.opacity * BUBBLE_BG_OPACITY,
    fixed: true
  })
  drawPointer(
    k,
    layout.clampedPointerX,
    layout.pointerBaseEdge,
    layout.pointerTipY,
    layout.borderColor,
    layout.bgColor,
    inst.opacity,
    layout.showBelow
  )
  k.drawText({
    text: layout.labelText,
    size: FONT_SIZE,
    font: inst.font,
    align: "center",
    lineSpacing: LINE_SPACING,
    pos: k.vec2(
      Math.round(layout.bubbleX + layout.bubbleW / 2),
      Math.round(layout.bubbleY + layout.bubbleH / 2)
    ),
    anchor: "center",
    color: k.rgb(TEXT_COLOR_R, TEXT_COLOR_G, TEXT_COLOR_B),
    opacity: inst.opacity,
    fixed: true
  })
}
//
// Resolves bubble geometry for this frame and registers it for stacking.
//
function refreshLayout(inst) {
  if (inst.opacity <= 0.01 || !inst.activeTarget || (!inst.frozenX && !inst.frozenY)) {
    inst._layout = null
    return
  }
  const { k } = inst
  const target = inst.activeTarget
  const currentFrame = k.time()
  if (currentFrame !== lastRegistryFrame) {
    activeTooltipRects.length = 0
    lastRegistryFrame = currentFrame
  }
  const liveScreen = targetScreenPos(k, target)
  const liveX = liveScreen.x
  const liveY = liveScreen.y
  const bubbleCenterX = inst.frozenX
  const offsetY = target.offsetY ?? TOOLTIP_Y_OFFSET
  const labelText = resolveTargetText(target)
  const { width: textW, height: textH } = measureText(k, labelText, inst.font)
  const bubbleW = Math.round(textW + BUBBLE_PADDING_X * 2)
  const bubbleH = Math.round(textH + BUBBLE_PADDING_Y * 2)
  const totalW = bubbleW + BUBBLE_BORDER_WIDTH * 2
  const totalH = bubbleH + BUBBLE_BORDER_WIDTH * 2
  const screenW = k.width()
  const screenH = k.height()
  const inset = inst.clampInset || {}
  const insetLeft = inset.left ?? 0
  const insetRight = inset.right ?? 0
  const insetTop = inset.top ?? 0
  const insetBottom = inset.bottom ?? 0
  const aboveY = inst.frozenY + offsetY - bubbleH
  const belowThreshold = insetTop + SCREEN_EDGE_MARGIN + BUBBLE_BORDER_WIDTH
  const showBelow = !target.forceAbove && (target.forceBelow || aboveY < belowThreshold)
  let bubbleX = Math.round(bubbleCenterX - bubbleW / 2)
  const minX = insetLeft + SCREEN_EDGE_MARGIN + BUBBLE_BORDER_WIDTH
  const maxX = screenW - insetRight - SCREEN_EDGE_MARGIN - BUBBLE_BORDER_WIDTH - bubbleW
  bubbleX = Math.max(minX, Math.min(maxX, bubbleX))
  let bubbleY = showBelow ? inst.frozenY + Math.abs(offsetY) : aboveY
  const minY = (target.forceAbove ? 0 : insetTop) + SCREEN_EDGE_MARGIN + BUBBLE_BORDER_WIDTH
  const maxY = screenH - insetBottom - SCREEN_EDGE_MARGIN - BUBBLE_BORDER_WIDTH - bubbleH
  bubbleY = Math.max(minY, Math.min(maxY, bubbleY))
  bubbleY = avoidOverlap(bubbleX, bubbleY, totalW, totalH, minY)
  const borderColor = k.rgb(BUBBLE_BORDER_R, BUBBLE_BORDER_G, BUBBLE_BORDER_B)
  const bgColor = k.rgb(BUBBLE_BG_R, BUBBLE_BG_G, BUBBLE_BG_B)
  const clampedPointerX = Math.max(
    bubbleX + POINTER_WIDTH,
    Math.min(bubbleX + bubbleW - POINTER_WIDTH, liveX)
  )
  const liveOffsetY = target.offsetY ?? TOOLTIP_Y_OFFSET
  let pointerTipY
  let pointerBaseEdge
  if (showBelow) {
    pointerTipY = Math.max(
      liveY + Math.abs(liveOffsetY) - POINTER_HEIGHT,
      SCREEN_EDGE_MARGIN
    )
    pointerBaseEdge = bubbleY + BUBBLE_BORDER_WIDTH + 1
  } else {
    pointerTipY = Math.min(
      liveY + liveOffsetY + POINTER_HEIGHT,
      screenH - SCREEN_EDGE_MARGIN
    )
    pointerBaseEdge = bubbleY + bubbleH - BUBBLE_BORDER_WIDTH - 1
  }
  activeTooltipRects.push({
    x: bubbleX - BUBBLE_BORDER_WIDTH,
    y: bubbleY - BUBBLE_BORDER_WIDTH,
    w: totalW,
    h: totalH
  })
  //
  // Earlier tooltips sit lower after stacking and keep a higher z, so their
  // cloud covers a later tooltip's downward ear when the two overlap.
  //
  const stackIndex = activeTooltipRects.length - 1
  inst.drawer && (inst.drawer.z = TOOLTIP_Z_INDEX + (TOOLTIP_Z_STACK_SPAN - stackIndex))
  inst._layout = {
    bubbleX,
    bubbleY,
    bubbleW,
    bubbleH,
    totalW,
    totalH,
    labelText,
    borderColor,
    bgColor,
    showBelow,
    clampedPointerX,
    pointerBaseEdge,
    pointerTipY
  }
}
//
// Shift bubbleY upward until it no longer overlaps with any registered tooltip
//
function avoidOverlap(bubbleX, bubbleY, totalW, totalH, minY) {
  const bx = bubbleX - BUBBLE_BORDER_WIDTH
  const bw = totalW
  for (let i = 0; i < activeTooltipRects.length; i++) {
    const r = activeTooltipRects[i]
    const overlapX = bx < r.x + r.w && bx + bw > r.x
    const overlapY = bubbleY - BUBBLE_BORDER_WIDTH < r.y + r.h && bubbleY - BUBBLE_BORDER_WIDTH + totalH > r.y
    if (overlapX && overlapY) {
      bubbleY = r.y - totalH - STACK_GAP + BUBBLE_BORDER_WIDTH
      bubbleY = Math.max(minY, bubbleY)
    }
  }
  return bubbleY
}
//
// Draw the triangle pointer (border + fill) either pointing down or up
//
function drawPointer(k, tipX, baseEdgeY, tipY, borderColor, bgColor, opacity, pointsUp) {
  const halfW = POINTER_WIDTH / 2
  const bw = BUBBLE_BORDER_WIDTH
  //
  // Border triangle (slightly wider for outline effect)
  //
  k.drawTriangle({
    p1: k.vec2(tipX - halfW - bw, baseEdgeY),
    p2: k.vec2(tipX + halfW + bw, baseEdgeY),
    p3: k.vec2(tipX, pointsUp ? tipY - bw : tipY + bw),
    color: borderColor,
    opacity,
    fixed: true
  })
  //
  // Fill triangle
  //
  k.drawTriangle({
    p1: k.vec2(tipX - halfW, baseEdgeY),
    p2: k.vec2(tipX + halfW, baseEdgeY),
    p3: k.vec2(tipX, tipY),
    color: bgColor,
    opacity: opacity * BUBBLE_BG_OPACITY,
    fixed: true
  })
}
//
// Check mouse position against targets, update active target and opacity
//
function onUpdate(inst) {
  const { k, targets } = inst
  //
  // In forceVisible mode, skip hover detection entirely.
  // The caller manages activeTarget, frozenX/Y, and opacity directly.
  //
  if (globalSuppressed) {
    inst.opacity = Math.max(0, inst.opacity - k.dt() * FADE_SPEED)
    if (inst.opacity <= 0) inst.activeTarget = null
    refreshLayout(inst)
    return
  }
  //
  // Forced-visible tooltips skip hover detection but still respect suppression above
  //
  if (inst.forceVisible) {
    inst.activeTarget && syncFrozenScreenPos(inst, inst.activeTarget)
    refreshLayout(inst)
    return
  }
  const pointers = TouchInput.getHoverPointers(k)
  const dt = k.dt()
  const touchInstant = TouchInput.isTouchDevice()
  //
  // On touch devices tooltips exist only while a finger is down
  //
  if (touchInstant && !TouchInput.hasActiveTouch()) {
    inst.opacity = 0
    inst.activeTarget = null
    refreshLayout(inst)
    return
  }
  //
  // Find which target a pointer is over (if any)
  //
  let hoveredTarget = null
  for (const target of targets) {
    const tx = getTargetX(target)
    const ty = getTargetY(target)
    //
    // If the target has a visible() guard, skip when it returns false.
    //
    if (typeof target.visible === 'function' && !target.visible()) continue
    if (target.visible === false) continue
    const halfW = target.width / 2
    const halfH = target.height / 2
    for (const pointerPos of pointers) {
      const worldPointer = pointerForTarget(k, pointerPos, target)
      if (
        worldPointer.x >= tx - halfW &&
        worldPointer.x <= tx + halfW &&
        worldPointer.y >= ty - halfH &&
        worldPointer.y <= ty + halfH
      ) {
        hoveredTarget = target
        break
      }
    }
    if (hoveredTarget) break
  }
  //
  // Update active target and fade opacity.
  // Freeze position on hover start so text stays pixel-stable (no glyph shimmer).
  //
  if (hoveredTarget) {
    if (inst.activeTarget !== hoveredTarget) {
      inst.activeTarget = hoveredTarget
      const screen = targetScreenPos(k, hoveredTarget)
      inst.frozenX = Math.round(screen.x)
      inst.frozenY = Math.round(screen.y)
      inst.opacity = touchInstant ? TOUCH_INSTANT_OPACITY : 0
    }
    inst.opacity = touchInstant
      ? TOUCH_INSTANT_OPACITY
      : Math.min(1, inst.opacity + dt * FADE_SPEED)
  } else {
    //
    // Hide instantly when mouse leaves so a fading-out tooltip from one
    // target never visually overlaps with a newly appearing tooltip nearby.
    //
    inst.opacity = 0
    inst.activeTarget = null
  }
  refreshLayout(inst)
}
//
// Resolves tooltip label (supports dynamic getter functions)
//
function resolveTargetText(target) {
  return typeof target.text === 'function' ? target.text() : target.text
}
