import { loadPictureImage } from './forest-picture.js'
import { applyForestGameplaySharpBake } from './forest-focus-depth.js'
//
// The trampoline mushrooms' pictures: the two top-left mushrooms of
// assets/forest/big_mushrooms.png — a red spotted one with a little painted
// face (the trampolines on the ground) and an orange spotted one (the
// trampoline in the cave). Baked once per live k at the trampolines' cap height; the
// level squashes the sprite as the hero lands. The sheet starts loading
// with this module (game boot).
//
// The sheet may come without transparency (a light grey/white checker
// painted in its background), so every mushroom is cut from its box and
// keyed: the light, colourless pixels reachable from the box's border are
// background (the mushroom's dark contour stops the fill).
//
const URL = 'forest/big_mushrooms.png'
const SPRITE_PREFIX = 'forest0-tramp-mushroom-v2'
const GRAIN_SEED = 7180
//
// Each mushroom: its box on the sheet, the row of its stem's foot and the
// top row of its cap (sheet px).
//
export const TRAMP_MUSHROOM = { RED: 0, ORANGE: 1 }
const MUSHROOMS = [
  { x: 63, y: 114, w: 177, h: 163, baseY: 274, capTopY: 117 },
  { x: 305, y: 129, w: 151, h: 139, baseY: 265, capTopY: 132 }
]
//
// Background key: a pixel this light whose channels differ by less than
// KEY_GREY is checker; seen through alpha it is background too.
//
const KEY_LIGHT = 190
const KEY_GREY = 14
const KEY_ALPHA = 8
const RGBA = 4
const sheet = loadPictureImage(URL)
let cuts = null

/**
 * Waits for the big mushroom sheet and cuts both trampoline mushrooms out
 * of it with their background keyed out (once per page).
 * @returns {Promise<void>}
 */
export async function load() {
  if (cuts) return
  const img = await sheet
  cuts ??= img && MUSHROOMS.map(box => cutKeyed(img, box))
}

/**
 * How high the top of a mushroom's cap stands over its stem's foot at a
 * width.
 * @param {number} kind - One of TRAMP_MUSHROOM
 * @param {number} width - Picture width in world px
 * @returns {number}
 */
export function capHeight(kind, width) {
  const box = MUSHROOMS[kind]
  return (box.baseY - box.capTopY) / box.w * width
}

/**
 * The width at which a mushroom's cap stands a given height over its foot.
 * @param {number} kind - One of TRAMP_MUSHROOM
 * @param {number} height - Cap height in world px
 * @returns {number}
 */
export function widthForCapHeight(kind, height) {
  return height / capHeight(kind, 1)
}

/**
 * A trampoline mushroom's sprite at a width (baked once per live k, kind and
 * width; null until load() has resolved). Its bottom row is the stem's foot.
 * @param {Object} k - Kaplay instance
 * @param {number} kind - One of TRAMP_MUSHROOM
 * @param {number} width - Sprite width in world px
 * @returns {string|null} Sprite name
 */
export function bake(k, kind, width) {
  if (!cuts) return null
  const w = Math.round(width)
  const name = `${SPRITE_PREFIX}-${kind}-${w}`
  if (k.getSprite(name)) return name
  const box = MUSHROOMS[kind]
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = Math.round((box.baseY - box.y) / box.w * w)
  paint(canvas.getContext('2d'), kind, w / 2, canvas.height, w)
  applyForestGameplaySharpBake(canvas, GRAIN_SEED + kind)
  k.loadSprite(name, canvas)
  canvas.width = 0
  canvas.height = 0
  return name
}

/**
 * Paints a trampoline mushroom with its stem's foot at (cx, baseY) (the
 * menu backdrop bakes it into its scene). Nothing until load() has resolved.
 * @param {CanvasRenderingContext2D} ctx - Target context
 * @param {number} kind - One of TRAMP_MUSHROOM
 * @param {number} cx - Centre X
 * @param {number} baseY - Y of the stem's foot
 * @param {number} width - Width of the picture
 */
export function paint(ctx, kind, cx, baseY, width) {
  if (!cuts) return
  const box = MUSHROOMS[kind]
  const scale = width / box.w
  ctx.save()
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(cuts[kind], cx - width / 2, baseY - (box.baseY - box.y) * scale, width, box.h * scale)
  ctx.restore()
}
//
// One mushroom's box with its background keyed out.
//
function cutKeyed(img, box) {
  const canvas = document.createElement('canvas')
  canvas.width = box.w
  canvas.height = box.h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(img, box.x, box.y, box.w, box.h, 0, 0, box.w, box.h)
  const image = ctx.getImageData(0, 0, box.w, box.h)
  clearBackground(image.data, box.w, box.h)
  ctx.putImageData(image, 0, 0)
  return canvas
}
//
// Flood fill from the border over background pixels, clearing them.
//
function clearBackground(px, w, h) {
  const fill = { px, seen: new Uint8Array(w * h), stack: [] }
  for (let x = 0; x < w; x++) {
    pushBackground(fill, x)
    pushBackground(fill, (h - 1) * w + x)
  }
  for (let y = 0; y < h; y++) {
    pushBackground(fill, y * w)
    pushBackground(fill, y * w + w - 1)
  }
  while (fill.stack.length) {
    const i = fill.stack.pop()
    px[i * RGBA + 3] = 0
    const x = i % w
    x > 0 && pushBackground(fill, i - 1)
    x < w - 1 && pushBackground(fill, i + 1)
    i >= w && pushBackground(fill, i - w)
    i < w * (h - 1) && pushBackground(fill, i + w)
  }
}
function pushBackground(fill, i) {
  if (fill.seen[i] || !isBackground(fill.px, i * RGBA)) return
  fill.seen[i] = 1
  fill.stack.push(i)
}
function isBackground(px, o) {
  if (px[o + 3] < KEY_ALPHA) return true
  const hi = Math.max(px[o], px[o + 1], px[o + 2])
  const lo = Math.min(px[o], px[o + 1], px[o + 2])
  return hi > KEY_LIGHT && hi - lo < KEY_GREY
}
