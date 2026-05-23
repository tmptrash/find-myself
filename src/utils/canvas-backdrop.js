import { parseHex } from './helper.js'

//
// Default page chrome when no scene backdrop is active
//
const DEFAULT_PAGE_BG = '#000000'

/**
 * Syncs Kaplay clear color, canvas CSS, and page chrome to one RGB backdrop.
 * Hides letterbox bars when the viewport aspect ratio differs from the game.
 * @param {Object} k - Kaplay instance
 * @param {string} colorHex - Hex color string (e.g. "#1B1B1B")
 */
export function applyCanvasBackdrop(k, colorHex) {
  const [r, g, b] = parseHex(colorHex)
  const css = `rgb(${r}, ${g}, ${b})`
  k.setBackground(k.rgb(r, g, b))
  k.canvas?.style.setProperty('background-color', css, 'important')
  document.documentElement.style.setProperty('background-color', css, 'important')
  document.body.style.setProperty('background-color', css, 'important')
}

/**
 * Restores default black page chrome and clears canvas CSS backdrop
 * @param {Object} k - Kaplay instance
 */
export function clearCanvasBackdrop(k) {
  k.canvas?.style.removeProperty('background-color')
  document.documentElement.style.setProperty('background-color', DEFAULT_PAGE_BG, 'important')
  document.body.style.setProperty('background-color', DEFAULT_PAGE_BG, 'important')
}
