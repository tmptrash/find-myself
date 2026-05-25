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
 * Registers global Kaplay touch hooks so tooltip hit-testing tracks active fingers
 * @param {Object} k - Kaplay instance
 */
export function initTouchInput(k) {
  if (!isTouchDevice() || touchInputInitialized || !k) return
  touchInputInitialized = true
  k.canvas && (k.canvas.style.touchAction = 'none')
  k.onTouchStart(onKaplayTouchStart)
  k.onTouchMove(onKaplayTouchMove)
  k.onTouchEnd(onKaplayTouchEnd)
}

/**
 * Primary pointer for legacy single-point checks (first active touch or mouse)
 * @param {Object} k - Kaplay instance
 * @returns {{ x: number, y: number }}
 */
export function getPointerPos(k) {
  if (isTouchDevice() && touchPositions.size > 0) {
    return touchPositions.values().next().value
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
    //
    // Show tooltips only while a finger is down. Kaplay mousePos lingers after
    // touchend, so never use it as a hover source on touch devices.
    //
    return hasActiveTouch() ? getTouchPositions() : []
  }
  return [k.mousePos()]
}

/**
 * Records an active touch point in game space (Kaplay touch hook sync)
 * @param {number} id - Touch identifier
 * @param {{ x: number, y: number }} pos - Game-space position
 */
export function setTouchPoint(id, pos) {
  touchPositions.set(id, pos)
}

/**
 * Removes a touch point when the finger lifts
 * @param {number} id - Touch identifier
 */
export function removeTouchPoint(id) {
  touchPositions.delete(id)
}

//
// Kaplay touch hook handlers — single source of truth for active finger positions
//
function onKaplayTouchStart(pos, touch) {
  setTouchPoint(getTouchId(touch), { x: pos.x, y: pos.y })
}

function onKaplayTouchMove(pos, touch) {
  setTouchPoint(getTouchId(touch), { x: pos.x, y: pos.y })
}

function onKaplayTouchEnd(_pos, touch) {
  removeTouchPoint(getTouchId(touch))
}

//
// Resolves Kaplay / browser touch identifier
//
function getTouchId(touch) {
  return touch?.identifier ?? touch?.id ?? 0
}
