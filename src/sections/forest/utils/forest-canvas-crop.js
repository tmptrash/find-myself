//
// Crops baked glow canvases down to the pixels they actually paint.
//
// Several glow bakes are drawn in WORLD space: the painter needs world
// coordinates, so the canvas is created at the full world size (3000x1080)
// even though the artwork covers a fraction of it. Uploading that as a
// sprite makes every frame blit a mostly transparent world-sized quad and
// alpha-blend it across the whole viewport. Cropping to the content bounds
// and drawing the sprite at the crop offset keeps the exact same pixels on
// screen while shrinking the quad — and lets the GPU reject the sprite
// outright once the camera scrolls away from it.
//
// Pixels this faint are blur/anti-alias fringe, not artwork.
//
const CONTENT_ALPHA_MIN = 4

/**
 * Measures the bounding box of the non-transparent pixels on a canvas
 * @param {HTMLCanvasElement} canvas - Baked canvas to scan
 * @param {number} [pad=0] - Extra margin kept around the content, in px
 * @returns {Object|null} { x, y, w, h } in canvas space, or null if blank
 */
export function measureCanvasContentBounds(canvas, pad = 0) {
  const w = canvas?.width | 0
  const h = canvas?.height | 0
  if (!w || !h) return null
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  const px = ctx.getImageData(0, 0, w, h).data
  let minX = w
  let minY = h
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < h; y++) {
    const rowStart = y * w * 4
    for (let x = 0; x < w; x++) {
      if (px[rowStart + x * 4 + 3] < CONTENT_ALPHA_MIN) continue
      x < minX && (minX = x)
      x > maxX && (maxX = x)
      y < minY && (minY = y)
      y > maxY && (maxY = y)
    }
  }
  if (maxX < 0) return null
  const x1 = Math.max(0, minX - pad)
  const y1 = Math.max(0, minY - pad)
  const x2 = Math.min(w - 1, maxX + pad)
  const y2 = Math.min(h - 1, maxY + pad)
  return { x: x1, y: y1, w: x2 - x1 + 1, h: y2 - y1 + 1 }
}

/**
 * Copies one region of a canvas into a new, smaller canvas
 * @param {HTMLCanvasElement} canvas - Source canvas
 * @param {Object} bounds - Region from measureCanvasContentBounds()
 * @returns {HTMLCanvasElement} Cropped canvas (the source is left untouched)
 */
export function cropCanvasToBounds(canvas, bounds) {
  const out = document.createElement('canvas')
  out.width = bounds.w
  out.height = bounds.h
  const ctx = out.getContext('2d')
  ctx.drawImage(canvas, bounds.x, bounds.y, bounds.w, bounds.h, 0, 0, bounds.w, bounds.h)
  return out
}

/**
 * Releases a scratch canvas's backing store once its pixels were consumed
 * @param {HTMLCanvasElement} canvas - Canvas to drop
 */
export function releaseCanvas(canvas) {
  if (!canvas) return
  canvas.width = 0
  canvas.height = 0
}
