//
// Bakes the static earth band and the static sprites drawn over it under the
// ground line (tree roots, the bug's burrow, buoy stalks) into
// one sprite, once per live Kaplay instance. Each of those sprites otherwise
// covers its rect of the screen again every frame on top of the band.
//
const MERGED_SPRITE = 'forest-earth-merged'
const RGBA = 4
const ALPHA_MAX = 255
const mergedByK = new WeakMap()

/**
 * Merges the band and the given layers (back to front, in the order the game
 * drew them) into one sprite. The sprite starts at the highest layer top, so
 * rows of a layer tucked above the band's top edge survive. Pixels are read
 * back from the layers' textures, so callers keep their usual bakes. A layer
 * whose texture cannot be read stays out of the merge and keeps being drawn
 * by its owner (see isMerged). Cached per live k: a scene restart reuses it.
 * Owners are marked with markMerged, never per k: other scenes on the same
 * engine (the menu) draw the same sprites on their own.
 * @param {Object} cfg - Merge configuration
 * @param {Object} cfg.k - Kaplay instance
 * @param {string} cfg.band - Earth band sprite name
 * @param {number} cfg.bandY - World Y of the band's top edge (its left edge is world x 0)
 * @param {Array<{sprite: string, x: number, y: number, opacity?: number}>} cfg.layers - Static layers over the band
 * @param {Array<{x1: number, x2: number}>} [cfg.excludeSpans=[]] - World X spans where something live draws between the band and the layers
 * @returns {{sprite: string, y: number, h: number, merged: Set<string>}|null} Merged sprite, its world top and height
 */
export function create(cfg) {
  const { k, band, bandY, layers, excludeSpans = [] } = cfg
  const cached = mergedByK.get(k)
  if (cached) return cached
  const bandCanvas = readSpriteCanvas(k, band)
  if (!bandCanvas) return null
  const parts = layers
    .map(layer => ({ layer, canvas: readSpriteCanvas(k, layer.sprite) }))
    .filter(part => part.canvas && !excludeSpans.some(span => overlapsSpan(part, span)))
  const topY = Math.min(bandY, ...parts.map(part => Math.round(part.layer.y)))
  const canvas = document.createElement('canvas')
  canvas.width = bandCanvas.width
  canvas.height = bandCanvas.height + bandY - topY
  const ctx = canvas.getContext('2d')
  ctx.drawImage(bandCanvas, 0, bandY - topY)
  parts.forEach(part => {
    ctx.globalAlpha = part.layer.opacity ?? 1
    ctx.drawImage(part.canvas, Math.round(part.layer.x), Math.round(part.layer.y) - topY)
  })
  k.loadSprite(MERGED_SPRITE, canvas)
  const inst = {
    sprite: MERGED_SPRITE,
    y: topY,
    h: canvas.height,
    merged: new Set(parts.map(part => part.layer.sprite))
  }
  mergedByK.set(k, inst)
  return inst
}

/**
 * Tells the level's decor owners which of their sprites the merged earth
 * sprite already holds.
 * @param {Array<Object|null>} owners - Component insts whose layers were passed to create
 * @param {{merged: Set<string>}|null} earth - Result of create
 */
export function markMerged(owners, earth) {
  owners.forEach(owner => { owner && (owner.earthMerged = earth?.merged ?? null) })
}

/**
 * Whether the merged earth sprite already holds this owner's sprite (the
 * owner then skips drawing it).
 * @param {Object} owner - Component inst marked by markMerged
 * @param {string} sprite - Sprite name
 * @returns {boolean}
 */
export function isMerged(owner, sprite) {
  return owner.earthMerged?.has(sprite) ?? false
}
//
// Copies one sprite's frame out of its (possibly shared atlas) texture into a
// 2D canvas. Kaplay uploads textures with premultiplied alpha, so colours are
// divided back by alpha for the canvas.
//
function readSpriteCanvas(k, name) {
  const frame = k.getSprite(name)?.data?.frames?.[0]
  const tex = frame?.tex
  if (!tex?.glTex) return null
  const x = Math.round(frame.q.x * tex.width)
  const y = Math.round(frame.q.y * tex.height)
  const w = Math.round(frame.q.w * tex.width)
  const h = Math.round(frame.q.h * tex.height)
  if (!(w > 0 && h > 0)) return null
  const pixels = readTexturePixels(tex.ctx.gl, tex.glTex, x, y, w, h)
  unpremultiply(pixels)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d').putImageData(new ImageData(pixels, w, h), 0, 0)
  return canvas
}
//
// Reads a texture region through a throwaway framebuffer, restoring whatever
// framebuffer Kaplay had bound.
//
function readTexturePixels(gl, glTex, x, y, w, h) {
  const prev = gl.getParameter(gl.FRAMEBUFFER_BINDING)
  const fb = gl.createFramebuffer()
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb)
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, glTex, 0)
  const pixels = new Uint8ClampedArray(w * h * RGBA)
  gl.readPixels(x, y, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
  gl.bindFramebuffer(gl.FRAMEBUFFER, prev)
  gl.deleteFramebuffer(fb)
  return pixels
}
function overlapsSpan(part, span) {
  return part.layer.x < span.x2 && part.layer.x + part.canvas.width > span.x1
}
function unpremultiply(pixels) {
  for (let i = 0; i < pixels.length; i += RGBA) {
    const a = pixels[i + 3]
    if (a === 0 || a === ALPHA_MAX) continue
    const f = ALPHA_MAX / a
    pixels[i] *= f
    pixels[i + 1] *= f
    pixels[i + 2] *= f
  }
}
