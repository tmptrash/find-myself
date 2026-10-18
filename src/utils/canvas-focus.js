//
// Kaplay listens for keys on its canvas only, so while focus sits anywhere
// else (body after the loader, the fullscreen button, an unfocused Electron
// window) the keyboard is dead until the player clicks the game. Every scene
// entry, loader hide and window refocus puts the focus back on the canvas.
//
// A few retries on the following frames cover a canvas that is still hidden
// under the loader or not yet laid out when the focus is first requested.
//
const FOCUS_RETRY_FRAMES = 3
//
// A key that still lands outside the canvas (focus refused while it was
// hidden) is replayed on the canvas without bubbling, so window-level key
// listeners do not see it twice.
//
const FORWARDED_KEY_EVENTS = ['keydown', 'keyup']
const EDITABLE_TAGS = ['INPUT', 'TEXTAREA', 'SELECT']
//
// The live engine canvas (one Kaplay instance at a time, see game-engine.js).
//
let liveCanvas = null
let windowFocusInstalled = false

/**
 * Registers the canvas of the engine that just booted (null on teardown).
 * @param {HTMLCanvasElement|null} canvas - Kaplay canvas
 */
export function setFocusCanvas(canvas) {
  liveCanvas = canvas
  canvas && canvas.tabIndex < 0 && (canvas.tabIndex = 0)
  installWindowFocus()
}

/**
 * Moves keyboard focus onto the live game canvas (now and on the next few frames).
 */
export function focusGameCanvas() {
  focusOnFrames(FOCUS_RETRY_FRAMES)
}

function focusOnFrames(framesLeft) {
  const canvas = liveCanvas
  if (!canvas?.isConnected) return
  try {
    document.activeElement !== canvas && canvas.focus({ preventScroll: true })
  } catch (_) {
    //
    // Some browsers refuse focus on a canvas that is still hidden; the retry
    // on the next frame picks it up.
    //
  }
  framesLeft > 0 && requestAnimationFrame(() => focusOnFrames(framesLeft - 1))
}

//
// Coming back to the window (alt-tab, Electron activate) restores the focus too.
//
function installWindowFocus() {
  if (windowFocusInstalled) return
  windowFocusInstalled = true
  window.addEventListener('focus', focusGameCanvas)
  FORWARDED_KEY_EVENTS.forEach(type => window.addEventListener(type, forwardKeyToCanvas))
}

function forwardKeyToCanvas(e) {
  const canvas = liveCanvas
  if (!canvas?.isConnected || e.target === canvas || isEditableTarget(e.target)) return
  canvas.dispatchEvent(new KeyboardEvent(e.type, {
    key: e.key,
    code: e.code,
    location: e.location,
    repeat: e.repeat,
    ctrlKey: e.ctrlKey,
    shiftKey: e.shiftKey,
    altKey: e.altKey,
    metaKey: e.metaKey,
    modifierCapsLock: e.getModifierState?.('CapsLock') ?? false,
    bubbles: false,
    cancelable: true
  }))
  e.type === 'keydown' && focusGameCanvas()
}

function isEditableTarget(target) {
  return Boolean(target?.isContentEditable || EDITABLE_TAGS.includes(target?.tagName))
}
