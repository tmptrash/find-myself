import { FOREST_LAYER_GRADE, applyForestLayerGradeToCanvas } from './forest-parallax-grain.js'
import { forestFilmGrainBlockPxForTier } from './forest-pixel-density.js'
import { bakeForestFootPlants } from './forest-foot-plants.js'
import { clearPictureRect } from './forest-picture.js'

//
// The left big tree of forest level 0, cut from assets/forest/left-tree.png
// (scaled): the tree above ground (crown with its painted apples, the
// trunk) stands on the ground line, its roots go under it into the earth.
// The loose apple on the right of the picture hangs in the crown and is the
// one the hero knocks loose from the start branch (the long low left
// branch). The picture starts loading with this module (game boot); bakes
// are once per live k.
//
const URL = 'forest/left-tree.png'
const SCALE = 0.47
const SPRITE_PREFIX = 'forest0-left-tree-v5'
const GRAIN_SEED = 6002
//
// Parts of the picture (px): the tree above ground (TRUNK_X: its trunk's
// middle at the bottom), the roots, the loose apple and its round body.
//
const CROWN = { x: 0, y: 0, w: 1041, h: 1013 }
const TRUNK_X = 589.5
const ROOTS = { x: 0, y: 1055, w: 992, h: 369 }
const ROOTS_X = 590
const APPLE = { x: 821, y: 746, w: 116, h: 136 }
const APPLE_BODY = { x: 869.5, y: 831.5, r: 45 }
//
// The loose apple sits beside the trunk inside the crown's part of the
// picture; this corner (right of the trunk, under the foliage) holds
// nothing else, so it is wiped out of the crown with the apple's faint halo.
//
const CROWN_CLEAR = { x: 680, y: 680, w: 361, h: 333 }
//
// The loose apple is drawn larger than the apples painted in the crown;
// it is shrunk by this much so it hangs among them at their size.
//
const APPLE_SIZE = 0.37
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
// where it leaves the leafy tip to the trunk.
//
const BRANCH = { x1: 280, x2: 535, y: 669 }
//
// The branch's platform sits this much lower (world px) than its top on the
// picture, so the hero's feet rest in the bark, not on its lit edge.
//
const BRANCH_DROP = 2
//
// Where the loose apple hangs on the picture (its body's centre): in the
// lower right of the crown, clear of the painted apples, over the strip of
// ground it drops onto.
//
const APPLE_HANG = { x: 810, y: 525 }
const image = loadImage(URL)
const bakedByK = new WeakMap()
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
 * @returns {Promise<{crown: Object, roots: Object, plants: Object, apple: Object}|null>} Each
 *   part's sprite and world top-left (plants: the greens over the trunk's foot); the apple's
 *   sprite, its canvas, size and offset of its top-left from its body's centre (null if the
 *   picture failed to load)
 */
export async function bakeLeftTree(k, foot) {
  const cached = bakedByK.get(k)
  if (cached) return cached
  const img = await image
  if (!img) return null
  const crown = bakePart(k, img, CROWN, 'crown', CROWN_CLEAR).name
  const roots = bakePart(k, img, ROOTS, 'roots').name
  const apple = bakePart(k, img, APPLE, 'apple')
  const out = {
    plants: bakeFootPlants(k, foot),
    crown: { sprite: crown, x: Math.round(foot.x - (TRUNK_X - CROWN.x) * SCALE), y: Math.round(foot.y - CROWN.h * SCALE + GROUND_TUCK) },
    roots: { sprite: roots, x: Math.round(foot.x - (ROOTS_X - ROOTS.x) * SCALE), y: foot.y - GROUND_TUCK },
    apple: {
      sprite: apple.name,
      canvas: apple.canvas,
      w: APPLE.w * SCALE * APPLE_SIZE,
      h: APPLE.h * SCALE * APPLE_SIZE,
      dx: (APPLE.x - APPLE_BODY.x) * SCALE * APPLE_SIZE,
      dy: (APPLE.y - APPLE_BODY.y) * SCALE * APPLE_SIZE
    }
  }
  bakedByK.set(k, out)
  return out
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
 * Where the loose apple hangs in the world (its body's centre) and its
 * body's radius.
 * @param {{x: number, y: number}} foot - World point where the trunk meets the ground
 * @returns {{x: number, y: number, r: number}}
 */
export function leftTreeApple(foot) {
  return { ...toWorld(foot, APPLE_HANG.x, APPLE_HANG.y), r: APPLE_BODY.r * SCALE * APPLE_SIZE }
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
// The plants over the trunk's foot on one canvas (ground line at its
// FOOT_BAKE_ABOVE row), graded and grained like the forest floor.
//
function bakeFootPlants(k, foot) {
  const plants = bakeForestFootPlants(k, {
    name: `${SPRITE_PREFIX}-foot-plants`,
    halfW: FOOT_BAKE_HALF_W,
    above: FOOT_BAKE_ABOVE,
    below: FOOT_BAKE_BELOW,
    seed: FOOT_SEED,
    ferns: FOOT_FERNS,
    tufts: { from: FOOT_TUFT_FROM, to: FOOT_TUFT_TO, step: FOOT_TUFT_STEP },
    mushrooms: FOOT_MUSHROOMS,
    spotted: FOOT_SPOTTED
  })
  return { sprite: plants.sprite, x: foot.x + plants.dx, y: foot.y + plants.dy }
}
//
// World point of a point on the picture (above the ground line: the trunk's
// bottom on the picture is the foot).
//
function toWorld(foot, px, py) {
  return { x: foot.x + (px - TRUNK_X) * SCALE, y: foot.y + (py - (CROWN.y + CROWN.h)) * SCALE }
}
//
// The picture as an image (null if it fails to load).
//
function loadImage(url) {
  const img = new Image()
  img.src = url
  return img.decode().then(() => img, () => null)
}
