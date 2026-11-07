import { loadPictureImage, wipePictureFringe, cutPicture } from './forest-picture.js'
import { FOREST_LAYER_GRADE, applyForestLayerGradeToCanvas } from './forest-parallax-grain.js'
import { forestFilmGrainBlockPxForTier } from './forest-pixel-density.js'
import { hash01 } from './forest-organic-motion.js'
import { FOREST_PAL } from './forest-palette.js'

//
// Picture of the water flower: a bare mossy stem rising straight out of the
// ground and curving over to the left, where its red flower hangs open,
// painted with its front petals only, so a bubble drawn behind the picture
// seems to grow out of the flower's heart; its roots go under the ground.
// Cut from assets/forest/water_flower.png and baked at world size once
// per live k. The picture starts loading with this module (game boot).
//
const URL = 'forest/water_flower.png'
const SPRITE = 'forest0-water-flower-v3'
const ROOTS_SPRITE = 'forest0-water-flower-roots-v2'
const GRAIN_SEED = 6301
const ROOTS_GRAIN_SEED = 6302
//
// On the picture (px): the plant's box, the ground line (the stem's cut
// end sinks a little below it), the stem's foot and the flower's heart,
// where the bubble hangs from: the mouth of the bell between the side
// petals' lower edges, up behind the middle petal that hangs below it, so
// the bubble's top sits inside the bell. The whole plant stands
// GROUND_SINK world px lower than the ground line.
//
const PLANT = { x: 300, y: 175, w: 777, h: 730 }
const GROUND_Y = 899
const STEM_FOOT_X = 728
const FLOWER_HEART = { x: 466, y: 624 }
const GROUND_SINK = 1
//
// The roots under the stem (their top row at the box's top, centred on the
// stem's foot; the thin seam line between them and the stem is left out)
// reach this many world px up over the ground line.
//
const ROOTS = { x: 403, y: 929, w: 624, h: 237 }
const ROOTS_TUCK = 1
//
// A flat spot of yellow moss lies on the ground in front of the stem's
// foot and covers the joint of the stem and its roots: a ring of beads
// (world px, centred SPOT_DROP below the ground line) in a dark rim,
// shaded, body and lit tones, the lit ones on its upper half only.
//
const SPOT_SPRITE = 'forest0-water-flower-moss-v1'
const SPOT_GRAIN_SEED = 6303
const SPOT = { w: 36, h: 10 }
const SPOT_DROP = 0
const SPOT_PAD = 3
const SPOT_BEADS = 32
const SPOT_BEAD_MIN = 1.6
const SPOT_BEAD_MAX = 3
const SPOT_RIM_GROW = 0.8
const SPOT_RIM_DROP = 1
const SPOT_LIGHT_SHARE = 0.7
const SPOT_LIGHT_SHRINK = 0.6
const SPOT_LIGHT_LIFT = 0.3
const SPOT_EDGE_TAPER = 0.5
const SPOT_SEED = 41.7
const SPOT_COLORS = FOREST_PAL.waterFlower
const image = loadPictureImage(URL)
const bakedByK = new WeakMap()

/**
 * Bakes the picture once per live k, graded and grained like the forest's
 * other baked material (waits for the picture to load).
 * @param {Object} k - Kaplay instance
 * @param {number} height - World px from the picture's bottom to its top
 * @returns {Promise<Object|null>} layout(height) plus the sprite name and the
 *   stem's foot as its anchor ({ x, y } in -1..1 across the sprite), to draw
 *   it rotated round the foot, the roots' sprite with its top-left from the
 *   foot ({ sprite, dx, dy }, world px) and the moss spot's sprite with its
 *   centre below the foot ({ sprite, dy }) (null if the picture failed to load)
 */
export async function load(k, height) {
  const cached = bakedByK.get(k)
  if (cached) return cached
  const img = await image
  if (!img) return null
  const scale = height / PLANT.h
  const clean = wipePictureFringe(img)
  const canvas = bakePart(k, clean, PLANT, scale, SPRITE, GRAIN_SEED)
  bakePart(k, clean, ROOTS, scale, ROOTS_SPRITE, ROOTS_GRAIN_SEED)
  clean.width = 0
  clean.height = 0
  const place = layout(height)
  const roots = { sprite: ROOTS_SPRITE, dx: Math.round((ROOTS.x - STEM_FOOT_X) * scale), dy: -ROOTS_TUCK }
  bakeSpot(k)
  const spot = { sprite: SPOT_SPRITE, dy: SPOT_DROP }
  const out = { ...place, sprite: SPRITE, anchor: footAnchor(place, canvas), roots, spot }
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
// One part of the picture at world size, graded and grained like the
// forest's other baked material.
//
function bakePart(k, src, rect, scale, sprite, seed) {
  const canvas = cutPicture(src, rect, scale)
  applyForestLayerGradeToCanvas(canvas, {
    ...FOREST_LAYER_GRADE.material,
    grainBlockSize: forestFilmGrainBlockPxForTier('gameplay')
  }, seed)
  k.loadSprite(sprite, canvas)
  return canvas
}
//
// The moss spot: every bead first as a dark rim a little bigger and lower,
// then shaded or body beads over them, then smaller lit beads on the upper
// half, all inside the spot's oval.
//
function bakeSpot(k) {
  const canvas = document.createElement('canvas')
  canvas.width = SPOT.w + SPOT_PAD * 2
  canvas.height = SPOT.h + SPOT_PAD * 2
  const ctx = canvas.getContext('2d')
  const beads = spotBeads()
  for (const b of beads) drawBead(ctx, b.x, b.y + SPOT_RIM_DROP, b.r + SPOT_RIM_GROW, SPOT_COLORS.mossRim)
  for (const b of beads) drawBead(ctx, b.x, b.y, b.r, b.shaded ? SPOT_COLORS.mossShade : SPOT_COLORS.moss)
  for (const b of beads) b.lit && drawBead(ctx, b.x, b.y - b.r * SPOT_LIGHT_LIFT, b.r * SPOT_LIGHT_SHRINK, SPOT_COLORS.mossLight)
  applyForestLayerGradeToCanvas(canvas, {
    ...FOREST_LAYER_GRADE.material,
    grainBlockSize: forestFilmGrainBlockPxForTier('gameplay')
  }, SPOT_GRAIN_SEED)
  k.loadSprite(SPOT_SPRITE, canvas)
}
//
// Beads spread over the oval (canvas px); the lower ones are shaded and
// the upper ones may catch the light.
//
function spotBeads() {
  const beads = []
  for (let i = 0; i < SPOT_BEADS; i++) {
    const u = hash01(SPOT_SEED + i) * 2 - 1
    const v = (hash01(SPOT_SEED * 2 + i) * 2 - 1) * Math.sqrt(1 - u * u)
    const r = SPOT_BEAD_MIN + (SPOT_BEAD_MAX - SPOT_BEAD_MIN) * hash01(SPOT_SEED * 3 + i) * (1 - Math.abs(u) * SPOT_EDGE_TAPER)
    beads.push({
      x: SPOT_PAD + SPOT.w * 0.5 + u * (SPOT.w * 0.5 - r),
      y: SPOT_PAD + SPOT.h * 0.5 + v * (SPOT.h * 0.5 - r * 0.5),
      r,
      shaded: v > 0,
      lit: v < 0 && hash01(SPOT_SEED * 4 + i) < SPOT_LIGHT_SHARE
    })
  }
  return beads
}
function drawBead(ctx, x, y, r, color) {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(Math.round(x), Math.round(y), r, 0, Math.PI * 2)
  ctx.fill()
}
//
// Measured on the baked canvas, so the picture drawn at the stem's foot
// with this anchor lands on the same pixels as at its top-left.
//
function footAnchor(place, canvas) {
  return { x: -place.dx / canvas.width * 2 - 1, y: -place.dy / canvas.height * 2 - 1 }
}
