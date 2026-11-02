//
// Shared helpers for forest art cut from picture sheets: loading a sheet,
// wiping the stray backdrop fringe some sheets carry round their shapes
// (bright, saturated, nearly transparent pixels), cutting one rect out at
// a scale and wiping a rect out of such a cut.
//
// A fringe pixel is less opaque than FRINGE_ALPHA and its channels spread
// further than FRINGE_SATURATION (the shapes' own soft edges stay).
//
const FRINGE_ALPHA = 100
const FRINGE_SATURATION = 120

/**
 * Loads a picture.
 * @param {string} url - Picture URL
 * @returns {Promise<HTMLImageElement|null>} The image (null if it fails to load)
 */
export function loadPictureImage(url) {
  const img = new Image()
  img.src = url
  return img.decode().then(() => img, () => null)
}

/**
 * How much of a sheet pixel to keep (0..1): its own alpha, none for a
 * fringe pixel.
 * @param {Uint8ClampedArray} data - RGBA pixels
 * @param {number} i - Index of the pixel's red byte
 * @returns {number}
 */
export function pictureFringeAlpha(data, i) {
  const a = data[i + 3]
  const spread = Math.max(data[i], data[i + 1], data[i + 2]) - Math.min(data[i], data[i + 1], data[i + 2])
  return a < FRINGE_ALPHA && spread > FRINGE_SATURATION ? 0 : a / 255
}

/**
 * Copy of a picture without its backdrop fringe (one pixel read of the
 * loaded image, never of a drawn GPU canvas).
 * @param {HTMLImageElement} img - Loaded picture
 * @returns {HTMLCanvasElement}
 */
export function wipePictureFringe(img) {
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(img, 0, 0)
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const px = data.data
  for (let i = 0; i < px.length; i += 4) px[i + 3] = Math.round(pictureFringeAlpha(px, i) * 255)
  ctx.putImageData(data, 0, 0)
  return canvas
}

/**
 * One rect of a picture on its own canvas at a scale.
 * @param {CanvasImageSource} src - Picture
 * @param {{x: number, y: number, w: number, h: number}} rect - Rect on the picture (px)
 * @param {number} scale - Canvas px per picture px
 * @returns {HTMLCanvasElement}
 */
export function cutPicture(src, rect, scale) {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.ceil(rect.w * scale))
  canvas.height = Math.max(1, Math.ceil(rect.h * scale))
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(src, rect.x, rect.y, rect.w, rect.h, 0, 0, canvas.width, canvas.height)
  return canvas
}

/**
 * Wipes a rect of the picture out of a canvas cut from it, rounded out to
 * whole pixels so no partly covered column or row of it is left.
 * @param {HTMLCanvasElement} canvas - Canvas holding a rect of the picture
 * @param {{x: number, y: number}} rect - That rect's top-left on the picture (px)
 * @param {{x: number, y: number, w: number, h: number}} clear - Rect to wipe on the picture (px)
 * @param {number} scale - Canvas px per picture px
 */
export function clearPictureRect(canvas, rect, clear, scale) {
  const x1 = Math.floor((clear.x - rect.x) * scale)
  const y1 = Math.floor((clear.y - rect.y) * scale)
  const x2 = Math.ceil((clear.x + clear.w - rect.x) * scale)
  const y2 = Math.ceil((clear.y + clear.h - rect.y) * scale)
  canvas.getContext('2d').clearRect(x1, y1, x2 - x1, y2 - y1)
}
