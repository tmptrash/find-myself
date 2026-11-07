import { loadPictureImage, wipePictureFringe, cutPicture } from './forest-picture.js'
import { FOREST_LAYER_GRADE, applyForestLayerGradeToCanvas } from './forest-parallax-grain.js'
import { forestFilmGrainBlockPxForTier } from './forest-pixel-density.js'

//
// Picture of the apple bug's burrow: a shaft going down from its mouth on
// the ground into a cave dug in the soil, with crumbly earth edges, a ribbed
// back wall and a pebbly floor running from its narrow left end (under the
// shaft) down to the wide right end, cut from assets/forest/tunnel.png and
// baked at world size once per live k.
//
const URL = 'forest/tunnel.png'
const SPRITE = 'forest0-bug-tunnel-v3'
const GRAIN_SEED = 6417
//
// On the picture (px): the part kept (the whole burrow), the anchor it is
// placed by (the middle of the shaft's mouth across, the flat top of the
// mouth's earth lip down: it lies on the ground line), the mouth's inner
// span and its lip's outer span, the line the bug's feet walk along the
// cave's floor from the left end to the right end (between the back wall's
// foot and the floor's front edge, past the pebbles), where it rests in the
// cave (clear of the shaft's foot, where the cave is tall enough for it)
// and where the apples it stores lie at the right end.
//
const PICTURE = { x: 88, y: 272, w: 1288, h: 552 }
const ANCHOR = { x: 218, y: 284 }
const MOUTH = { x1: 158, x2: 278 }
const LIP = { x1: 95, x2: 339 }
const REST_X = 420
const FLOOR = [
  { x: 130, y: 545 },
  { x: 200, y: 560 },
  { x: 300, y: 592 },
  { x: 400, y: 632 },
  { x: 500, y: 660 },
  { x: 600, y: 680 },
  { x: 700, y: 694 },
  { x: 800, y: 704 },
  { x: 900, y: 702 },
  { x: 1000, y: 700 },
  { x: 1100, y: 702 },
  { x: 1180, y: 706 },
  { x: 1250, y: 700 }
]
const PILE_X = 1170
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
 * Where the burrow sits round its anchor (the middle of its mouth on the
 * ground line; no picture needed, so the level can plan around it).
 * @param {number} width - World px across the picture
 * @returns {Object} Scale, size, the picture's top-left, the mouth's span
 *   and its earth lip's span on the ground, the feet's walking line in the
 *   cave, where the bug rests there and the apples' spot at the far end,
 *   all world px from the anchor
 *   ({ scale, w, h, dx, dy, mouth: {x1, x2}, lip: {x1, x2}, floor: [{x, y}], restX, pileX })
 */
export function layout(width) {
  const scale = width / PICTURE.w
  const across = x => (x - ANCHOR.x) * scale
  return {
    scale,
    w: width,
    h: PICTURE.h * scale,
    dx: across(PICTURE.x),
    dy: (PICTURE.y - ANCHOR.y) * scale,
    mouth: { x1: across(MOUTH.x1), x2: across(MOUTH.x2) },
    lip: { x1: across(LIP.x1), x2: across(LIP.x2) },
    floor: FLOOR.map(p => ({ x: across(p.x), y: (p.y - ANCHOR.y) * scale })),
    restX: across(REST_X),
    pileX: across(PILE_X)
  }
}
