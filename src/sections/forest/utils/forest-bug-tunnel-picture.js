import { loadPictureImage, wipePictureFringe, cutPicture } from './forest-picture.js'
import { FOREST_LAYER_GRADE, applyForestLayerGradeToCanvas } from './forest-parallax-grain.js'
import { forestFilmGrainBlockPxForTier } from './forest-pixel-density.js'

//
// Picture of the apple bug's tunnel under its burrow: a stone-lined cave
// with its left rounded end under the hole, dipping to a narrow middle and
// rising to its right rounded end, cut from assets/forest/tunnel.png and
// baked at world size once per live k. It lies under a layer of soil, apart
// from the burrow's picture.
//
const URL = 'forest/tunnel.png'
const SPRITE = 'forest0-bug-tunnel'
const GRAIN_SEED = 6417
//
// On the picture (px): the part kept (the whole cave), the anchor the cave
// is placed by (the middle of its leftmost stone across, the top of its
// stones down: it stands under the burrow's left doorway stone), the line
// the bug's feet walk along from the left end through the narrow middle to
// the right end (a little over the stones' tops, so in the narrow middle its
// back rather brushes the stones above than its feet tread on the ones
// below), where it shows up and vanishes (in the left end, its back clear
// of the wall) and where the apples it stores lie at the right end.
//
const PICTURE = { x: 262, y: 458, w: 1120, h: 410 }
const ANCHOR = { x: 298, y: 464 }
const END_X = 465
const FLOOR = [
  { x: 370, y: 648 },
  { x: 400, y: 652 },
  { x: 440, y: 682 },
  { x: 500, y: 704 },
  { x: 560, y: 740 },
  { x: 640, y: 748 },
  { x: 720, y: 764 },
  { x: 800, y: 778 },
  { x: 900, y: 774 },
  { x: 1000, y: 782 },
  { x: 1100, y: 760 },
  { x: 1160, y: 742 },
  { x: 1220, y: 712 },
  { x: 1290, y: 700 }
]
const PILE_X = 1250
const image = loadPictureImage(URL)
const bakedByK = new WeakMap()

/**
 * Bakes the tunnel once per live k, graded and grained like the forest's
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
 * Where the tunnel sits round its anchor: the middle of its leftmost stone
 * across, the top of its stones down (no picture needed).
 * @param {number} width - World px across the picture
 * @returns {Object} Scale, size, the picture's top-left, the feet's walking
 *   line, where the bug shows up and vanishes and the apples' spot at the
 *   far end, all world px from the anchor
 *   ({ scale, w, h, dx, dy, floor: [{x, y}], endX, pileX })
 */
function layout(width) {
  const scale = width / PICTURE.w
  return {
    scale,
    w: width,
    h: PICTURE.h * scale,
    dx: (PICTURE.x - ANCHOR.x) * scale,
    dy: (PICTURE.y - ANCHOR.y) * scale,
    floor: FLOOR.map(p => ({ x: (p.x - ANCHOR.x) * scale, y: (p.y - ANCHOR.y) * scale })),
    endX: (END_X - ANCHOR.x) * scale,
    pileX: (PILE_X - ANCHOR.x) * scale
  }
}
