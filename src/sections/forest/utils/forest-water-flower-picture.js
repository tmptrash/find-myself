import { loadPictureImage, wipePictureFringe, cutPicture } from './forest-picture.js'
import { FOREST_LAYER_GRADE, applyForestLayerGradeToCanvas } from './forest-parallax-grain.js'
import { forestFilmGrainBlockPxForTier } from './forest-pixel-density.js'

//
// Picture of the water flower: a bare mossy stem rising straight out of the
// ground and curving over to the left, where its red flower hangs open,
// painted with its front petals only, so a bubble drawn behind the picture
// seems to grow out of the flower's heart.
// Cut from assets/forest/water_mushroom.png and baked at world size once
// per live k. The picture starts loading with this module (game boot).
//
const URL = 'forest/water_mushroom.png'
const SPRITE = 'forest0-water-flower-v1'
const GRAIN_SEED = 6301
//
// On the picture (px): the plant's box, the ground line (the stem's cut
// end sinks a little below it), the stem's foot and the flower's heart,
// where the bubble hangs from: the mouth of the bell between the side
// petals' lower edges, up behind the middle petal that hangs below it, so
// the bubble's top sits inside the bell. The whole plant stands
// GROUND_SINK world px lower than the ground line.
//
const PLANT = { x: 308, y: 260, w: 764, h: 716 }
const GROUND_Y = 971
const STEM_FOOT_X = 734
const FLOWER_HEART = { x: 465, y: 670 }
const GROUND_SINK = 1
const image = loadPictureImage(URL)
const bakedByK = new WeakMap()

/**
 * Bakes the picture once per live k, graded and grained like the forest's
 * other baked material (waits for the picture to load).
 * @param {Object} k - Kaplay instance
 * @param {number} height - World px from the picture's bottom to its top
 * @returns {Promise<Object|null>} layout(height) plus the sprite name and the
 *   stem's foot as its anchor ({ x, y } in -1..1 across the sprite), to draw
 *   it rotated round the foot (null if the picture failed to load)
 */
export async function load(k, height) {
  const cached = bakedByK.get(k)
  if (cached) return cached
  const img = await image
  if (!img) return null
  const clean = wipePictureFringe(img)
  const canvas = cutPicture(clean, PLANT, height / PLANT.h)
  clean.width = 0
  clean.height = 0
  applyForestLayerGradeToCanvas(canvas, {
    ...FOREST_LAYER_GRADE.material,
    grainBlockSize: forestFilmGrainBlockPxForTier('gameplay')
  }, GRAIN_SEED)
  k.loadSprite(SPRITE, canvas)
  const place = layout(height)
  const out = { ...place, sprite: SPRITE, anchor: footAnchor(place, canvas) }
  bakedByK.set(k, out)
  return out
}

/**
 * Where the picture sits round the stem's foot on the ground line (no
 * picture needed, so the level can plan around it before the bake).
 * @param {number} height - World px from the picture's bottom to its top
 * @returns {Object} Width, top-left and the flower's heart from the stem's
 *   foot, world px ({ w, dx, dy, heart: { x, y } })
 */
export function layout(height) {
  const scale = height / PLANT.h
  return {
    w: PLANT.w * scale,
    dx: (PLANT.x - STEM_FOOT_X) * scale,
    dy: (PLANT.y - GROUND_Y) * scale + GROUND_SINK,
    heart: { x: (FLOWER_HEART.x - STEM_FOOT_X) * scale, y: (FLOWER_HEART.y - GROUND_Y) * scale + GROUND_SINK }
  }
}
//
// Measured on the baked canvas, so the picture drawn at the stem's foot
// with this anchor lands on the same pixels as at its top-left.
//
function footAnchor(place, canvas) {
  return { x: -place.dx / canvas.width * 2 - 1, y: -place.dy / canvas.height * 2 - 1 }
}
