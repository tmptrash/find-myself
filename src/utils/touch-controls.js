import { CFG } from '../cfg.js'
import { clientToGame, isTouchDevice } from './touch-input.js'

//
// Virtual movement keys for touch devices without a physical keyboard
//
const virtualLeft = { active: false }
const virtualRight = { active: false }
let jumpHandler = null
let jumpPulse = false
//
// Shared input state — one listener set for the whole game
//
let activeInst = null
let inputSlots = new Map()
let boundCanvas = null
let updateHook = null
const usePointerEvents = typeof PointerEvent !== 'undefined'
//
// On-screen control layout (50% larger than base, wide gap between left/right)
//
const ARROW_SIZE = 108
const ARROW_CENTER_GAP = 180
const ARROW_MARGIN_X = 36
const JUMP_ARROW_MARGIN_X = 36
const CIRCLE_RADIUS = 62
const CIRCLE_GRAY_R = 38
const CIRCLE_GRAY_G = 38
const CIRCLE_GRAY_B = 38
const CIRCLE_OPACITY = 0.72
const ARROW_OUTLINE_SHIFT = 4
const CONTROL_Z = CFG.visual.zIndex.ui + 250

/**
 * True when the device likely has no keyboard (phones, tablets)
 * @returns {boolean}
 */
export function needsTouchControls() {
  return isTouchDevice()
}

/**
 * Registers hero jump handler so the virtual jump button can trigger it
 * @param {Function} fn - Jump action from hero setupControls
 */
export function registerVirtualJumpHandler(fn) {
  jumpHandler = fn
}

/**
 * Processes a queued virtual jump press once per frame
 */
export function processVirtualJump() {
  if (!jumpPulse || !jumpHandler) return
  jumpPulse = false
  jumpHandler()
}

/**
 * True when virtual controls emulate a pressed movement key
 * @param {string} key - Kaplay key name or physical Key* code
 * @returns {boolean}
 */
export function isVirtualKeyDown(key) {
  const leftKeys = CFG.controls.moveLeft
  const rightKeys = CFG.controls.moveRight
  if (leftKeys.includes(key) && virtualLeft.active) return true
  if (rightKeys.includes(key) && virtualRight.active) return true
  return false
}

/**
 * Creates arrow buttons below the game area for touch devices
 * @param {Object} config - Configuration
 * @param {Object} config.k - Kaplay instance
 * @param {number} config.floorY - Top Y of bottom platform / game floor
 * @param {number} config.leftMargin - Left game-area inset
 * @param {number} config.rightMargin - Right game-area inset
 * @returns {Object|null} Touch controls instance
 */
export function create(config) {
  if (!needsTouchControls()) return null
  const { k, floorY, leftMargin, rightMargin } = config
  const centerY = (floorY + k.height()) / 2 + 5
  const leftX = leftMargin + ARROW_MARGIN_X + CIRCLE_RADIUS
  const rightX = leftX + ARROW_CENTER_GAP
  const jumpX = k.width() - rightMargin - JUMP_ARROW_MARGIN_X - CIRCLE_RADIUS
  //
  // Fresh scene mount — clear stale touches; hero re-registers jump on spawn
  //
  inputSlots.clear()
  virtualLeft.active = false
  virtualRight.active = false
  jumpPulse = false
  jumpHandler = null
  activeInst = {
    k,
    buttons: [],
    leftX,
    rightX,
    jumpX,
    centerY,
    jumpWasDown: false
  }
  activeInst.buttons.push(createArrowButton(k, leftX, centerY, 'left'))
  activeInst.buttons.push(createArrowButton(k, rightX, centerY, 'right'))
  activeInst.buttons.push(createArrowButton(k, jumpX, centerY, 'jump'))
  ensureCanvasHandlers(k)
  ensureUpdateLoop(k)
  return activeInst
}

//
// Creates one virtual arrow button drawable
//
function createArrowButton(k, x, y, type) {
  k.add([
    k.z(CONTROL_Z),
    k.fixed(),
    {
      draw() {
        drawControlButton(k, x, y, type)
      }
    }
  ])
  return { x, y, half: CIRCLE_RADIUS, type }
}

//
// Draws gray circle with white arrow and black outline
//
function drawControlButton(k, cx, cy, type) {
  k.drawCircle({
    pos: k.vec2(cx, cy),
    radius: CIRCLE_RADIUS,
    color: k.rgb(CIRCLE_GRAY_R, CIRCLE_GRAY_G, CIRCLE_GRAY_B),
    opacity: CIRCLE_OPACITY
  })
  drawArrowShape(k, cx, cy, type, k.rgb(0, 0, 0), 1, ARROW_OUTLINE_SHIFT)
  drawArrowShape(k, cx, cy, type, k.rgb(0, 0, 0), 1, -ARROW_OUTLINE_SHIFT)
  drawArrowShape(k, cx, cy, type, k.rgb(255, 255, 255), 1, 0)
}

//
// Draws a directional arrow polygon (left, right, or up)
//
function drawArrowShape(k, cx, cy, type, color, opacity, outlineOffset) {
  const half = ARROW_SIZE / 2
  const ox = outlineOffset
  const oy = outlineOffset
  let pts
  if (type === 'left') {
    pts = [
      k.vec2(cx + half * 0.35 + ox, cy - half + oy),
      k.vec2(cx - half * 0.55 + ox, cy + oy),
      k.vec2(cx + half * 0.35 + ox, cy + half + oy)
    ]
  } else if (type === 'right') {
    pts = [
      k.vec2(cx - half * 0.35 + ox, cy - half + oy),
      k.vec2(cx + half * 0.55 + ox, cy + oy),
      k.vec2(cx - half * 0.35 + ox, cy + half + oy)
    ]
  } else {
    pts = [
      k.vec2(cx - half + ox, cy + half * 0.35 + oy),
      k.vec2(cx + ox, cy - half * 0.55 + oy),
      k.vec2(cx + half + ox, cy + half * 0.35 + oy)
    ]
  }
  k.drawPolygon({ pts, color, opacity })
}

//
// Binds canvas handlers; re-binds when Kaplay replaces the canvas element
//
function ensureCanvasHandlers(k) {
  const canvas = k.canvas
  if (!canvas || boundCanvas === canvas) return
  unbindCanvasHandlers()
  boundCanvas = canvas
  canvas.style.touchAction = 'none'
  if (usePointerEvents) {
    canvas.addEventListener('pointerdown', onPointerDown, { capture: true })
    canvas.addEventListener('pointerup', onPointerUp, { capture: true })
    canvas.addEventListener('pointercancel', onPointerUp, { capture: true })
    return
  }
  canvas.addEventListener('touchstart', onTouchStart, { capture: true, passive: false })
  canvas.addEventListener('touchend', onTouchEnd, { capture: true })
  canvas.addEventListener('touchcancel', onTouchEnd, { capture: true })
}

//
// Removes canvas input handlers from the previously bound element
//
function unbindCanvasHandlers() {
  if (!boundCanvas) return
  if (usePointerEvents) {
    boundCanvas.removeEventListener('pointerdown', onPointerDown, { capture: true })
    boundCanvas.removeEventListener('pointerup', onPointerUp, { capture: true })
    boundCanvas.removeEventListener('pointercancel', onPointerUp, { capture: true })
  } else {
    boundCanvas.removeEventListener('touchstart', onTouchStart, { capture: true })
    boundCanvas.removeEventListener('touchend', onTouchEnd, { capture: true })
    boundCanvas.removeEventListener('touchcancel', onTouchEnd, { capture: true })
  }
  boundCanvas = null
}

//
// Registers the per-frame sync loop; Kaplay cancels scene onUpdate on k.go()
//
function ensureUpdateLoop(k) {
  updateHook?.cancel?.()
  updateHook = k.onUpdate(onUpdateGlobal)
}

//
// Sticky pointer slot — each finger keeps its button until pointerup
//
function onPointerDown(e) {
  const inst = activeInst
  if (!inst) return
  if (e.pointerType === 'mouse' && e.button !== 0) return
  const pos = clientToGame(inst.k, e.clientX, e.clientY)
  const btn = hitVirtualButton(inst, pos.x, pos.y)
  if (!btn) return
  e.preventDefault()
  e.stopImmediatePropagation()
  try {
    boundCanvas?.setPointerCapture(e.pointerId)
  } catch (_) {}
  inputSlots.set(e.pointerId, btn.type)
  btn.type === 'jump' && (jumpPulse = true)
  syncVirtualMovement()
}

//
// Clears only the pointer that lifted
//
function onPointerUp(e) {
  inputSlots.delete(e.pointerId)
  syncVirtualMovement()
}

//
// Legacy touch fallback — sticky slots, never prune other fingers on touchstart
//
function onTouchStart(e) {
  const inst = activeInst
  if (!inst) return
  let hitControl = false
  for (const touch of e.changedTouches) {
    const pos = clientToGame(inst.k, touch.clientX, touch.clientY)
    const btn = hitVirtualButton(inst, pos.x, pos.y)
    if (!btn) continue
    hitControl = true
    inputSlots.set(touch.identifier, btn.type)
    btn.type === 'jump' && (jumpPulse = true)
  }
  if (hitControl) {
    e.preventDefault()
    e.stopImmediatePropagation()
  }
  syncVirtualMovement()
}

//
// Clears only touches that ended
//
function onTouchEnd(e) {
  for (const touch of e.changedTouches) {
    inputSlots.delete(touch.identifier)
  }
  syncVirtualMovement()
}

//
// Applies combined left/right state from all active input slots
//
function syncVirtualMovement() {
  const types = [...inputSlots.values()]
  virtualLeft.active = types.includes('left')
  virtualRight.active = types.includes('right')
}

//
// Returns the virtual button under a game-space point, if any
//
function hitVirtualButton(inst, x, y) {
  for (const btn of inst.buttons) {
    if (Math.abs(x - btn.x) < btn.half && Math.abs(y - btn.y) < btn.half) return btn
  }
  return null
}

//
// Re-sync movement each frame; mouse fallback when no pointer slots are active
//
function onUpdateGlobal() {
  const inst = activeInst
  if (!inst) return
  if (inputSlots.size > 0) {
    syncVirtualMovement()
    return
  }
  const mp = inst.k.mousePos()
  const down = inst.k.isMouseDown()
  let leftActive = false
  let rightActive = false
  let jumpActive = false
  inst.buttons.forEach(btn => {
    const hit = Math.abs(mp.x - btn.x) < btn.half && Math.abs(mp.y - btn.y) < btn.half
    if (!hit || !down) return
    btn.type === 'left' && (leftActive = true)
    btn.type === 'right' && (rightActive = true)
    btn.type === 'jump' && (jumpActive = true)
  })
  if (virtualLeft.active !== leftActive) virtualLeft.active = leftActive
  if (virtualRight.active !== rightActive) virtualRight.active = rightActive
  jumpActive && !inst.jumpWasDown && (jumpPulse = true)
  inst.jumpWasDown = jumpActive
}
