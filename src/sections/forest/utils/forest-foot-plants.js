import { FOREST_LAYER_GRADE, applyForestLayerGradeToCanvas } from './forest-parallax-grain.js'
import { forestFilmGrainBlockPxForTier } from './forest-pixel-density.js'
import { forestContactShadowRgb, paintForestContactShadow } from './forest-atmosphere.js'
import { createSeededRandom } from '../../../utils/seeded-random.js'
import { drawForestPlant, forestPlantBounds } from './forest-plants.js'
import { drawForestMushroom } from './forest-mushrooms.js'
//
// Greens hiding the seam where a picture tree's trunk meets its roots: ferns,
// pictured stones, mushrooms and a row of grass tufts standing on the ground
// line round the trunk's foot, back to front, with soft contact shadows;
// baked into one sprite, graded and grained like the forest floor.
//
const FERN_SHADOW_RX = 0.4
const FERN_SHADOW_RY = 5
const TUFT_SHADOW_RX = 9
const TUFT_SHADOW_RY = 3.2
const MUSH_SHADOW_RX = 14
const MUSH_SHADOW_RY = 4.5
const STONE_SHADOW_RX = 0.55
const STONE_SHADOW_RY = 4
//
// A stone's bottom sinks this share of its height into the ground.
//
const STONE_SINK_SHARE = 0.15

/**
 * Bakes the greens round one trunk's foot.
 * @param {Object} k - Kaplay instance
 * @param {Object} cfg
 * @param {string} cfg.name - Sprite name (unique per live k)
 * @param {number} cfg.halfW - Least canvas half-width round the foot (px; grows to fit the plants)
 * @param {number} cfg.above - Least canvas height above the ground line (px; grows to fit the plants)
 * @param {number} cfg.below - Canvas height under the ground line (px)
 * @param {number} cfg.seed - Seed of the plants' random looks and of the grain
 * @param {Array<{x: number, size: number}>} cfg.ferns - Ferns (x from the foot, height)
 * @param {{from: number, to: number, step: number}} cfg.tufts - Grass tuft row (x from the foot)
 * @param {number[]} [cfg.mushrooms=[]] - Small mushroom groups (x from the foot)
 * @param {number[]} [cfg.spotted=[]] - Spotted mushrooms (x from the foot)
 * @param {Array<{x: number, canvas: HTMLCanvasElement, w: number, h: number}>} [cfg.stones=[]] - Pictured stones (x from the foot, world size)
 * @returns {{sprite: string, dx: number, dy: number}} Sprite and its top-left from the foot
 */
export function bakeForestFootPlants(k, cfg) {
  const { below, seed, ferns, tufts, mushrooms = [], spotted = [], stones = [] } = cfg
  const reach = plantsReach(ferns, tufts)
  const halfW = Math.ceil(Math.max(cfg.halfW, reach.halfW))
  const above = Math.ceil(Math.max(cfg.above, reach.above))
  const canvas = document.createElement('canvas')
  canvas.width = halfW * 2
  canvas.height = above + below
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  const shadow = forestContactShadowRgb()
  const rng = createSeededRandom(seed)
  const cx = halfW
  const baseY = above
  ferns.forEach(f => {
    paintForestContactShadow(ctx, cx + f.x, baseY, f.size * FERN_SHADOW_RX, FERN_SHADOW_RY, shadow)
    drawForestPlant(ctx, { x: cx + f.x, baseY, size: f.size, rng })
  })
  stones.forEach(s => {
    paintForestContactShadow(ctx, cx + s.x, baseY, s.w * STONE_SHADOW_RX, STONE_SHADOW_RY, shadow)
    ctx.drawImage(s.canvas, cx + s.x - s.w / 2, baseY - s.h * (1 - STONE_SINK_SHARE), s.w, s.h)
  })
  mushrooms.forEach(x => {
    paintForestContactShadow(ctx, cx + x, baseY, MUSH_SHADOW_RX, MUSH_SHADOW_RY, shadow)
    drawForestMushroom(ctx, { x: cx + x, baseY, rng })
  })
  spotted.forEach(x => drawForestMushroom(ctx, { x: cx + x, baseY, rng }))
  for (let x = tufts.from; x <= tufts.to; x += tufts.step) {
    paintForestContactShadow(ctx, cx + x, baseY, TUFT_SHADOW_RX, TUFT_SHADOW_RY, shadow)
    drawForestPlant(ctx, { x: cx + x, baseY, rng })
  }
  applyForestLayerGradeToCanvas(canvas, {
    ...FOREST_LAYER_GRADE.material,
    grainBlockSize: forestFilmGrainBlockPxForTier('gameplay')
  }, seed)
  k.loadSprite(cfg.name, canvas)
  return { sprite: cfg.name, dx: -halfW, dy: -above }
}
//
// How far the plants reach from the foot (half-width, height above the
// ground line), the default-size tufts at their tallest.
//
function plantsReach(ferns, tufts) {
  const boxes = [
    ...ferns.map(f => forestPlantBounds(f.x, 0, f.size)),
    forestPlantBounds(tufts.from, 0),
    forestPlantBounds(tufts.to, 0)
  ]
  return {
    halfW: Math.max(...boxes.map(b => Math.max(-b.x1, b.x2))),
    above: Math.max(...boxes.map(b => -b.y1))
  }
}
