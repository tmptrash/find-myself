//
// Shared touch-device detection for controls and touch wording
//

let touchDeviceCached = null
let coarsePointerQuery = null
let noHoverQuery = null
//
// Tracks which Kaplay instance the canvas setup ran on — an engine swap (see
// engine-switch.js) boots a brand new k with a new canvas.
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
 * Stops the browser from panning or zooming the canvas under a finger, so
 * every touch reaches the game's controls
 * @param {Object} k - Kaplay instance
 */
export function initTouchInput(k) {
  if (!isTouchDevice() || !k || touchInputInitializedFor === k) return
  touchInputInitializedFor = k
  k.canvas && (k.canvas.style.touchAction = 'none')
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
