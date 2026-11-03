import { loadPictureImage, wipePictureFringe, cutPicture } from './forest-picture.js'
import { FOREST_LAYER_GRADE, applyForestLayerGradeToCanvas } from './forest-parallax-grain.js'
import { forestFilmGrainBlockPxForTier } from './forest-pixel-density.js'

//
// Picture of the apple bug's burrow: a mossy stone arch over a dark hole in
// the ground, cut from assets/forest/hole.png and baked at world size once
// per live k. The picture starts loading with this module (game boot).
//
const URL = 'forest/hole.png'
const SPRITE = 'forest0-bug-hole-v2'
const GRAIN_SEED = 6401
//
// On the picture (px): the burrow's box, the ground line (the picture
// stands GROUND_SINK world px lower than it) and the hole's width at the
// ground.
//
const PICTURE = { x: 146, y: 438, w: 967, h: 422 }
const GROUND_Y = 851
const HOLE_SPAN = { x1: 490, x2: 817 }
const GROUND_SINK = 1
const image = loadPictureImage(URL)
const bakedByK = new WeakMap()

/**
 * Bakes the burrow once per live k, graded and grained like the forest's
 * other baked material (waits for the picture to load).
 * @param {Object} k - Kaplay instance
 * @param {number} width - World px across the picture
 * @returns {Promise<Object|null>} layout(width) plus the picture's sprite
 *   name (null if the picture failed to load)
 */
export async function load(k, width) {
  const cached = bakedByK.get(k)
  if (cached) return cached
  const img = await image
  if (!img) return null
  const place = layout(width)
  const clean = wipePictureFringe(img)
  const canvas = cutPicture(clean, PICTURE, place.scale)
  clean.width = 0
  clean.height = 0
  applyForestLayerGradeToCanvas(canvas, {
    ...FOREST_LAYER_GRADE.material,
    grainBlockSize: forestFilmGrainBlockPxForTier('gameplay')
  }, GRAIN_SEED)
  k.loadSprite(SPRITE, canvas)
  const out = { ...place, sprite: SPRITE }
  bakedByK.set(k, out)
  return out
}

/**
 * Where the burrow sits round its middle on the ground line (no picture
 * needed, so the level can plan around it before the bake).
 * @param {number} width - World px across the picture
 * @returns {Object} Scale, size, the picture's top-left from its middle on the
 *   ground line and the hole's span from it, world px
 *   ({ scale, w, h, dx, dy, hole: { x1, x2 } })
 */
export function layout(width) {
  const scale = width / PICTURE.w
  const mid = PICTURE.x + PICTURE.w * 0.5
  return {
    scale,
    w: width,
    h: PICTURE.h * scale,
    dx: -width * 0.5,
    dy: (PICTURE.y - GROUND_Y) * scale + GROUND_SINK,
    hole: { x1: (HOLE_SPAN.x1 - mid) * scale, x2: (HOLE_SPAN.x2 - mid) * scale }
  }
}
