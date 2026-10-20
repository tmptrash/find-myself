import { drawMossyBoulderToCanvas, drawMossyTuftToCanvas } from '../../../utils/draw-mossy-hill.js'
import { forestFloorPainterColors } from '../components/forest-floor.js'

//
// Lake-shore rock pile painted with the same boulders, moss and colours as
// the lake island hill: the merged rock silhouette is filled with the stone
// tone, then rows of hill boulders cover it top row first (lower boulders
// overlap the upper ones, like the hill's front row), moss patches sit on
// the dry boulders and moss tufts poke above the rock top.
//
const LOBE_COLUMNS = 3.4
const LOBE_MIN_W = 46
const LOBE_ASPECT = 0.78
const LOBE_SIZE_JITTER = 0.25
const LOBE_STEP_X = 0.8
const LOBE_STEP_Y = 0.7
const LOBE_ROW_SHIFT = 0.42
const LOBE_POS_JITTER = 0.14
const LOBE_EDGE_PAD = 0.3
const LOBE_MOSS_PATCH_CHANCE = 0.55
//
// Moss tufts along the rock top above the water (hill crest tufts).
//
const TUFT_STEP_PX = 9
const TUFT_CHANCE = 0.6
const TUFT_R_MIN = 4
const TUFT_R_RANGE = 6
const TUFT_SINK = 0.2

/**
 * Paints the island-style boulder pile into a canvas context. Several
 * overlapping rock outlines merge into one silhouette (one shared contour,
 * boulders run across the seams), so the pile reads as one rock. The caller
 * is responsible for any clip (lake bed) and post passes.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} cfg
 * @param {Array<Array<{ x: number, y: number }>>} cfg.loops - Rock outlines (canvas px)
 * @param {number} cfg.waterY - Canvas Y of the water line (greenery stays above it)
 * @param {() => number} cfg.rng - Seeded random in [0, 1)
 * @param {number} cfg.outlineWidth - Outer contour width (px)
 */
export function paintGlowShoreRock(ctx, cfg) {
  const colors = forestFloorPainterColors().hill
  const { loops, rng, waterY } = cfg
  //
  // Contour as a doubled stroke under the fill: only the outer half of the
  // union boundary survives, the seams between the outlines get covered.
  //
  traceLoops(ctx, loops)
  ctx.strokeStyle = colors.contour
  ctx.lineWidth = cfg.outlineWidth * 2
  ctx.stroke()
  ctx.save()
  traceLoops(ctx, loops)
  ctx.fillStyle = colors.stone
  ctx.fill()
  ctx.clip()
  buildBoulders(loops.flat(), rng).forEach(b => {
    drawMossyBoulderToCanvas(ctx, {
      ...b,
      rng,
      colors,
      mossPatch: b.cy < waterY && rng() < LOBE_MOSS_PATCH_CHANCE
    })
  })
  ctx.restore()
  paintTopTufts(ctx, loops, rng, colors, waterY)
}

//
// Rows of jittered boulders covering the silhouette bounds, top row first.
//
function buildBoulders(pts, rng) {
  const xs = pts.map(p => p.x)
  const ys = pts.map(p => p.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const baseW = Math.max(LOBE_MIN_W, (maxX - minX) / LOBE_COLUMNS)
  const baseH = baseW * LOBE_ASPECT
  const boulders = []
  let row = 0
  for (let y = minY + baseH * LOBE_EDGE_PAD; y < maxY + baseH * LOBE_EDGE_PAD; y += baseH * LOBE_STEP_Y) {
    const shift = row % 2 ? baseW * LOBE_ROW_SHIFT : 0
    for (let x = minX - shift; x < maxX + baseW * LOBE_EDGE_PAD; x += baseW * LOBE_STEP_X) {
      const size = 1 + (rng() * 2 - 1) * LOBE_SIZE_JITTER
      boulders.push({
        cx: x + (rng() * 2 - 1) * baseW * LOBE_POS_JITTER,
        cy: y + (rng() * 2 - 1) * baseH * LOBE_POS_JITTER,
        rx: baseW * 0.5 * size,
        ry: baseH * 0.5 * size
      })
    }
    row++
  }
  return boulders
}
//
// Moss tufts on the rock top, only where the top is above the water.
//
function paintTopTufts(ctx, loops, rng, colors, waterY) {
  const xs = loops.flat().map(p => p.x)
  const maxX = Math.max(...xs)
  for (let x = Math.min(...xs); x <= maxX; x += TUFT_STEP_PX) {
    const top = silhouetteTopY(loops, x)
    if (top == null || top > waterY || rng() > TUFT_CHANCE) continue
    const r = TUFT_R_MIN + rng() * TUFT_R_RANGE
    drawMossyTuftToCanvas(ctx, x, top + r * TUFT_SINK, r, rng, colors)
  }
}
//
// Topmost Y of the merged outlines at X (straight-edge approximation of the
// smoothed loops), or null when X misses every outline.
//
function silhouetteTopY(loops, x) {
  let top = null
  loops.forEach(pts => {
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i]
      const b = pts[(i + 1) % pts.length]
      if ((x < a.x && x < b.x) || (x > a.x && x > b.x) || a.x === b.x) continue
      const y = a.y + (b.y - a.y) * (x - a.x) / (b.x - a.x)
      top = top == null ? y : Math.min(top, y)
    }
  })
  return top
}
function traceLoops(ctx, loops) {
  ctx.beginPath()
  loops.forEach(pts => appendSmoothLoop(ctx, pts))
}
//
// Closed loop smoothed with quadratic curves through vertex midpoints (same
// outline style as drawRockToCanvas).
//
function appendSmoothLoop(ctx, pts) {
  const last = pts[pts.length - 1]
  ctx.moveTo((last.x + pts[0].x) / 2, (last.y + pts[0].y) / 2)
  for (let i = 0; i < pts.length; i++) {
    const cur = pts[i]
    const next = pts[(i + 1) % pts.length]
    ctx.quadraticCurveTo(cur.x, cur.y, (cur.x + next.x) / 2, (cur.y + next.y) / 2)
  }
  ctx.closePath()
}
