import { forestRgb, lerpForestRgb } from './forest-palette.js'
import {
  forestBushHiResClusterRadiusRangeForTier,
  forestBushLeafDensityScaleForTier,
  forestBushLeafSizeScaleForTier,
  forestHiResBushClustersForTier
} from './forest-pixel-density.js'
import { drawForestHiResFoliageCluster } from './forest-parallax-grain.js'
import { drawFernToCanvas } from '../../../utils/draw-fern.js'
import { createSeededRandom } from '../../../utils/seeded-random.js'
//
// Bush strips of the forest parallax planes, shared by the forest level and
// the menu backdrop.
//
const FOREST_SHADOW = forestRgb('forestShadow')
//
// Background bushes — leafy mounds cut by the ground line, drawn IN FRONT of
// the tree planes. Each mound is a filled dome scattered with small oval
// leaves (a different leaf shape than the tree teardrops), so the strip
// reads as real bushes instead of plain semicircles — in every mode.
// The radius spread is kept narrow, so every strip holds one roughly even
// height with only a small random step up/down — three uniform horizontal
// hedge bands, like the reference picture.
//
const BUSH_RADIUS_MIN = 54
const BUSH_RADIUS_MAX = 72
const BUSH_STEP_MIN_FRAC = 0.45
const BUSH_STEP_RANGE_FRAC = 0.5
//
// East half: hedges break into uneven clumps of a few mounds with open gaps
// between them (about half the mounds of the old continuous band), so the
// forest behind shows through.
//
const BUSH_EAST_CLUMP_MIN = 2
const BUSH_EAST_CLUMP_RANGE = 3
const BUSH_EAST_GAP_MIN_FRAC = 1.4
const BUSH_EAST_GAP_RANGE_FRAC = 1.9
//
// Bush leaf texture: oval leaves scattered across each dome plus a ragged
// leafy rim along the arc. Shades vary only in brightness (darkened base
// tone), so the colour composition of every strip stays unchanged.
//
const BUSH_LEAF_SIZE_MIN = 9
const BUSH_LEAF_SIZE_RANGE = 8
const BUSH_LEAF_DENSITY = 0.009
const BUSH_RIM_LEAF_SPACING = 18
const BUSH_LEAF_DARKEN_STEPS = [0, 0.08]
const BUSH_HIRES_CLUSTER_DENSITY = 0.3
const BUSH_FERN_OFFSET = 0.75
const BUSH_FERN_SIZE_MIN = 1.05
const BUSH_FERN_SIZE_RANGE = 0.6
const BUSH_FERN_SEED_RANGE = 1e9
const BUSH_FERN_STEM = 0.66
const BUSH_FERN_DARK = 0.5
const BUSH_FERN_MID = 0.34
const BUSH_FERN_LIGHT = 0.14

/**
 * Renders one bush strip: leafy mounds of varying radii centred on the
 * ground line, each a filled dome with oval leaves and a ragged leafy rim,
 * optionally with ferns tucked behind and hi-res clusters on top.
 * @param {CanvasRenderingContext2D} ctx - Target context
 * @param {Object} stripCfg - Strip configuration
 * @param {number} stripCfg.x1 - Strip left X
 * @param {number} stripCfg.x2 - Strip right X
 * @param {number} stripCfg.baseY - Ground line Y the mounds sit on
 * @param {number} stripCfg.heightScale - Mound radius scale
 * @param {{r: number, g: number, b: number}} [stripCfg.colorRgb] - Mound tone
 * @param {function(number): Object} [stripCfg.colorAt] - Mound tone by X (overrides colorRgb)
 * @param {boolean} [stripCfg.colorFlat] - Leaves take the exact dome tone
 * @param {number} [stripCfg.ferns=0] - Average ferns per mound
 * @param {string} [stripCfg.foliageDensityTier='midground'] - Pixel density tier
 * @param {boolean} [stripCfg.hiResClusters] - Force hi-res clusters on / off
 * @param {number} [stripCfg.eastX=Infinity] - From here on the strip breaks into clumps
 */
export function renderBushStrip(ctx, stripCfg) {
  renderStrip(ctx, stripCfg)
}
//
// Generates the geometry of one leafy bush mound: the dome plus the exact
// position, size, tilt and shade index of every inner and rim leaf, so the
// same mound can be painted identically with different tones.
//
function buildLeafyBushMoundSpec(x, baseY, radius, leafSizeScale = 1, leafDensityScale = 1) {
  const leaves = []
  //
  // Inner leaves — density scales with the dome area; sqrt keeps the radial
  // distribution uniform so no thin spots appear near the rim.
  //
  const innerCount = Math.round(radius * radius * BUSH_LEAF_DENSITY * leafDensityScale)
  for (let i = 0; i < innerCount; i++) {
    const a = Math.PI + Math.random() * Math.PI
    const dist = radius * Math.sqrt(Math.random())
    leaves.push({
      x: x + Math.cos(a) * dist,
      y: baseY + Math.sin(a) * dist,
      size: (BUSH_LEAF_SIZE_MIN + Math.random() * BUSH_LEAF_SIZE_RANGE) * leafSizeScale,
      angle: Math.random() * Math.PI * 2,
      shadeIdx: Math.floor(Math.random() * BUSH_LEAF_DARKEN_STEPS.length)
    })
  }
  //
  // Rim leaves — spaced along the arc, tilted along it, poking past the dome
  // edge so the silhouette gets an organic leafy fringe.
  //
  const rimCount = Math.max(4, Math.round(Math.PI * radius / BUSH_RIM_LEAF_SPACING))
  for (let i = 0; i < rimCount; i++) {
    const a = Math.PI + ((i + 0.5) / rimCount) * Math.PI + (Math.random() - 0.5) * 0.14
    leaves.push({
      x: x + Math.cos(a) * radius,
      y: baseY + Math.sin(a) * radius,
      size: (BUSH_LEAF_SIZE_MIN + Math.random() * BUSH_LEAF_SIZE_RANGE) * leafSizeScale,
      angle: a + Math.PI / 2 + (Math.random() - 0.5) * 0.6,
      shadeIdx: Math.floor(Math.random() * 2)
    })
  }
  return { x, baseY, radius, leaves }
}
function bushFernTone(rgb, shade) {
  const c = lerpForestRgb(rgb, FOREST_SHADOW, shade)
  return `rgb(${c.r}, ${c.g}, ${c.b})`
}
//
// One bush leaf — a plain rounded oval, deliberately a different shape than
// the teardrop tree leaves.
//
function drawBushLeaf(ctx, x, y, size, angle, rgb) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.fillStyle = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`
  ctx.beginPath()
  ctx.ellipse(0, 0, size * 0.55, size * 0.32, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}
//
// Clustered pixel-style foliage on the nearest parallax bush row (puffy
// clumps with a darker shadow base and a highlight rim), scattered evenly
// across the whole dome — sqrt(random()) for the radial sample keeps the
// density uniform per unit area (same trick buildLeafyBushMoundSpec uses
// for its inner leaves) instead of bunching everything near the base.
//
function drawHiResBushClusters(ctx, mound, baseRgb, foliageDensityTier = 'nearground') {
  const { minPx, maxPx } = forestBushHiResClusterRadiusRangeForTier(foliageDensityTier)
  const clusterCount = Math.max(10, Math.round(mound.radius * BUSH_HIRES_CLUSTER_DENSITY))
  for (let i = 0; i < clusterCount; i++) {
    const a = Math.PI + Math.random() * Math.PI
    const dist = mound.radius * Math.sqrt(Math.random())
    const cx = mound.x + Math.cos(a) * dist
    const cy = mound.baseY + Math.sin(a) * dist
    const r = minPx + Math.random() * (maxPx - minPx)
    drawForestHiResFoliageCluster(ctx, cx, cy, r, baseRgb, mound.x * 17 + i * 991)
  }
}
//
// Paints one prebuilt mound spec: a solid dome in the base tone (keeps the
// silhouette closed) and the leaf scatter with brightness-only shade
// variation resolved from the shade index of each leaf. With `flat` set all
// leaves take the exact dome tone, so the mound reads as one flat colour
// (the 2nd+ colour-world strips have no leaf details).
//
function drawLeafyBushMound(ctx, mound, rgb, flat = false) {
  const shades = BUSH_LEAF_DARKEN_STEPS.map(t => flat ? rgb : lerpForestRgb(rgb, FOREST_SHADOW, t))
  ctx.fillStyle = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`
  ctx.beginPath()
  ctx.arc(mound.x, mound.baseY, mound.radius, Math.PI, 0)
  ctx.closePath()
  ctx.fill()
  mound.leaves.forEach(leaf => drawBushLeaf(ctx, leaf.x, leaf.y, leaf.size, leaf.angle, shades[leaf.shadeIdx]))
}
function paintBushFernOnto(ctx, x, baseY, size, seed, rgb) {
  drawFernToCanvas(ctx, {
    x,
    baseY,
    size,
    rng: createSeededRandom(seed),
    colors: {
      stem: bushFernTone(rgb, BUSH_FERN_STEM),
      dark: bushFernTone(rgb, BUSH_FERN_DARK),
      mid: bushFernTone(rgb, BUSH_FERN_MID),
      light: bushFernTone(rgb, BUSH_FERN_LIGHT)
    }
  })
}
//
// Dark pinnate fern behind a bush mound, poking out above its dome.
//
function paintBushStripFern(ctx, mound, rgb) {
  const seed = Math.floor(Math.random() * BUSH_FERN_SEED_RANGE)
  const x = mound.x + (Math.random() * 2 - 1) * mound.radius * BUSH_FERN_OFFSET
  const size = mound.radius * (BUSH_FERN_SIZE_MIN + Math.random() * BUSH_FERN_SIZE_RANGE)
  paintBushFernOnto(ctx, x, mound.baseY, size, seed, rgb)
}
//
// Renders one bush strip into its combined canvas: leafy mounds of varying
// radii centred on the ground line (everything below baseY is cleared
// afterwards, so every mound is cut by the ground). Each mound is a filled
// dome plus scattered oval leaves and a ragged leaf rim, so the strip reads
// as real bushes.
//
function renderStrip(ctx, stripCfg) {
  const {
    colorRgb, colorFlat, heightScale, hiResClusters,
    ferns = 0,
    foliageDensityTier = 'midground',
    colorAt = null,
    x1,
    x2,
    baseY,
    eastX = Infinity
  } = stripCfg
  let x = x1
  const right = x2
  let clumpLeft = 0
  while (x < right) {
    const radius = (BUSH_RADIUS_MIN + Math.random() * (BUSH_RADIUS_MAX - BUSH_RADIUS_MIN)) * heightScale
    if (x >= eastX && clumpLeft <= 0) {
      x += radius * (BUSH_EAST_GAP_MIN_FRAC + Math.random() * BUSH_EAST_GAP_RANGE_FRAC)
      clumpLeft = BUSH_EAST_CLUMP_MIN + Math.floor(Math.random() * BUSH_EAST_CLUMP_RANGE)
      continue
    }
    clumpLeft--
    const leafSizeScale = forestBushLeafSizeScaleForTier(foliageDensityTier)
    const leafDensityScale = forestBushLeafDensityScaleForTier(foliageDensityTier)
    const mound = buildLeafyBushMoundSpec(x, baseY, radius, leafSizeScale, leafDensityScale)
    const moundColorRgb = colorAt ? colorAt(mound.x) : colorRgb
    const useHiResClusters = hiResClusters ?? forestHiResBushClustersForTier(foliageDensityTier)
    const fernCount = Math.floor(ferns) + (Math.random() < ferns % 1 ? 1 : 0)
    for (let f = 0; f < fernCount; f++) paintBushStripFern(ctx, mound, moundColorRgb)
    drawLeafyBushMound(ctx, mound, moundColorRgb, colorFlat)
    useHiResClusters && drawHiResBushClusters(ctx, mound, moundColorRgb, foliageDensityTier)
    //
    // Advance less than a radius so each mound overlaps the next one.
    //
    x += radius * (BUSH_STEP_MIN_FRAC + Math.random() * BUSH_STEP_RANGE_FRAC)
  }
}
