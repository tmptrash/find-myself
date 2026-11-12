import { loadPictureImage } from './forest-picture.js'
//
// The things that lie in the soil layers (bones, skulls, fossils, shells,
// seeds, nuggets, rocks), cut apart from assets/forest/elements_ground.png:
// a sheet on a transparent backdrop where every thing stands free of the
// others. The sheet starts loading with this module and is cut once per page,
// each piece onto its own canvas. A pixel belongs to a piece when its
// opacity is at least SOLID_ALPHA (the faint shadow haze round the things
// is left out, so it can never join two neighbours or come along as
// backdrop); the pieces are the 8-connected groups of such pixels.
//
const URL = 'forest/elements_ground.png'
const SOLID_ALPHA = 64
const MIN_AREA = 30
const RGBA = 4
const ALPHA_OFFSET = 3
const sheet = loadPictureImage(URL)
let pieces = null

/**
 * Cuts the elements out of the sheet (once per page; waits for it to load).
 * @returns {Promise<Array<HTMLCanvasElement>>} The pieces, top to bottom of the sheet (empty if the sheet failed to load)
 */
export async function loadForestGroundElements() {
  if (pieces) return pieces
  const img = await sheet
  pieces = img ? cutElements(img) : []
  return pieces
}

/**
 * The elements buried in the soil, cut at sheet size; empty until
 * loadForestGroundElements() has resolved.
 * @returns {Array<HTMLCanvasElement>}
 */
export function forestBuriedElements() {
  return pieces ?? []
}
//
// Reads the sheet once, keys out the paper and cuts every piece.
//
function cutElements(img) {
  const w = img.naturalWidth
  const h = img.naturalHeight
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(img, 0, 0)
  const data = ctx.getImageData(0, 0, w, h).data
  const solid = solidMask(data, w, h)
  return labelPieces(solid, w, h)
    .filter(piece => piece.size >= MIN_AREA)
    .map(piece => paintPiece(piece, data, w))
}
//
// 1 where a pixel belongs to a piece: opaque enough.
//
function solidMask(data, w, h) {
  const solid = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) solid[i] = data[i * RGBA + ALPHA_OFFSET] >= SOLID_ALPHA ? 1 : 0
  return solid
}
//
// The 8-connected groups of solid pixels: each with its pixel indices and
// bounding box, in reading order of their first pixel.
//
function labelPieces(solid, w, h) {
  const seen = new Uint8Array(w * h)
  const out = []
  for (let start = 0; start < w * h; start++) {
    if (!solid[start] || seen[start]) continue
    const piece = { size: 0, idx: [], x1: w, y1: h, x2: 0, y2: 0 }
    const stack = [start]
    seen[start] = 1
    while (stack.length) {
      const i = stack.pop()
      const x = i % w
      const y = (i - x) / w
      piece.idx.push(i)
      piece.size++
      piece.x1 = Math.min(piece.x1, x)
      piece.x2 = Math.max(piece.x2, x)
      piece.y1 = Math.min(piece.y1, y)
      piece.y2 = Math.max(piece.y2, y)
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
          const n = ny * w + nx
          if (!solid[n] || seen[n]) continue
          seen[n] = 1
          stack.push(n)
        }
      }
    }
    out.push(piece)
  }
  return out
}
//
// One piece on its own canvas: only its own pixels, with their own opacity.
//
function paintPiece(piece, data, w) {
  const pw = piece.x2 - piece.x1 + 1
  const ph = piece.y2 - piece.y1 + 1
  const canvas = document.createElement('canvas')
  canvas.width = pw
  canvas.height = ph
  const ctx = canvas.getContext('2d')
  const out = ctx.createImageData(pw, ph)
  for (const i of piece.idx) {
    const x = i % w
    const y = (i - x) / w
    const o = ((y - piece.y1) * pw + x - piece.x1) * RGBA
    const p = i * RGBA
    out.data[o] = data[p]
    out.data[o + 1] = data[p + 1]
    out.data[o + 2] = data[p + 2]
    out.data[o + ALPHA_OFFSET] = data[p + ALPHA_OFFSET]
  }
  ctx.putImageData(out, 0, 0)
  return canvas
}
