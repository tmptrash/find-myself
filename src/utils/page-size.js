//
// Page height that really covers the screen. An iPhone home-screen app
// (standalone, black-translucent status bar, viewport-fit=cover) lays the
// page out from the very top of the screen, under the status bar, yet its
// 100% / innerHeight leave the status bar's height out — so a canvas sized
// from <body> stops that far above the bottom edge and a strip of page
// colour shows under it. There the page is stretched to the screen's full
// height in its current orientation; everywhere else it is left alone.
//

/**
 * Stretches <html> and <body> to the full screen height where the browser
 * reports it short (call before an engine boots, and on every resize).
 */
export function fitPageHeight() {
  const h = pageHeight()
  const value = h > window.innerHeight ? `${h}px` : ''
  document.documentElement.style.height = value
  document.body.style.height = value
}

/**
 * Height the page (and the canvas in it) covers, in CSS px.
 * @returns {number}
 */
export function pageHeight() {
  if (!navigator.standalone) return window.innerHeight
  const upright = window.innerHeight > window.innerWidth
  const full = upright ? Math.max(screen.width, screen.height) : Math.min(screen.width, screen.height)
  return Math.max(window.innerHeight, full)
}
