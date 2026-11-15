//
// Page size that really covers the screen. An iPhone home-screen app
// (standalone, black-translucent status bar, viewport-fit=cover) lays the
// page out from the screen's very edge, under the status bar (or beside
// the notch), yet its 100% / innerHeight / innerWidth may leave those
// insets out — so a canvas sized from <body> stops short and a strip of
// page colour shows past it. There the page is stretched to the screen's
// full size in its current orientation; everywhere else it is left alone.
//

/**
 * Stretches <html> and <body> to the full screen size where the browser
 * reports it short (call before an engine boots, and on every resize).
 */
export function fitPageSize() {
  const h = pageHeight()
  const w = pageWidth()
  const height = h > window.innerHeight ? `${h}px` : ''
  const width = w > window.innerWidth ? `${w}px` : ''
  document.documentElement.style.height = height
  document.body.style.height = height
  document.documentElement.style.width = width
  document.body.style.width = width
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

/**
 * Width the page (and the canvas in it) covers, in CSS px.
 * @returns {number}
 */
export function pageWidth() {
  if (!navigator.standalone) return window.innerWidth
  const upright = window.innerHeight > window.innerWidth
  const full = upright ? Math.min(screen.width, screen.height) : Math.max(screen.width, screen.height)
  return Math.max(window.innerWidth, full)
}
