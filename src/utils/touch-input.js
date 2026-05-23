//
// Shared touch-device detection and pointer helpers for tooltips and controls
//

let touchPositions = new Map()
let touchInputInitialized = false

/**
 * True when the device likely has no keyboard (phones, tablets)
 * @returns {boolean}
 */
export function isTouchDevice() {
  if (typeof window === 'undefined') return false
  const touchCapable = 'ontouchstart' in window && navigator.maxTouchPoints > 0
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches
  const noHover = window.matchMedia('(hover: none)').matches
  return touchCapable && (coarsePointer || noHover)
}

/**
 * Converts browser client coordinates to Kaplay game space
 * @param {Object} k - Kaplay instance
 * @param {number} clientX - Client X
 * @param {number} clientY - Client Y
 * @returns {{ x: number, y: number }}
 */
export function clientToGame(k, clientX, clientY) {
  const canvas = k.canvas
  if (!canvas) return { x: 0, y: 0 }
  const rect = canvas.getBoundingClientRect()
  const scaleX = k.width() / rect.width
  const scaleY = k.height() / rect.height
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY
  }
}

/**
 * Tracks active touch points on the canvas for tooltip hover emulation
 * @param {Object} k - Kaplay instance
 */
export function initTouchInput(k) {
  if (!isTouchDevice() || touchInputInitialized || !k.canvas) return
  touchInputInitialized = true
  const canvas = k.canvas
  canvas.addEventListener('touchstart', e => onTouchChange(k, e), { passive: false })
  canvas.addEventListener('touchmove', e => onTouchChange(k, e), { passive: false })
  canvas.addEventListener('touchend', e => onTouchEnd(e))
  canvas.addEventListener('touchcancel', e => onTouchEnd(e))
}

/**
 * Primary pointer for legacy single-point checks (first active touch or mouse)
 * @param {Object} k - Kaplay instance
 * @returns {{ x: number, y: number }}
 */
export function getPointerPos(k) {
  if (isTouchDevice() && touchPositions.size > 0) {
    const first = touchPositions.values().next().value
    return first
  }
  return k.mousePos()
}

/**
 * All active touch positions in game space (empty on non-touch devices)
 * @returns {Array<{ x: number, y: number }>}
 */
export function getTouchPositions() {
  return [...touchPositions.values()]
}

/**
 * True when at least one touch is active on touch devices
 * @returns {boolean}
 */
export function hasActiveTouch() {
  return touchPositions.size > 0
}

//
// Positions used for tooltip hit-testing (touches on touch devices, mouse elsewhere)
//
export function getHoverPointers(k) {
  if (isTouchDevice()) {
    const touches = getTouchPositions()
    return touches.length ? touches : []
  }
  return [k.mousePos()]
}

//
// Updates stored touch coordinates from a touch event
//
function onTouchChange(k, e) {
  e.preventDefault()
  for (const touch of e.changedTouches) {
    touchPositions.set(touch.identifier, clientToGame(k, touch.clientX, touch.clientY))
  }
}

//
// Removes ended touch points
//
function onTouchEnd(e) {
  for (const touch of e.changedTouches) {
    touchPositions.delete(touch.identifier)
  }
}
