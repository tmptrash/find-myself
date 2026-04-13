import { CFG } from '../cfg.js'

//
// Tooltip styling constants
//
const FONT_SIZE = 26
const FADE_SPEED = 6
const TOOLTIP_Y_OFFSET = -50
const TOOLTIP_Z_INDEX = 500
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
 * @param {boolean} [cfg.forceVisible] - Skip hover detection, keep tooltip always visible
 * @returns {Object} Tooltip instance with destroy() method
 */
export function create(cfg) {
  const { k, targets, forceVisible = false } = cfg
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
    forceVisible
  }
  //
  // Game object with high z-index so tooltip renders in front of everything
  //
  const drawer = k.add([
    k.pos(0, 0),
    k.z(TOOLTIP_Z_INDEX),
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
//
// Resolve target position (supports static values and dynamic functions)
//
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
// Draw the speech bubble with background, border, pointer, and text.
// Uses frozen position (snapshotted on hover start) so text never shifts
// sub-pixel while visible, eliminating glyph shimmer.
// Automatically flips below the target if the bubble would go off the top edge.
//
function onDraw(inst) {
  if (inst.opacity <= 0.01 || !inst.activeTarget) return
  const { k } = inst
  const target = inst.activeTarget
  //
  // Bubble uses frozen position for stable text rendering (no glyph shimmer).
  // Pointer tracks the live target position so it follows the moving object.
  //
  const liveX = getTargetX(target)
  const liveY = getTargetY(target)
  const bubbleCenterX = inst.frozenX
  const offsetY = target.offsetY ?? TOOLTIP_Y_OFFSET
  const { width: textW, height: textH } = measureText(k, target.text, inst.font)
  const bubbleW = Math.round(textW + BUBBLE_PADDING_X * 2)
  const bubbleH = Math.round(textH + BUBBLE_PADDING_Y * 2)
  const totalW = bubbleW + BUBBLE_BORDER_WIDTH * 2
  const totalH = bubbleH + BUBBLE_BORDER_WIDTH * 2
  const screenW = k.width()
  const screenH = k.height()
  //
  // Decide placement: above or below target.
  // Flips below if the bubble would go off the top edge or forceBelow is set.
  //
  const aboveY = inst.frozenY + offsetY - bubbleH
  const belowThreshold = SCREEN_EDGE_MARGIN + BUBBLE_BORDER_WIDTH
  const showBelow = target.forceBelow || aboveY < belowThreshold
  //
  // Clamp bubble horizontally so it stays within screen edges
  //
  let bubbleX = Math.round(bubbleCenterX - bubbleW / 2)
  const minX = SCREEN_EDGE_MARGIN + BUBBLE_BORDER_WIDTH
  const maxX = screenW - SCREEN_EDGE_MARGIN - BUBBLE_BORDER_WIDTH - bubbleW
  bubbleX = Math.max(minX, Math.min(maxX, bubbleX))
  //
  // Position bubble above or below the target
  //
  let bubbleY
  if (showBelow) {
    bubbleY = inst.frozenY + Math.abs(offsetY)
  } else {
    bubbleY = aboveY
  }
  //
  // Clamp vertically within screen
  //
  const minY = SCREEN_EDGE_MARGIN + BUBBLE_BORDER_WIDTH
  const maxY = screenH - SCREEN_EDGE_MARGIN - BUBBLE_BORDER_WIDTH - bubbleH
  bubbleY = Math.max(minY, Math.min(maxY, bubbleY))
  const borderColor = k.rgb(BUBBLE_BORDER_R, BUBBLE_BORDER_G, BUBBLE_BORDER_B)
  const bgColor = k.rgb(BUBBLE_BG_R, BUBBLE_BG_G, BUBBLE_BG_B)
  //
  // Draw border (slightly larger rounded rect behind the background)
  //
  k.drawRect({
    pos: k.vec2(bubbleX - BUBBLE_BORDER_WIDTH, bubbleY - BUBBLE_BORDER_WIDTH),
    width: totalW,
    height: totalH,
    radius: BUBBLE_CORNER_RADIUS + BUBBLE_BORDER_WIDTH,
    color: borderColor,
    opacity: inst.opacity,
    fixed: false
  })
  //
  // Draw background fill
  //
  k.drawRect({
    pos: k.vec2(bubbleX, bubbleY),
    width: bubbleW,
    height: bubbleH,
    radius: BUBBLE_CORNER_RADIUS,
    color: bgColor,
    opacity: inst.opacity * BUBBLE_BG_OPACITY,
    fixed: false
  })
  //
  // Draw triangle pointer tracking live target X, clamped within bubble width.
  // Pointer points downward (below bubble) when above, upward (above bubble) when below.
  //
  const clampedPointerX = Math.max(
    bubbleX + POINTER_WIDTH,
    Math.min(bubbleX + bubbleW - POINTER_WIDTH, liveX)
  )
  const liveOffsetY = target.offsetY ?? TOOLTIP_Y_OFFSET
  if (showBelow) {
    //
    // Pointer above bubble, pointing up toward target
    //
    const pointerTipY = Math.max(
      liveY + Math.abs(liveOffsetY) - POINTER_HEIGHT,
      SCREEN_EDGE_MARGIN
    )
    const pointerBaseEdge = bubbleY + BUBBLE_BORDER_WIDTH + 1
    drawPointer(k, clampedPointerX, pointerBaseEdge, pointerTipY, borderColor, bgColor, inst.opacity, true)
  } else {
    //
    // Pointer below bubble, pointing down toward target
    //
    const pointerTipY = Math.min(
      liveY + liveOffsetY + POINTER_HEIGHT,
      screenH - SCREEN_EDGE_MARGIN
    )
    const pointerBaseEdge = bubbleY + bubbleH - BUBBLE_BORDER_WIDTH - 1
    drawPointer(k, clampedPointerX, pointerBaseEdge, pointerTipY, borderColor, bgColor, inst.opacity, false)
  }
  //
  // Draw text centered inside the bubble
  //
  k.drawText({
    text: target.text,
    size: FONT_SIZE,
    font: inst.font,
    align: "center",
    lineSpacing: LINE_SPACING,
    pos: k.vec2(Math.round(bubbleX + bubbleW / 2), Math.round(bubbleY + bubbleH / 2)),
    anchor: "center",
    color: k.rgb(TEXT_COLOR_R, TEXT_COLOR_G, TEXT_COLOR_B),
    opacity: inst.opacity,
    fixed: false
  })
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
    fixed: false
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
    fixed: false
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
  if (inst.forceVisible) return
  const mousePos = k.mousePos()
  const dt = k.dt()
  //
  // Find which target the mouse is over (if any)
  //
  let hoveredTarget = null
  for (const target of targets) {
    const tx = getTargetX(target)
    const ty = getTargetY(target)
    const halfW = target.width / 2
    const halfH = target.height / 2
    if (
      mousePos.x >= tx - halfW &&
      mousePos.x <= tx + halfW &&
      mousePos.y >= ty - halfH &&
      mousePos.y <= ty + halfH
    ) {
      hoveredTarget = target
      break
    }
  }
  //
  // Update active target and fade opacity.
  // Freeze position on hover start so text stays pixel-stable (no glyph shimmer).
  //
  if (hoveredTarget) {
    if (inst.activeTarget !== hoveredTarget) {
      inst.activeTarget = hoveredTarget
      inst.frozenX = Math.round(getTargetX(hoveredTarget))
      inst.frozenY = Math.round(getTargetY(hoveredTarget))
    }
    inst.opacity = Math.min(1, inst.opacity + dt * FADE_SPEED)
  } else {
    inst.opacity = Math.max(0, inst.opacity - dt * FADE_SPEED)
    //
    // Clear active target once fully faded so re-hovering the same moving
    // object at a new position captures fresh frozen coordinates.
    //
    if (inst.opacity <= 0) {
      inst.activeTarget = null
    }
  }
}
