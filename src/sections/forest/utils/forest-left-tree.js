import { FOREST_LAYER_GRADE, applyForestLayerGradeToCanvas } from './forest-parallax-grain.js'
import { forestFilmGrainBlockPxForTier } from './forest-pixel-density.js'
import { bakeForestFootPlants } from './forest-foot-plants.js'
import { clearPictureRect } from './forest-picture.js'
import { FOREST_PAL, forestRgb } from './forest-palette.js'

//
// The left big tree of forest level 0, cut from assets/forest/left-tree.png
// (scaled): the tree above ground (a bare crown, the trunk) stands on the
// ground line, its roots go under it into the earth. The loose apple on the
// right of the picture is the one apples growing in the crown are drawn
// from (also a green copy of it for young ones); the hero knocks them loose
// from the start branch (the long low left branch). The picture starts
// loading with this module (game boot); bakes are once per live k.
//
const URL = 'forest/left-tree.png'
const SCALE = 0.47
const SPRITE_PREFIX = 'forest0-left-tree-v6'
const GRAIN_SEED = 6002
//
// Parts of the picture (px): the tree above ground (TRUNK_X: its trunk's
// middle at the bottom), the roots, the loose apple and its round body.
//
const CROWN = { x: 0, y: 0, w: 1048, h: 1019 }
const TRUNK_X = 594.5
const ROOTS = { x: 0, y: 1061, w: 992, h: 369 }
const ROOTS_X = 595.5
const APPLE = { x: 828, y: 750, w: 116, h: 136 }
const APPLE_BODY = { x: 877, y: 837, r: 45 }
//
// The loose apple sits beside the trunk inside the crown's part of the
// picture; this corner (right of the trunk, under the foliage) holds
// nothing else, so it is wiped out of the crown with the apple's faint halo.
//
const CROWN_CLEAR = { x: 680, y: 680, w: 368, h: 339 }
//
// The loose apple is drawn large on the picture; it is shrunk by this much
// so it hangs in the crown at the size of a real apple on such a tree.
//
const APPLE_SIZE = 0.37
//
// The young apple's copy: the picture's red (how far red stands above green
// and blue, in RED_SPAN steps it turns fully green) is redrawn in greens by
// its brightness (the red channel from RED_DARK to RED_LIGHT runs from the
// green shade over the body to the lit green); leaf and stem stay as they are.
//
const UNRIPE_RED_FROM = 20
const UNRIPE_RED_SPAN = 60
const UNRIPE_RED_DARK = 120
const UNRIPE_RED_LIGHT = 225
//
// The trunk's bottom and the roots' top overlap the ground line by this
// much (world px), so no seam shows between them.
//
const GROUND_TUCK = 2
//
// Plants hiding the seam where the trunk meets its roots: ferns, grass tufts
// and mushrooms standing on the ground line around the trunk's foot (x from
// the foot in world px, fern size), back to front; baked once per live k
// into one sprite drawn in front of the tree.
//
const FOOT_FERNS = [
  { x: -70, size: 46 }, { x: 66, size: 50 }, { x: -40, size: 40 }, { x: 38, size: 44 },
  { x: -12, size: 34 }, { x: 16, size: 36 }
]
const FOOT_TUFT_FROM = -84
const FOOT_TUFT_TO = 84
const FOOT_TUFT_STEP = 9
const FOOT_MUSHROOMS = [-52, 54]
const FOOT_SPOTTED = [-24, 26]
const FOOT_BAKE_HALF_W = 120
const FOOT_BAKE_ABOVE = 70
const FOOT_BAKE_BELOW = 12
const FOOT_SEED = 6040
//
// The start branch's walkable top on the picture: its flat stretch from
// where it leaves the leafy tip on into the trunk, up to the trunk's middle.
//
const BRANCH = { x1: 284, x2: 590, y: 673 }
//
// The branch's platform sits this much lower (world px) than its top on the
// picture, so the hero's feet rest in the bark, not on its lit edge.
//
const BRANCH_DROP = 2
//
// Where apples grow on the picture (their bodies' centres), in the order
// they come: under the foliage in the lower right of the crown, over the
// strip of ground a knocked apple drops onto.
//
const APPLE_HANGS = [
  { x: 814, y: 530 }, { x: 760, y: 470 }, { x: 870, y: 470 }, { x: 845, y: 395 }, { x: 790, y: 410 }
]
const image = loadImage(URL)
const bakedByK = new WeakMap()
const appleByK = new WeakMap()
let picture = null

/**
 * Waits for the tree picture (once per page), for drawLeftTreeToCanvas().
 * @returns {Promise<void>}
 */
export async function loadForestLeftTreePicture() {
  picture ??= await image
}

/**
 * Paints the tree (roots, then the crown over them) into a canvas, its
 * trunk's foot at a point, at the level's size times a scale (the menu
 * backdrop). Paints nothing until loadForestLeftTreePicture() has resolved.
 * @param {CanvasRenderingContext2D} ctx - Target context
 * @param {{x: number, y: number}} foot - Where the trunk meets the ground
 * @param {number} scale - Size relative to the level's tree
 */
export function drawLeftTreeToCanvas(ctx, foot, scale) {
  if (!picture) return
  const s = SCALE * scale
  const crown = document.createElement('canvas')
  crown.width = Math.ceil(CROWN.w * s)
  crown.height = Math.ceil(CROWN.h * s)
  const crownCtx = crown.getContext('2d')
  crownCtx.imageSmoothingQuality = 'high'
  crownCtx.drawImage(picture, CROWN.x, CROWN.y, CROWN.w, CROWN.h, 0, 0, crown.width, crown.height)
  clearPictureRect(crown, CROWN, CROWN_CLEAR, s)
  ctx.save()
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(picture, ROOTS.x, ROOTS.y, ROOTS.w, ROOTS.h, foot.x - (ROOTS_X - ROOTS.x) * s, foot.y - GROUND_TUCK * scale, ROOTS.w * s, ROOTS.h * s)
  ctx.drawImage(crown, foot.x - (TRUNK_X - CROWN.x) * s, foot.y - CROWN.h * s + GROUND_TUCK * scale)
  ctx.restore()
  crown.width = 0
  crown.height = 0
}

/**
 * Bakes the tree's parts once per live k (waits for the picture to load).
 * @param {Object} k - Kaplay instance
 * @param {{x: number, y: number}} foot - World point where the trunk meets the ground
 * @param {Array<{x1: number, x2: number}>} [clear] - World ground spans the foot plants leave bare
 * @returns {Promise<{crown: Object, roots: Object, plants: Object, apple: Object}|null>} Each
 *   part's sprite and world top-left (plants: the greens over the trunk's foot); the apple's
 *   sprite, its young green copy's sprite, its canvas, size and offset of its top-left from
 *   its body's centre (null if the picture failed to load)
 */
export async function bakeLeftTree(k, foot, clear = null) {
  const cached = bakedByK.get(k)
  if (cached) return cached
  const img = await image
  if (!img) return null
  const crown = bakePart(k, img, CROWN, 'crown', CROWN_CLEAR).name
  const roots = bakePart(k, img, ROOTS, 'roots').name
  const out = {
    plants: bakeFootPlants(k, foot, clear),
    crown: { sprite: crown, x: Math.round(foot.x - (TRUNK_X - CROWN.x) * SCALE), y: Math.round(foot.y - CROWN.h * SCALE + GROUND_TUCK) },
    roots: { sprite: roots, x: Math.round(foot.x - (ROOTS_X - ROOTS.x) * SCALE), y: foot.y - GROUND_TUCK },
    apple: await bakeLeftTreeApple(k)
  }
  bakedByK.set(k, out)
  return out
}

/**
 * Bakes only the tree's apple (ripe and young) once per live k, for a scene
 * that paints the tree itself (the menu backdrop).
 * @param {Object} k - Kaplay instance
 * @returns {Promise<Object|null>} The apple's sprite, its young green copy's sprite, its
 *   canvas, size and offset of its top-left from its body's centre (null if the picture
 *   failed to load)
 */
export async function bakeLeftTreeApple(k) {
  const cached = appleByK.get(k)
  if (cached) return cached
  const img = await image
  if (!img) return null
  const apple = bakePart(k, img, APPLE, 'apple')
  const out = {
    sprite: apple.name,
    unripe: bakeUnripeApple(k, apple.canvas),
    canvas: apple.canvas,
    w: APPLE.w * SCALE * APPLE_SIZE,
    h: APPLE.h * SCALE * APPLE_SIZE,
    dx: (APPLE.x - APPLE_BODY.x) * SCALE * APPLE_SIZE,
    dy: (APPLE.y - APPLE_BODY.y) * SCALE * APPLE_SIZE
  }
  appleByK.set(k, out)
  return out
}

/**
 * Sync read of the apple bakeLeftTreeApple() made on this k.
 * @param {Object} k - Kaplay instance
 * @returns {Object|null}
 */
export function leftTreeApplePicture(k) {
  return appleByK.get(k) ?? null
}

/**
 * The start branch in the world, in the shape the level's branch platform
 * takes (one flat walkable top).
 * @param {{x: number, y: number}} foot - World point where the trunk meets the ground
 * @returns {{x1: number, x2: number, y: number, physY: number, platSegs: Array<{x1: number, x2: number, y: number}>}}
 */
export function leftTreeBranch(foot) {
  const a = toWorld(foot, BRANCH.x1, BRANCH.y)
  const b = toWorld(foot, BRANCH.x2, BRANCH.y)
  const x1 = Math.round(a.x)
  const x2 = Math.round(b.x)
  const y = Math.round(a.y) + BRANCH_DROP
  return { x1, x2, y, physY: y, platSegs: [{ x1, x2, y }] }
}

/**
 * Where apples grow in the world (their bodies' centres, in the order they
 * come) and their bodies' radius.
 * @param {{x: number, y: number}} foot - World point where the trunk meets the ground
 * @param {number} [scale=1] - Size of the tree relative to the level's (the menu paints it scaled)
 * @returns {Array<{x: number, y: number, r: number}>}
 */
export function leftTreeApples(foot, scale = 1) {
  return APPLE_HANGS.map(hang => ({ ...toWorld(foot, hang.x, hang.y, scale), r: APPLE_BODY.r * SCALE * APPLE_SIZE }))
}
//
// One part of the picture on its own canvas at world size (minus an
// optional wiped rect of the picture), graded and grained like the forest's
// other baked material.
//
function bakePart(k, img, part, id, clear = null) {
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(part.w * SCALE)
  canvas.height = Math.ceil(part.h * SCALE)
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, part.x, part.y, part.w, part.h, 0, 0, canvas.width, canvas.height)
  clear && clearPictureRect(canvas, part, clear, SCALE)
  applyForestLayerGradeToCanvas(canvas, {
    ...FOREST_LAYER_GRADE.material,
    grainBlockSize: forestFilmGrainBlockPxForTier('gameplay')
  }, GRAIN_SEED)
  const name = `${SPRITE_PREFIX}-${id}`
  k.loadSprite(name, canvas)
  return { name, canvas }
}
//
// The young apple: a copy of the baked (graded, grained) apple with its red
// redrawn in palette greens, so its grain stays.
//
function bakeUnripeApple(k, src) {
  const canvas = document.createElement('canvas')
  canvas.width = src.width
  canvas.height = src.height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(src, 0, 0)
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const ramp = ['unripeShade', 'unripe', 'unripeLight'].map(key => forestRgb(FOREST_PAL.forestTreeFruit[key]))
  const px = image.data
  for (let i = 0; i < px.length; i += 4) {
    const w = clamp01((px[i] - Math.max(px[i + 1], px[i + 2]) - UNRIPE_RED_FROM) / UNRIPE_RED_SPAN)
    if (w <= 0) continue
    const green = rampColor(ramp, clamp01((px[i] - UNRIPE_RED_DARK) / (UNRIPE_RED_LIGHT - UNRIPE_RED_DARK)))
    px[i] += (green.r - px[i]) * w
    px[i + 1] += (green.g - px[i + 1]) * w
    px[i + 2] += (green.b - px[i + 2]) * w
  }
  ctx.putImageData(image, 0, 0)
  const name = `${SPRITE_PREFIX}-apple-unripe`
  k.loadSprite(name, canvas)
  return name
}
//
// A colour along three stops (dark, middle, light) at t in 0..1.
//
function rampColor(ramp, t) {
  const u = t * (ramp.length - 1)
  const i = Math.min(ramp.length - 2, Math.floor(u))
  const f = u - i
  const a = ramp[i]
  const b = ramp[i + 1]
  return { r: a.r + (b.r - a.r) * f, g: a.g + (b.g - a.g) * f, b: a.b + (b.b - a.b) * f }
}
function clamp01(v) {
  return Math.max(0, Math.min(1, v))
}
//
// The plants over the trunk's foot on one canvas (ground line at its
// FOOT_BAKE_ABOVE row), graded and grained like the forest floor; none in
// the clear spans.
//
function bakeFootPlants(k, foot, clear) {
  const plants = bakeForestFootPlants(k, {
    name: `${SPRITE_PREFIX}-foot-plants`,
    halfW: FOOT_BAKE_HALF_W,
    above: FOOT_BAKE_ABOVE,
    below: FOOT_BAKE_BELOW,
    seed: FOOT_SEED,
    ferns: FOOT_FERNS,
    tufts: { from: FOOT_TUFT_FROM, to: FOOT_TUFT_TO, step: FOOT_TUFT_STEP },
    mushrooms: FOOT_MUSHROOMS,
    spotted: FOOT_SPOTTED,
    clear: clear && clear.map(span => ({ x1: span.x1 - foot.x, x2: span.x2 - foot.x }))
  })
  return { sprite: plants.sprite, x: foot.x + plants.dx, y: foot.y + plants.dy }
}
//
// World point of a point on the picture (above the ground line: the trunk's
// bottom on the picture is the foot).
//
function toWorld(foot, px, py, scale = 1) {
  const s = SCALE * scale
  return { x: foot.x + (px - TRUNK_X) * s, y: foot.y + (py - (CROWN.y + CROWN.h)) * s }
}
//
// The picture as an image (null if it fails to load).
//
function loadImage(url) {
  const img = new Image()
  img.src = url
  return img.decode().then(() => img, () => null)
}
