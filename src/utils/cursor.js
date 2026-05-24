import { isTouchDevice } from './touch-input.js'
//
// SVG markup for cursor shapes (chubby triangle and hand)
//
const ARROW_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="36" viewBox="-4 -4 32 36">'
  + '<path d="M 3,2 Q 1,8 1,14 Q 1,20 3,24 Q 7,22 12,19 Q 16,17 20,13 Q 20,11 16,8 Q 12,5 9,4 Q 6,2 3,2 Z" fill="none" stroke="black" stroke-width="8" stroke-linejoin="round"/>'
  + '<path d="M 3,2 Q 1,8 1,14 Q 1,20 3,24 Q 7,22 12,19 Q 16,17 20,13 Q 20,11 16,8 Q 12,5 9,4 Q 6,2 3,2 Z" fill="white"/>'
  + '</svg>'
const POINTER_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="36" height="40" viewBox="-4 -4 36 40">'
  + '<path d="M 8,20 L 8,12 Q 8,8 11,8 Q 14,8 14,11 L 14,6 Q 14,3 17,3 Q 20,3 20,6 L 20,8 Q 20,5 23,5 Q 26,5 26,8 L 26,16 Q 26,20 24,24 Q 22,28 18,28 L 12,28 Q 8,28 6,24 L 4,20 Q 4,18 6,18 Q 8,18 8,20 Z" fill="none" stroke="black" stroke-width="8" stroke-linejoin="round"/>'
  + '<path d="M 8,20 L 8,12 Q 8,8 11,8 Q 14,8 14,11 L 14,6 Q 14,3 17,3 Q 20,3 20,6 L 20,8 Q 20,5 23,5 Q 26,5 26,8 L 26,16 Q 26,20 24,24 Q 22,28 18,28 L 12,28 Q 8,28 6,24 L 4,20 Q 4,18 6,18 Q 8,18 8,20 Z" fill="white"/>'
  + '<line x1="14" y1="8" x2="14" y2="16" stroke="black" stroke-width="1.5" stroke-linecap="round"/>'
  + '<line x1="20" y1="6" x2="20" y2="16" stroke="black" stroke-width="1.5" stroke-linecap="round"/>'
  + '</svg>'
//
// Hotspot offsets for each cursor type (pixel offset from top-left of SVG)
//
const POINTER_HOTSPOT_X = 8
//
// DOM overlay element and current cursor type
//
let cursorEl = null
let cursorType = 'arrow'

/**
 * Sets the cursor type to 'arrow' (normal) or 'pointer' (hand)
 * @param {string} type - 'arrow' or 'pointer'
 */
export function setCursor(type) {
  if (!cursorEl || cursorType === type) return
  cursorType = type
  cursorEl.innerHTML = type === 'pointer' ? POINTER_SVG : ARROW_SVG
  //
  // Pointer cursor has a hotspot offset (finger tip is not at 0,0)
  //
  cursorEl.style.marginLeft = type === 'pointer' ? `-${POINTER_HOTSPOT_X}px` : '0'
}

/**
 * Initializes the DOM overlay cursor that follows the mouse.
 * A fixed-position HTML element renders the SVG cursor shape,
 * completely replacing the system cursor everywhere on screen.
 * @param {Object} k - Kaplay instance
 */
export function init(k) {
  if (isTouchDevice()) {
    document.body.style.cursor = 'none'
    k.canvas && (k.canvas.style.cursor = 'none')
    return
  }
  cursorEl = document.createElement('div')
  cursorEl.style.position = 'fixed'
  cursorEl.style.pointerEvents = 'none'
  cursorEl.style.zIndex = '99999'
  cursorEl.style.left = '0'
  cursorEl.style.top = '0'
  cursorEl.style.willChange = 'transform'
  cursorEl.innerHTML = ARROW_SVG
  document.body.appendChild(cursorEl)
  //
  // Track mouse position and update cursor element via transform
  //
  document.addEventListener('mousemove', (e) => onMouseMove(e))
  //
  // Hide cursor when mouse leaves the browser window entirely
  //
  document.addEventListener('mouseleave', () => {
    cursorEl.style.display = 'none'
  })
  document.addEventListener('mouseenter', () => {
    cursorEl.style.display = ''
  })
}
//
// Update overlay position using CSS transform for minimal layout thrashing
//
function onMouseMove(e) {
  if (!cursorEl) return
  cursorEl.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`
}
