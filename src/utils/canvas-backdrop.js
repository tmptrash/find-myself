import { parseHex } from './helper.js'

//
// Default page chrome when no scene backdrop is active
//
const DEFAULT_PAGE_BG = '#000000'

/**
 * Syncs Kaplay clear color, canvas CSS, and page chrome to one RGB backdrop.
 * Hides letterbox bars when the viewport aspect ratio differs from the game.
 * Traverses all ancestors of the canvas element so any Kaplay wrapper divs
 * also receive the correct background, preventing visible black strips.
 * @param {Object} k - Kaplay instance
 * @param {string} colorHex - Hex color string (e.g. "#1B1B1B")
 */
export function applyCanvasBackdrop(k, colorHex) {
  const [r, g, b] = parseHex(colorHex)
  const css = `rgb(${r}, ${g}, ${b})`
  k.setBackground(k.rgb(r, g, b))
  //
  // Set background on the canvas itself and every ancestor up to <html>
  // so Kaplay's letterbox wrapper divs (if any) also match
  //
  document.documentElement.style.setProperty('background-color', css, 'important')
  document.body.style.setProperty('background-color', css, 'important')
  let el = k.canvas
  while (el) {
    el.style.setProperty('background-color', css, 'important')
    if (el === document.documentElement) break
    el = el.parentElement
  }
}

/**
 * Updates ONLY the CSS backdrop (not Kaplay's background clear color).
 * Used during animated transitions to gradually match the letterbox bars
 * with the current canvas state without disturbing Kaplay's render loop.
 * @param {HTMLCanvasElement} canvas - The Kaplay canvas element
 * @param {number} r - Red channel 0–255
 * @param {number} g - Green channel 0–255
 * @param {number} b - Blue channel 0–255
 */
export function setCssBackdrop(canvas, r, g, b) {
  const css = `rgb(${r}, ${g}, ${b})`
  document.documentElement.style.setProperty('background-color', css, 'important')
  document.body.style.setProperty('background-color', css, 'important')
  let el = canvas
  while (el) {
    el.style.setProperty('background-color', css, 'important')
    if (el === document.documentElement) break
    el = el.parentElement
  }
}
/**
 * Restores default black page chrome and clears canvas CSS backdrop
 * @param {Object} k - Kaplay instance
 */
export function clearCanvasBackdrop(k) {
  document.documentElement.style.setProperty('background-color', DEFAULT_PAGE_BG, 'important')
  document.body.style.setProperty('background-color', DEFAULT_PAGE_BG, 'important')
  //
  // Remove background from canvas and all its ancestor wrappers
  //
  let el = k.canvas
  while (el) {
    el.style.removeProperty('background-color')
    if (el === document.documentElement) break
    el = el.parentElement
  }
}
