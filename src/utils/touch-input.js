//
// Shared touch-device detection and pointer helpers for tooltips and controls
//

let touchPositions = new Map()
let touchDeviceCached = null
let coarsePointerQuery = null
let noHoverQuery = null
//
// Tracks which Kaplay instance the touch hooks are currently registered on —
// an engine swap (see engine-switch.js) boots a brand new k, so the hooks
// must be re-registered on it rather than skipped as "already initialized".
//
let touchInputInitializedFor = null

/**
 * True when the device likely has no keyboard (phones, tablets)
 * @returns {boolean}
 */
export function isTouchDevice() {
  if (typeof window === 'undefined') return false
  ensureTouchDeviceWatch()
  return touchDeviceCached
}


/**
 * Registers global Kaplay touch hooks so tooltip hit-testing tracks active fingers
 * @param {Object} k - Kaplay instance
 */
export function initTouchInput(k) {
  if (!isTouchDevice() || !k || touchInputInitializedFor === k) return
  touchInputInitializedFor = k
  touchPositions.clear()
  k.canvas && (k.canvas.style.touchAction = 'none')
  k.onTouchStart(onKaplayTouchStart)
  k.onTouchMove(onKaplayTouchMove)
  k.onTouchEnd(onKaplayTouchEnd)
}


/**
 * All active touch positions in game space (empty on non-touch devices)
 * @returns {Array<{ x: number, y: number }>}
 */
function getTouchPositions() {
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
//
// matchMedia is read once and refreshed only when the pointer query changes,
// so per-frame input checks do not re-query the browser.
//
function ensureTouchDeviceWatch() {
  if (coarsePointerQuery) return
  coarsePointerQuery = window.matchMedia('(pointer: coarse)')
  noHoverQuery = window.matchMedia('(hover: none)')
  coarsePointerQuery.addEventListener('change', refreshTouchDevice)
  noHoverQuery.addEventListener('change', refreshTouchDevice)
  refreshTouchDevice()
}
function refreshTouchDevice() {
  const touchCapable = 'ontouchstart' in window && navigator.maxTouchPoints > 0
  touchDeviceCached = touchCapable && (coarsePointerQuery.matches || noHoverQuery.matches)
}
