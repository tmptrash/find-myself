//
// Pure Canvas2D drawing primitive for "cloud crowns" — soft circular
// puffs forming a cloud silhouette. Used both by the L0 scrolling
// cloud band (`level0-scenery-sprites.js`) and by the ready/menu
// background generator so cloud puffs share one drawing pipeline.
//
const CLOUD_OPACITY_BASE = 0.85
const CLOUD_OPACITY_RANGE = 0.1
const CLOUD_CROWN_COUNT_BASE = 5
const CLOUD_CROWN_COUNT_RANGE = 4
const CLOUD_CROWN_SIZE_BASE = 50
const CLOUD_CROWN_SIZE_RANGE = 60
const CLOUD_CROWN_SIZE_SCALE = 1.2
const CLOUD_CROWN_OFFSET_X_RATIO = 0.7
const CLOUD_CROWN_OFFSET_Y_RATIO = 0.5
const CLOUD_CROWN_SIZE_VARIATION_BASE = 0.6
const CLOUD_CROWN_SIZE_VARIATION_RANGE = 0.6
const CLOUD_CROWN_OPACITY_VARIATION_BASE = 0.7
const CLOUD_CROWN_OPACITY_VARIATION_RANGE = 0.2

/**
 * Builds a randomised cloud-crown descriptor: a cluster of N circular
 * puffs centred near `(x, y)` with per-puff offset, size and opacity
 * jitter. The descriptor is data-only (no drawing) — pass it later to
 * `drawCloudCrownToCanvas` to render.
 *
 * @param {Object} opts
 * @param {number} opts.x - World X centre of the cloud (px)
 * @param {number} opts.y - World Y centre of the cloud (px)
 * @returns {Object} Cloud descriptor consumed by drawCloudCrownToCanvas
 */
export function buildCloudCrown(opts) {
  const { x, y } = opts
  const crownSize = (CLOUD_CROWN_SIZE_BASE + Math.random() * CLOUD_CROWN_SIZE_RANGE) * CLOUD_CROWN_SIZE_SCALE
  const crownCount = CLOUD_CROWN_COUNT_BASE + Math.floor(Math.random() * CLOUD_CROWN_COUNT_RANGE)
  const crowns = []
  for (let j = 0; j < crownCount; j++) {
    crowns.push({
      offsetX: (Math.random() - 0.5) * crownSize * CLOUD_CROWN_OFFSET_X_RATIO,
      offsetY: (Math.random() - 0.5) * crownSize * CLOUD_CROWN_OFFSET_Y_RATIO,
      sizeVariation: CLOUD_CROWN_SIZE_VARIATION_BASE + Math.random() * CLOUD_CROWN_SIZE_VARIATION_RANGE,
      opacityVariation: CLOUD_CROWN_OPACITY_VARIATION_BASE + Math.random() * CLOUD_CROWN_OPACITY_VARIATION_RANGE
    })
  }
  return {
    x,
    y,
    crownSize,
    crowns,
    opacity: CLOUD_OPACITY_BASE + Math.random() * CLOUD_OPACITY_RANGE
  }
}

/**
 * Computes the axis-aligned bounding box of a list of cloud crowns when
 * drawn at their world positions. Used by sprite-bake utilities to size
 * the off-screen canvas correctly.
 *
 * @param {Array<Object>} cloudConfigs - Output of `buildCloudCrown`
 * @returns {{ minX: number, maxX: number, minY: number, maxY: number }}
 */
export function computeCloudCrownsBounds(cloudConfigs) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const cloud of cloudConfigs) {
    for (const crown of cloud.crowns) {
      const r = cloud.crownSize * crown.sizeVariation
      const cx = cloud.x + crown.offsetX
      const cy = cloud.y + crown.offsetY
      minX = Math.min(minX, cx - r)
      maxX = Math.max(maxX, cx + r)
      minY = Math.min(minY, cy - r)
      maxY = Math.max(maxY, cy + r)
    }
  }
  return { minX, maxX, minY, maxY }
}

/**
 * Draws every crown of a single cloud descriptor onto a 2D context.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} cloud - Output of `buildCloudCrown`
 * @param {{ r: number, g: number, b: number }} color - Crown fill colour
 * @param {Object} [opts]
 * @param {number} [opts.offsetX=0] - Per-call X translation in world px
 * @param {number} [opts.offsetY=0] - Per-call Y translation in world px
 * @param {number} [opts.opacityScale=1] - Multiplied into the cloud's
 *        own opacity (e.g. to fade the entire cloud band).
 */
export function drawCloudCrownToCanvas(ctx, cloud, color, opts = {}) {
  const { offsetX = 0, offsetY = 0, opacityScale = 1 } = opts
  for (const crown of cloud.crowns) {
    const cx = cloud.x + crown.offsetX + offsetX
    const cy = cloud.y + crown.offsetY + offsetY
    const r = cloud.crownSize * crown.sizeVariation
    ctx.globalAlpha = cloud.opacity * crown.opacityVariation * opacityScale
    ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}
