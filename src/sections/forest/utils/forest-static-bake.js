import { applyForestFilmGrainToCanvas } from './forest-parallax-grain.js'
//
// Static vector decor (root fans, trunks, cave rocks) baked once into a
// canvas sprite per live Kaplay instance and colour variant — the same
// geometry redrawn as hundreds of immediate drawLine/drawPolygon calls every
// frame was the single largest CPU cost of the forest level.
//
const STATIC_BAKE_PAD = 2
const STATIC_BAKE_SPRITE_PREFIX = 'forest-static-decor'
const spriteSerialByK = new WeakMap()
const holdersByK = new WeakMap()

/**
 * A bake holder for ensureStaticDecorSprite that lives as long as the live
 * Kaplay instance, not as the object drawn: a scene restart (a new buoy,
 * flower or pit object at the same place) finds its bakes ready instead of
 * baking them again mid-game.
 * @param {Object} k - Kaplay instance
 * @param {string} id - Stable id of the drawing's owner (kind and place)
 * @returns {Object} Holder
 */
export function staticBakeHolder(k, id) {
  let holders = holdersByK.get(k)
  if (!holders) {
    holders = new Map()
    holdersByK.set(k, holders)
  }
  let holder = holders.get(id)
  if (!holder) {
    holder = {}
    holders.set(id, holder)
  }
  return holder
}

/**
 * Returns a baked sprite for one static drawing, baking it on first use.
 * Variants are cached on the holder per slot and keyed by the live `k`, so a
 * resolution-swap reboot (fresh sprite registry) rebakes instead of reusing a
 * sprite name the new engine never loaded.
 * @param {Object} k - Kaplay instance
 * @param {Object} holder - Object owning the cache (tree, buoy, pit state)
 * @param {string} slot - Cache slot on the holder (e.g. 'roots', 'trunk')
 * @param {string} key - Variant key (usually the colours used by `paint`)
 * @param {{x1: number, y1: number, x2: number, y2: number}} bounds - World extent of the drawing
 * @param {(ctx: CanvasRenderingContext2D) => void} paint - Paints in world coordinates
 * @param {number} seedOffset - Film-grain seed so neighbouring bakes do not align
 * @returns {{sprite: string, x: number, y: number, w: number, h: number}|null}
 */
export function ensureStaticDecorSprite(k, holder, slot, key, bounds, paint, seedOffset) {
  const caches = holder._staticBakes ?? (holder._staticBakes = {})
  let cache = caches[slot]
  if (!cache || cache.k !== k) {
    cache = { k, variants: {} }
    caches[slot] = cache
  }
  const hit = cache.variants[key]
  if (hit) return hit
  const baked = bakeStaticDecor(k, bounds, paint, seedOffset)
  baked && (cache.variants[key] = baked)
  return baked
}

/**
 * Blits a baked static decor sprite at its world origin.
 * @param {Object} k - Kaplay instance
 * @param {Object|null} baked - Result of ensureStaticDecorSprite
 * @param {number} [opacity=1] - Draw opacity
 */
export function drawStaticDecorSprite(k, baked, opacity = 1) {
  if (!baked) return
  k.drawSprite({
    sprite: baked.sprite,
    pos: k.vec2(baked.x, baked.y),
    ...(opacity < 1 ? { opacity } : {})
  })
}

/**
 * Horizontal camera culling for a world-space extent.
 * @param {number} x1 - Left world X
 * @param {number} x2 - Right world X
 * @param {{x1: number, x2: number}|null} view - Visible world X range (null = always visible)
 * @returns {boolean}
 */
export function isWorldSpanInView(x1, x2, view) {
  return !view || (x2 >= view.x1 && x1 <= view.x2)
}

/**
 * CSS colour string for a {r, g, b} triplet (also accepts Kaplay colours).
 * @param {{r: number, g: number, b: number}} c - Colour
 * @returns {string}
 */
export function cssRgb(c) {
  return `rgb(${c.r},${c.g},${c.b})`
}

/**
 * Stable variant key for a list of colours.
 * @param {...{r: number, g: number, b: number}} colors - Colours used by a bake
 * @returns {string}
 */
export function colorKey(...colors) {
  return colors.map(c => `${c.r},${c.g},${c.b}`).join('|')
}
function bakeStaticDecor(k, bounds, paint, seedOffset) {
  const x = Math.floor(bounds.x1) - STATIC_BAKE_PAD
  const y = Math.floor(bounds.y1) - STATIC_BAKE_PAD
  const w = Math.ceil(bounds.x2) + STATIC_BAKE_PAD - x
  const h = Math.ceil(bounds.y2) + STATIC_BAKE_PAD - y
  if (!(w > 0 && h > 0)) return null
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.translate(-x, -y)
  paint(ctx)
  applyForestFilmGrainToCanvas(canvas, seedOffset)
  const serial = (spriteSerialByK.get(k) ?? 0) + 1
  spriteSerialByK.set(k, serial)
  const sprite = `${STATIC_BAKE_SPRITE_PREFIX}-${serial}`
  k.loadSprite(sprite, canvas)
  canvas.width = 0
  canvas.height = 0
  return { sprite, x, y, w, h }
}
