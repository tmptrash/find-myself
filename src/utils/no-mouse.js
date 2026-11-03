import { focusGameCanvas } from './canvas-focus.js'
//
// The game takes no mouse: every mouse event from the browser is stopped on
// the window, before the canvas (Kaplay listens there) or any page element
// sees it, so moving, clicking and scrolling do nothing and no cursor is
// drawn (cursor.css hides the system one). A click only keeps the keyboard
// focus on the game. Touches still work: they come as touch events, which
// Kaplay turns into its own pointer, and the mouse events a browser fires
// right after a touch (taps on the touch HUD buttons) are let through. A
// scene that wants a plain click (any left press) subscribes with
// onMousePress(); the press is still stopped and the cursor stays hidden.
//
const MOUSE_EVENTS = ['mousedown', 'mouseup', 'mousemove', 'click', 'dblclick', 'auxclick', 'contextmenu', 'wheel', 'mouseover', 'mouseout', 'mouseenter', 'mouseleave']
const POINTER_EVENTS = ['pointerdown', 'pointerup', 'pointermove', 'pointerover', 'pointerout', 'pointerenter', 'pointerleave', 'pointercancel']
const TOUCH_EVENTS = ['touchstart', 'touchend']
const MOUSE_POINTER = 'mouse'
const PRESS_EVENT = 'mousedown'
//
// The press the subscribers hear: pointerdown (it is cancelled here, so the
// browser never follows it with a mousedown).
//
const POINTER_PRESS_EVENT = 'pointerdown'
const LEFT_BUTTON = 0
//
// How long after a touch the browser's emulated mouse events still count
// as that touch (ms).
//
const TOUCH_GRACE_MS = 800
const pressListeners = new Set()

/**
 * Stops the mouse for the whole page (call once at boot, before the engine).
 * @returns {Object} Guard instance
 */
export function create() {
  const inst = { lastTouchAt: -Infinity }
  TOUCH_EVENTS.forEach(type => window.addEventListener(type, () => onTouch(inst), { capture: true, passive: true }))
  MOUSE_EVENTS.forEach(type => window.addEventListener(type, e => onMouse(inst, e), { capture: true, passive: false }))
  POINTER_EVENTS.forEach(type => window.addEventListener(type, e => onPointer(inst, e), { capture: true, passive: false }))
  return inst
}
/**
 * Calls fn on every left mouse press (the press itself still goes nowhere
 * else and no cursor shows).
 * @param {Function} fn - Called with no arguments
 * @returns {Function} Stops the calls
 */
export function onMousePress(fn) {
  pressListeners.add(fn)
  return () => pressListeners.delete(fn)
}
function onTouch(inst) {
  inst.lastTouchAt = performance.now()
}
function onPointer(inst, e) {
  e.pointerType === MOUSE_POINTER && onMouse(inst, e)
}
//
// A real mouse event (not one emulated right after a touch) goes no
// further; its default (focus, scroll, context menu) is dropped too, and a
// press puts the keyboard focus back on the game and, if left, reaches the
// onMousePress() subscribers.
//
function onMouse(inst, e) {
  if (performance.now() - inst.lastTouchAt < TOUCH_GRACE_MS) return
  e.stopImmediatePropagation()
  e.cancelable && e.preventDefault()
  if (e.type !== PRESS_EVENT && e.type !== POINTER_PRESS_EVENT) return
  focusGameCanvas()
  e.type === POINTER_PRESS_EVENT && e.button === LEFT_BUTTON && [...pressListeners].forEach(fn => fn())
}
