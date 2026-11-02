//
// Shared helpers for forest art cut from picture sheets: loading a sheet,
// wiping the stray backdrop fringe some sheets carry round their shapes
// (bright, saturated, nearly transparent pixels), cutting one rect out at
// a scale, wiping a rect out of such a cut and cutting a sheet's shapes
// apart.
//
// A fringe pixel is less opaque than FRINGE_ALPHA and its channels spread
// further than FRINGE_SATURATION (the shapes' own soft edges stay).
//
const FRINGE_ALPHA = 100
const FRINGE_SATURATION = 120
//
// A sheet pixel is part of a shape's solid body from this share of opacity.
//
const PIECE_SOLID_SHARE = 0.5

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

/**
 * Cuts the shapes of a sheet out onto their own canvases: every connected
 * piece of solid pixels (backdrop fringe wiped) goes to the rect holding the
 * centre of its bounding box, with the soft pixels on its rim, so a rect
 * that overlaps a neighbour's never takes a piece of it (one pixel read of
 * the loaded image, never of a drawn GPU canvas).
 * @param {HTMLImageElement} img - Loaded sheet
 * @param {Array<{x: number, y: number, w: number, h: number}>} rects - Shape rects on the sheet (px)
 * @returns {Array<HTMLCanvasElement>} One canvas per rect, rect-sized
 */
export function cutSheetPieces(img, rects) {
  const w = img.naturalWidth
  const h = img.naturalHeight
  const sheet = document.createElement('canvas')
  sheet.width = w
  sheet.height = h
  const ctx = sheet.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(img, 0, 0)
  const px = ctx.getImageData(0, 0, w, h).data
  const alpha = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) alpha[i] = pictureFringeAlpha(px, i * 4)
  const owner = pieceOwners(alpha, w, h, rects)
  sheet.width = 0
  sheet.height = 0
  return rects.map((rect, r) => {
    const canvas = document.createElement('canvas')
    canvas.width = rect.w
    canvas.height = rect.h
    const out = canvas.getContext('2d')
    const image = out.createImageData(rect.w, rect.h)
    for (let y = 0; y < rect.h; y++) {
      for (let x = 0; x < rect.w; x++) {
        const i = (rect.y + y) * w + rect.x + x
        if (owner[i] !== r) continue
        const o = (y * rect.w + x) * 4
        image.data[o] = px[i * 4]
        image.data[o + 1] = px[i * 4 + 1]
        image.data[o + 2] = px[i * 4 + 2]
        image.data[o + 3] = Math.round(alpha[i] * 255)
      }
    }
    out.putImageData(image, 0, 0)
    return canvas
  })
}
//
// Owning rect of every sheet pixel (-1: none): solid pixels grouped into
// 4-connected pieces, each piece given to the rect holding its bounding
// box's centre; soft pixels take the owner of a solid 8-neighbour.
//
function pieceOwners(alpha, w, h, rects) {
  const label = new Int32Array(w * h).fill(-1)
  const pieceOwner = []
  const stack = []
  for (let start = 0; start < w * h; start++) {
    if (label[start] >= 0 || alpha[start] < PIECE_SOLID_SHARE) continue
    const id = pieceOwner.length
    let x1 = w
    let y1 = h
    let x2 = 0
    let y2 = 0
    label[start] = id
    stack.push(start)
    while (stack.length) {
      const i = stack.pop()
      const x = i % w
      const y = (i - x) / w
      x < x1 && (x1 = x)
      x > x2 && (x2 = x)
      y < y1 && (y1 = y)
      y > y2 && (y2 = y)
      const next = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]
      next.forEach(n => {
        if (n < 0 || label[n] >= 0 || alpha[n] < PIECE_SOLID_SHARE) return
        label[n] = id
        stack.push(n)
      })
    }
    const cx = (x1 + x2) / 2
    const cy = (y1 + y2) / 2
    pieceOwner.push(rects.findIndex(r => cx >= r.x && cx < r.x + r.w && cy >= r.y && cy < r.y + r.h))
  }
  const owner = new Int32Array(w * h).fill(-1)
  for (let i = 0; i < w * h; i++) label[i] >= 0 && (owner[i] = pieceOwner[label[i]])
  for (let i = 0; i < w * h; i++) {
    if (owner[i] >= 0 || alpha[i] <= 0) continue
    const x = i % w
    const y = (i - x) / w
    for (let dy = -1; dy <= 1 && owner[i] < 0; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx
        const ny = y + dy
        if (nx < 0 || ny < 0 || nx >= w || ny >= h || label[ny * w + nx] < 0) continue
        owner[i] = pieceOwner[label[ny * w + nx]]
        break
      }
    }
  }
  return owner
}
