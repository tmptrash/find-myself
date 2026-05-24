import { CFG } from '../cfg.js'
import { isTouchDevice } from './touch-input.js'

//
// Virtual movement state — read by hero each frame
//
const virtualLeft = { active: false }
const virtualRight = { active: false }
let jumpHandler = null
let jumpPulse = false
//
// Shared scene state (one set of listeners for the whole game)
//
let activeInst = null
//
// Held movement fingers: touch id -> 'left' | 'right'. Jump is a one-shot pulse, not stored
//
const movementSlots = new Map()
//
// Kaplay event hooks; cancelled and re-registered on every scene mount
//
let touchStartHook = null
let touchEndHook = null
let mouseDownHook = null
let mouseUpHook = null
//
// On-screen control layout (50% larger than base, wide gap between left/right)
//
const ARROW_SIZE = 108
const ARROW_CENTER_GAP = 260
const ARROW_MARGIN_X = 36
const JUMP_ARROW_MARGIN_X = 36
const CIRCLE_RADIUS = 62
//
// Touch hit area is much larger than the visible circle (especially horizontally)
// so fingers can land near a button without missing it. Vertical padding stays
// modest to avoid stealing taps from the play area above/below.
//
const HIT_HALF_WIDTH = 112
const HIT_HALF_HEIGHT = 90
const CIRCLE_GRAY_R = 38
const CIRCLE_GRAY_G = 38
const CIRCLE_GRAY_B = 38
const CIRCLE_OPACITY = 0.72
const ARROW_OUTLINE_SHIFT = 4
const CONTROL_Z = CFG.visual.zIndex.ui + 250
//
// Sentinel identifier for the desktop mouse fallback slot
//
const MOUSE_SLOT_ID = 'mouse'

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
  //
  // Canvas-level CSS so the browser never scrolls/zooms on game touches
  //
  k.canvas && (k.canvas.style.touchAction = 'none')
  const centerY = (floorY + k.height()) / 2 + 5
  const leftX = leftMargin + ARROW_MARGIN_X + CIRCLE_RADIUS
  const rightX = leftX + ARROW_CENTER_GAP
  const jumpX = k.width() - rightMargin - JUMP_ARROW_MARGIN_X - CIRCLE_RADIUS
  //
  // Fresh scene mount — clear stale fingers; hero re-registers jump on spawn
  //
  movementSlots.clear()
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
    centerY
  }
  activeInst.buttons.push(createArrowButton(k, leftX, centerY, 'left'))
  activeInst.buttons.push(createArrowButton(k, rightX, centerY, 'right'))
  activeInst.buttons.push(createArrowButton(k, jumpX, centerY, 'jump'))
  registerKaplayHandlers(k)
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
  return { x, y, halfW: HIT_HALF_WIDTH, halfH: HIT_HALF_HEIGHT, type }
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
// Re-binds Kaplay touch/mouse hooks each scene mount.
// Using Kaplay's API (instead of raw DOM events) avoids the letterbox coordinate
// offset bug and guarantees proper multitouch dispatch on iOS / Android.
//
function registerKaplayHandlers(k) {
  touchStartHook?.cancel?.()
  touchEndHook?.cancel?.()
  mouseDownHook?.cancel?.()
  mouseUpHook?.cancel?.()
  touchStartHook = k.onTouchStart(onKaplayTouchStart)
  touchEndHook = k.onTouchEnd(onKaplayTouchEnd)
  mouseDownHook = k.onMousePress(onKaplayMousePress)
  mouseUpHook = k.onMouseRelease(onKaplayMouseRelease)
}

//
// Each new finger maps to a movement button (held) or fires the jump pulse (one-shot)
//
function onKaplayTouchStart(pos, touch) {
  const inst = activeInst
  if (!inst) return
  const btn = hitVirtualButton(inst, pos.x, pos.y)
  if (!btn) return
  if (btn.type === 'jump') {
    jumpPulse = true
    return
  }
  const id = touch?.identifier ?? touch?.id ?? MOUSE_SLOT_ID
  movementSlots.set(id, btn.type)
  syncVirtualMovement()
}

//
// Only the finger that lifted clears its slot — other fingers stay held
//
function onKaplayTouchEnd(_pos, touch) {
  const id = touch?.identifier ?? touch?.id
  id !== undefined && movementSlots.delete(id)
  syncVirtualMovement()
}

//
// Desktop / devtools mouse: single-pointer fallback
//
function onKaplayMousePress() {
  const inst = activeInst
  if (!inst) return
  const pos = inst.k.mousePos()
  const btn = hitVirtualButton(inst, pos.x, pos.y)
  if (!btn) return
  if (btn.type === 'jump') {
    jumpPulse = true
    return
  }
  movementSlots.set(MOUSE_SLOT_ID, btn.type)
  syncVirtualMovement()
}

function onKaplayMouseRelease() {
  movementSlots.delete(MOUSE_SLOT_ID)
  syncVirtualMovement()
}

//
// Applies combined left/right state from all held movement fingers
//
function syncVirtualMovement() {
  let left = false
  let right = false
  for (const type of movementSlots.values()) {
    if (type === 'left') left = true
    else if (type === 'right') right = true
  }
  virtualLeft.active = left
  virtualRight.active = right
}

//
// Returns the virtual button under a game-space point, if any
//
function hitVirtualButton(inst, x, y) {
  for (const btn of inst.buttons) {
    if (Math.abs(x - btn.x) < btn.halfW && Math.abs(y - btn.y) < btn.halfH) return btn
  }
  return null
}
