import { buildForestTree, renderForestTreeIntoContext, TREE_SEED } from './forest-tree.js'
import {
  FOREST_PAL,
  forestRgb,
  forestSkyBandRgb,
  forestRockShadedDrawPalette,
  forestContourRgb,
  buildDimmedTreePalette,
  getTreePaletteParallaxCorner,
  getTreePaletteColor,
  getForestGameplayTreeVolumeShades
} from './forest-palette.js'
import { forestTreeBuildOptsForDensity } from './forest-pixel-density.js'
import { groundEarthLayersColor, paintLayeredEarthBand } from './forest-earth-band.js'
import { forestFloorPainterColors } from '../components/forest-floor.js'
import { forestContactShadowRgb, paintForestContactShadow } from './forest-atmosphere.js'
import { applyForestFilmGrainToCanvas, applyForestLayerGradeToCanvas, FOREST_LAYER_GRADE } from './forest-parallax-grain.js'
import { TRAMP_FACE_EYE_SCALE, drawCuteMushroomToCanvas } from './cute-mushroom.js'
import * as Lake from './forest-lake.js'
import { paintForestShoreRock } from './forest-shore-rock.js'
import { renderBushStrip } from './forest-bush-strip.js'
import { buildUndergroundSpec, renderUndergroundSpec, undergroundStaticEarthTones } from './forest-underground.js'
import { paintUndergroundDepthVignette } from './forest-atmosphere.js'
import { drawFernToCanvas } from '../../../utils/draw-fern.js'
import { drawGrassTuftToCanvas } from '../../../utils/draw-grass-tuft.js'
import { drawGroundRimToCanvas } from '../../../utils/draw-ground-rim.js'
import { drawSmallMushroomGroupToCanvas, drawSpottedMushroomToCanvas } from '../../../utils/draw-small-mushroom.js'
import { buildRockVertices, drawRockToCanvas } from '../../../utils/draw-rock.js'
import { createSeededRandom, nextSeed } from '../../../utils/seeded-random.js'
//
// Menu backdrop for the forest level, composed from the level's own
// colour-world pieces like one still of the level: a cool sky and three hazy
// parallax tree rows behind, framing trees on both screen edges, the big
// apple tree as the one vertical anchor on the right with its roots spread
// through the layered soil, the level's lake to its left with a stone pile on
// the tree-side bank, and warm accents (apples, spotted mushrooms) clustered
// around the tree. The left third stays calm for the menu column. Seeded, so
// every visit paints the same scene. Layout values are design px at
// REF_HEIGHT and scale with the screen height. The lake water, grass,
// ear-trees, stalk eyes and the crawler are live (see forestMenuLayout).
//
const LAYOUT_SEED = 61027
const REF_HEIGHT = 1080
//
// Ground line as a fraction of the screen height.
//
const GROUND_Y_FRAC = 0.78
//
// Sky: a plain smooth gradient through palette stops of the level's sky ramp
// (dark teal zenith → dawn-gold horizon), no grain. It runs a little below
// the ground line so the soil band always covers its lower edge.
//
const SKY_STOP_COUNT = 6
const SKY_GROUND_OVERLAP = 8
//
// Parallax rows behind the scene — as many as the level has (far, mid,
// near): full-width rows of trees with bushes at their feet, graded by depth
// (contrast / saturation pulled toward the hued haze). Rows are opaque;
// `alpha` is how much of a row's own colour survives its mix toward the sky
// (rising toward the front), so the far row stays a quiet backdrop. Trees are
// spread evenly over the row width (jittered); a strip of the level's leafy
// bushes (with ferns tucked behind on the nearer rows) runs along their feet,
// sized and
// detailed per depth tier like the level's planes.
//
const PARALLAX_ROWS = [
  {
    seed: 51307,
    count: 12,
    heightMin: 0.5,
    heightRange: 0.16,
    scale: 0.34,
    haze: 0.5,
    grade: 'far',
    alpha: 0.34,
    sink: 0,
    tier: 'background',
    bushScale: 1.55,
    ferns: 0,
    cornerKey: 'parallaxTreeCornerTL'
  },
  {
    seed: 51419,
    count: 9,
    heightMin: 0.4,
    heightRange: 0.12,
    scale: 0.4,
    haze: 0.32,
    grade: 'mid',
    alpha: 0.42,
    sink: 4,
    tier: 'midground',
    bushScale: 1.18,
    ferns: 1.4,
    cornerKey: 'parallaxTreeCornerBR'
  },
  {
    seed: 51533,
    count: 7,
    heightMin: 0.46,
    heightRange: 0.12,
    scale: 0.46,
    haze: 0.2,
    grade: 'near',
    alpha: 0.6,
    sink: 6,
    tier: 'nearground',
    bushScale: 0.78,
    ferns: 1.8,
    cornerKey: 'parallaxTreeCornerTR'
  }
]
const PARALLAX_TREE_JITTER = 0.4
const PARALLAX_GRAIN_SEED = 7907
//
// Parallax rows are painted only down to just below the ground line (the
// soil band covers everything lower).
//
const PARALLAX_BOTTOM_PAD = 24
const RGBA_STRIDE = 4
//
// Framing trees standing on the screen edges (x as a fraction of the screen
// width): the left one is hazier and shorter so it never competes with the
// menu column, the right pair is greener and taller and closes the frame
// behind the apple tree.
//
const FRAME_TREES = [
  { xFrac: -0.03, heightFrac: 0.58, scale: 0.5, haze: 0.42, green: false, cornerKey: 'parallaxTreeCornerTL' },
  { xFrac: 0.93, heightFrac: 0.6, scale: 0.52, haze: 0.18, green: true },
  { xFrac: 1.04, heightFrac: 0.7, scale: 0.56, haze: 0.08, green: true }
]
const FRAME_TREE_BUILD_OPTS = { includeRoots: false, includeHeroBranch: false }
//
// The apple tree — the level's own main tree (same seed and crown build) at
// level size, standing at APPLE_TREE_X_FRAC with its roots in the soil.
//
const APPLE_TREE_X_FRAC = 0.66
const APPLE_TREE_TRUNK_H = 380
const APPLE_TREE_ROOT_DEPTH = 200
const APPLE_TREE_HERO_BRANCH_FRAC = 0.5
//
// Apples hung on foliage clusters of the apple tree, kept apart so they
// read as a few warm accents, not a pattern.
//
const APPLE_COUNT = 9
const APPLE_MIN_GAP = 70
const APPLE_RADIUS = 8
const APPLE_HANG = 6
const APPLE_STEM_LEN = 6
const APPLE_STEM_W = 1.6
const APPLE_CONTOUR_W = 1.5
const APPLE_SHADE_ALPHA = 0.55
const APPLE_SHADE_OFFSET = 0.28
const APPLE_HIGHLIGHT_ALPHA = 0.5
const APPLE_HIGHLIGHT_R = 0.22
const APPLE_HIGHLIGHT_OFFSET = -0.35
const APPLE_MIN_DEPTH_BELOW_TOP = 60
//
// The level's lake to the left of the apple tree (x as fractions of the
// screen width): its water line sits LAKE_SURFACE_LIFT px above the ground
// line (a little lower than in the level, so the bank shows); the shallows
// run on past the core right end.
//
const LAKE_X1_FRAC = 0.24
const LAKE_X2_CORE_FRAC = 0.44
const LAKE_SURFACE_LIFT = 2
//
// Ground rocks like the level's scatter: textured shaded stones, stretched a
// little wider than tall and seated deep in the soil (the ground cuts them
// flat), in small groups around the ear-trees and the screen edges.
//
const ROCK_GROUPS = [
  { xFrac: 0.765, count: 3, spread: 44, radiusMin: 12, radiusRange: 12 },
  { xFrac: 0.845, count: 2, spread: 36, radiusMin: 16, radiusRange: 14 },
  { xFrac: 0.91, count: 3, spread: 50, radiusMin: 14, radiusRange: 16 },
  { xFrac: 0.98, count: 2, spread: 30, radiusMin: 12, radiusRange: 10 },
  { xFrac: 0.06, count: 2, spread: 40, radiusMin: 16, radiusRange: 14 }
]
const ROCK_WIDTH_SCALE_MIN = 1
const ROCK_WIDTH_SCALE_RANGE = 0.6
const ROCK_CENTER_ABOVE_GROUND = 0.11
const ROCK_OUTLINE_WIDTH = 2
//
// The lake's tree-side stone pile, built like the level's: a few lumpy
// stone heaps painted by the shore-rock painter — their caps stand above
// the water line, their flanks flare and run down the bank into the lake
// bed (clipped at the bed, tinted under the water). Offsets / sizes are
// design px from the shore anchor (between the core end and the shallows).
//
const SHORE_PILE_HEAPS = [
  { dx: -14, top: 34, capHalfW: 48, footHalfW: 86 },
  { dx: -78, top: 8, capHalfW: 30, footHalfW: 54 },
  { dx: 52, top: 22, capHalfW: 30, footHalfW: 40 }
]
const SHORE_PILE_ARC_STEPS = 10
const SHORE_PILE_FOOT_STEPS = 12
const SHORE_PILE_JITTER = 0.08
const SHORE_PILE_BED_OVERSHOOT = 14
const SHORE_PILE_PAD = 6
const SHORE_PILE_SEED = 61091
//
// Ground plants: ferns and straw tufts thicken toward the screen edges and
// around the apple tree's foot, mushroom groups gather at the tree.
//
const FERN_SPOTS = [0.02, 0.09, 0.15, 0.5, 0.61, 0.74, 0.8, 0.87, 0.97]
const FERN_SIZE_MIN = 42
const FERN_SIZE_RANGE = 26
const TUFT_COUNT = 34
const TUFT_EDGE_BIAS = 1.6
const MUSHROOM_GROUP_SPOTS = [0.58, 0.77, 0.95, 0.12]
const SPOTTED_MUSHROOM_SPOTS = [0.6, 0.79, 0.22]
//
// The level's trampoline mushroom, sleeping by the tree — the big warm
// accent of the ground plane (echoes the menu icon).
//
const CUTE_MUSHROOM_X_FRAC = 0.575
const CUTE_MUSHROOM_W = 76
const CONTACT_SHADOW_RY = 4.5
//
// Live decor spots (fractions of the screen width): stalk eyes watching the
// menu hero, the two ear-trees (short, tall) and the crawler's roaming strip
// on the ground east of the lake.
//
const EYE_SPOT_FRACS = [0.52, 0.735]
const EAR_TREE_SPOTS = [{ xFrac: 0.8, tier: 'short' }, { xFrac: 0.875, tier: 'tall' }]
const CRAWLER_MIN_X_FRAC = 0.5
const CRAWLER_MAX_X_FRAC = 0.98
const FRONT_GRAIN_SEED = 7741
//
// Half-width of the apple tree's trunk zone for the buried decor (thinner
// small decor there, hair-roots only east of it).
//
const BURIED_TREE_CLEAR_HALF = 50

/**
 * Forest menu layout for a screen size: the ground line, the lake span and
 * the spots of the live decor standing on the ground.
 * @param {number} width - Screen width
 * @param {number} height - Screen height
 * @returns {Object} groundY, lake {x1, x2Core, x2, surfaceY}, eyeSpots,
 *   earTreeSpots [{x, tier}], crawler {minX, maxX}
 */
export function forestMenuLayout(width, height) {
  const groundY = Math.round(height * GROUND_Y_FRAC)
  const x1 = Math.round(width * LAKE_X1_FRAC)
  const x2Core = Math.round(width * LAKE_X2_CORE_FRAC)
  return {
    groundY,
    lake: { x1, x2Core, x2: x2Core + Lake.LAKE_SHORE_EXTEND_PX, surfaceY: groundY - LAKE_SURFACE_LIFT },
    eyeSpots: EYE_SPOT_FRACS.map(f => ({ x: Math.round(width * f), groundY })),
    earTreeSpots: EAR_TREE_SPOTS.map(spot => ({ x: Math.round(width * spot.xFrac), tier: spot.tier })),
    crawler: { minX: Math.round(width * CRAWLER_MIN_X_FRAC), maxX: Math.round(width * CRAWLER_MAX_X_FRAC) }
  }
}

/**
 * Paints the forest menu backdrop as baked layers that go under the live
 * lake, back to front: sky, the three parallax rows, then the front scene
 * (framing trees, soil, apple tree, ground dressing). Every piece except the
 * sky is trimmed to its painted area so drawing it never covers empty screen.
 * @param {Object} cfg - Configuration
 * @param {number} cfg.width - Screen width
 * @param {number} cfg.height - Screen height
 * @returns {Array<Object>} Pieces `{ canvas, x, y }`
 */
export function generateForestMenuBackdrop(cfg) {
  const { width, height } = cfg
  const layout = forestMenuLayout(width, height)
  const { groundY } = layout
  const scale = height / REF_HEIGHT
  const skyH = groundY + SKY_GROUND_OVERLAP
  const sky = { canvas: paintSkyCanvas(width, skyH), x: 0, y: 0 }
  const parallax = PARALLAX_ROWS.map(row => {
    const rowCanvas = paintParallaxRow(row, width, groundY + PARALLAX_BOTTOM_PAD, groundY)
    hazeRowOverSky(rowCanvas, row.alpha, skyH)
    const piece = cropToContent(rowCanvas)
    releaseCanvas(rowCanvas)
    return piece
  })
  const front = newCanvas(width, height)
  paintFrontScene(front.getContext('2d', { willReadFrequently: true }), width, height, layout, scale)
  applyForestFilmGrainToCanvas(front, FRONT_GRAIN_SEED)
  const frontPiece = cropToContent(front)
  releaseCanvas(front)
  return [sky, ...parallax, frontPiece].filter(piece => piece.canvas)
}

/**
 * Bakes the lake's tree-side stone pile for a live lake (its bed shape
 * comes from the lake): heaps whose caps stand above the water and whose
 * flanks run into the bed, clipped at the bed and tinted under the water.
 * @param {Object} lake - Lake inst (forest-lake.js)
 * @param {number} height - Screen height (layout scale)
 * @returns {{canvas: HTMLCanvasElement, x: number, y: number}} Canvas at screen x / y
 */
export function bakeForestMenuShorePile(lake, height) {
  const s = height / REF_HEIGHT
  const anchorX = lake.x1 + lake.coreSpan + (lake.bakeSpan - lake.coreSpan) / 2
  const rng = createSeededRandom(SHORE_PILE_SEED)
  const loops = SHORE_PILE_HEAPS.map(heap => shoreHeapLoop(lake, rng, anchorX + heap.dx * s, heap, s))
  const pts = loops.flat()
  const pad = SHORE_PILE_PAD * s
  const x0 = Math.floor(Math.min(...pts.map(p => p.x)) - pad)
  const y0 = Math.floor(Math.min(...pts.map(p => p.y)) - pad)
  const canvas = newCanvas(Math.max(...pts.map(p => p.x)) + pad - x0, Math.max(...pts.map(p => p.y)) + pad - y0)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  const waterY = lake.surfaceY - y0
  ctx.save()
  Lake.clipToBed(ctx, lake, x0, y0, canvas.width, canvas.height)
  paintForestShoreRock(ctx, {
    loops: loops.map(loop => loop.map(p => ({ x: p.x - x0, y: p.y - y0 }))),
    waterY,
    rng,
    outlineWidth: ROCK_OUTLINE_WIDTH
  })
  ctx.restore()
  Lake.tintUnderwater(ctx, canvas.width, canvas.height, waterY)
  applyForestFilmGrainToCanvas(canvas, SHORE_PILE_SEED)
  return { canvas, x: x0, y: y0 }
}
//
// One heap outline: a lumpy cap arc from the water line up and over, then
// the flared foot following the lake bed (a little past it — the bed clip
// trims the overshoot).
//
function shoreHeapLoop(lake, rng, cx, heap, s) {
  const waterY = lake.surfaceY
  const capH = heap.top * s
  const capHalfW = heap.capHalfW * s
  const footHalfW = heap.footHalfW * s
  const loop = []
  for (let i = 0; i <= SHORE_PILE_ARC_STEPS; i++) {
    const a = Math.PI + (i / SHORE_PILE_ARC_STEPS) * Math.PI
    const jitter = 1 + (rng() - 0.5) * 2 * SHORE_PILE_JITTER
    loop.push({ x: cx + Math.cos(a) * capHalfW * jitter, y: waterY + Math.sin(a) * capH * jitter })
  }
  for (let i = 0; i <= SHORE_PILE_FOOT_STEPS; i++) {
    const x = cx + footHalfW - (i / SHORE_PILE_FOOT_STEPS) * footHalfW * 2
    loop.push({ x, y: Lake.bedWorldY(lake, x) + SHORE_PILE_BED_OVERSHOOT * s })
  }
  return loop
}
//
// The front scene from one seeded stream: framing trees, soil band, rocks
// and the ground rim (open over the lake), the apple tree with its roots over
// the soil, then the ground plants and mushrooms over its foot.
//
function paintFrontScene(ctx, width, height, layout, scale) {
  const { groundY, lake } = layout
  const rng = createSeededRandom(LAYOUT_SEED)
  FRAME_TREES.forEach(tree => paintFrameTree(ctx, rng, tree, width, height, groundY))
  paintLayeredEarthBand(ctx, groundEarthLayersColor(), 0, groundY, width, height - groundY)
  paintBuriedDecor(ctx, width, height, layout, scale)
  ROCK_GROUPS.forEach(group => paintRockGroup(ctx, rng, group, width * group.xFrac, groundY, width, scale))
  const rimColors = forestFloorPainterColors().rim
  drawGroundRimToCanvas(ctx, { x1: 0, x2: lake.x1, floorY: groundY, rng, colors: rimColors })
  drawGroundRimToCanvas(ctx, { x1: lake.x2, x2: width, floorY: groundY, rng, colors: rimColors })
  paintAppleTree(ctx, rng, width, height, groundY, scale)
  paintGroundPlants(ctx, rng, width, groundY, lake)
}
//
// The level's buried decor (stones, cracks, pebbles, hair-roots under the
// apple tree side, fossils, shells, bones, coins, bottles, worms) and its
// depth vignette over the soil band.
//
function paintBuriedDecor(ctx, width, height, layout, scale) {
  const spec = buildUndergroundSpec({
    x1: 0,
    x2: width,
    surfaceY: layout.groundY,
    bandH: height - layout.groundY,
    bottomY: height,
    treeX: Math.round(width * APPLE_TREE_X_FRAC),
    treeClearHalf: BURIED_TREE_CLEAR_HALF * scale
  })
  renderUndergroundSpec(ctx, spec, undergroundStaticEarthTones())
  paintUndergroundDepthVignette(ctx, 0, layout.groundY, width, height - layout.groundY)
}
//
// Opaque haze for a parallax row: every painted pixel is mixed toward the
// sky colour at its height by (1 - strength) instead of drawing the row
// semi-transparent, so a nearer row's bushes fully cover the trunks of the
// rows behind (no see-through) while the row still fades into the air.
// Edge pixels keep their own alpha (anti-aliasing).
//
function hazeRowOverSky(canvas, strength, skyH) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = image.data
  for (let y = 0; y < canvas.height; y++) {
    const sky = forestSkyBandRgb(Math.min(1, y / skyH))
    for (let x = 0; x < canvas.width; x++) {
      const i = (y * canvas.width + x) * RGBA_STRIDE
      if (data[i + 3] === 0) continue
      data[i] = Math.round(sky.r + (data[i] - sky.r) * strength)
      data[i + 1] = Math.round(sky.g + (data[i + 1] - sky.g) * strength)
      data[i + 2] = Math.round(sky.b + (data[i + 2] - sky.b) * strength)
    }
  }
  ctx.putImageData(image, 0, 0)
}
//
// Smooth sky gradient through palette-snapped stops of the level's ramp.
//
function paintSkyCanvas(width, height) {
  const canvas = newCanvas(width, height)
  const ctx = canvas.getContext('2d')
  const gradient = ctx.createLinearGradient(0, 0, 0, height)
  for (let i = 0; i < SKY_STOP_COUNT; i++) {
    const t = i / (SKY_STOP_COUNT - 1)
    const c = forestSkyBandRgb(t)
    gradient.addColorStop(t, `rgb(${c.r}, ${c.g}, ${c.b})`)
  }
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)
  return canvas
}
//
// One full-width parallax row: evenly spread trees in the parallax palette,
// plants along their feet, then the row's depth grade (contrast /
// saturation pulled toward the hued haze, little or no grain).
//
function paintParallaxRow(row, width, height, groundY) {
  const canvas = newCanvas(width, height)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  const rng = createSeededRandom(row.seed)
  const haze = forestRgb(FOREST_PAL.forestLift)
  const palette = buildDimmedTreePalette(getTreePaletteParallaxCorner(row.cornerKey), haze, row.haze, true, 0, true)
  const bottomY = groundY + row.sink
  const slot = width / row.count
  for (let i = 0; i < row.count; i++) {
    const x = Math.round(slot * (i + 0.5 + (rng() - 0.5) * PARALLAX_TREE_JITTER))
    const treeH = groundY * (row.heightMin + rng() * row.heightRange) / row.scale
    const treeData = buildForestTree(nextSeed(rng), x, bottomY, Math.round(bottomY - treeH), bottomY, bottomY, FRAME_TREE_BUILD_OPTS)
    paintScaledTree(ctx, treeData, palette, x, bottomY, row.scale, width, height)
  }
  renderBushStrip(ctx, {
    x1: 0,
    x2: width,
    baseY: bottomY,
    heightScale: row.bushScale * height / REF_HEIGHT,
    colorAt: () => forestRgb(FOREST_PAL[row.cornerKey].leaf),
    ferns: row.ferns,
    foliageDensityTier: row.tier
  })
  applyForestLayerGradeToCanvas(canvas, FOREST_LAYER_GRADE[row.grade], PARALLAX_GRAIN_SEED + row.seed)
  return canvas
}
//
// One framing tree: grown at level size and scaled down around its base,
// in the parallax corner palette (left, hazy) or the level's green big-tree
// palette (right).
//
function paintFrameTree(ctx, rng, tree, width, height, groundY) {
  const haze = forestRgb(FOREST_PAL.forestLift)
  const base = tree.green ? getTreePaletteColor() : getTreePaletteParallaxCorner(tree.cornerKey)
  const palette = buildDimmedTreePalette(base, haze, tree.haze, !tree.green, 0, !tree.green)
  const x = Math.round(width * tree.xFrac)
  const treeH = groundY * tree.heightFrac / tree.scale
  const treeData = buildForestTree(nextSeed(rng), x, groundY, Math.round(groundY - treeH), groundY, groundY, FRAME_TREE_BUILD_OPTS)
  paintScaledTree(ctx, treeData, palette, x, groundY, tree.scale, width, height)
}
//
// Trees are grown at level size (the generator's crown spread is tuned for
// it) and scaled down around their base, so the crowns keep their shape.
//
function paintScaledTree(ctx, treeData, palette, x, bottomY, scale, width, height) {
  ctx.save()
  ctx.translate(x, bottomY)
  ctx.scale(scale, scale)
  ctx.translate(-x, -bottomY)
  renderForestTreeIntoContext(ctx, treeData, palette, width / scale, height / scale)
  ctx.restore()
}
//
// The level's main tree (same seed, structured crown, hero branch) in the
// gameplay palette with its wood volume, scaled with the screen around its
// base; its roots spread through the soil and apples hang in the crown.
//
function paintAppleTree(ctx, rng, width, height, groundY, scale) {
  const x = Math.round(width * APPLE_TREE_X_FRAC)
  const treeData = buildForestTree(TREE_SEED, x, groundY, groundY - APPLE_TREE_TRUNK_H, groundY + APPLE_TREE_ROOT_DEPTH, groundY, {
    ...forestTreeBuildOptsForDensity('nearground'),
    heroBranchFrac: APPLE_TREE_HERO_BRANCH_FRAC,
    structuredCrown: true
  })
  const palette = { ...getTreePaletteColor(), woodVolume: getForestGameplayTreeVolumeShades() }
  //
  // In tree space the canvas bottom lies (height - groundY) / scale below the
  // base, so roots taper toward the real bottom edge.
  //
  const treeSpaceH = groundY + (height - groundY) / scale
  ctx.save()
  ctx.translate(x, groundY)
  ctx.scale(scale, scale)
  ctx.translate(-x, -groundY)
  renderForestTreeIntoContext(ctx, treeData, palette, width / scale, treeSpaceH)
  paintApples(ctx, rng, treeData)
  ctx.restore()
}
//
// A few apples under well-separated foliage clusters of the crown (never at
// the very top, where they would read as stuck on the silhouette).
//
function paintApples(ctx, rng, treeData) {
  const clusters = treeData.leaves.filter(leaf => leaf.type === 'cluster')
  if (!clusters.length) return
  const topY = Math.min(...clusters.map(leaf => leaf.y))
  const candidates = clusters.filter(leaf => leaf.y > topY + APPLE_MIN_DEPTH_BELOW_TOP)
  const picked = []
  for (let tries = 0; tries < candidates.length && picked.length < APPLE_COUNT; tries++) {
    const leaf = candidates[Math.floor(rng() * candidates.length)]
    picked.every(p => Math.hypot(p.x - leaf.x, p.y - leaf.y) > APPLE_MIN_GAP) && picked.push(leaf)
  }
  const pal = FOREST_PAL.forestTreeFruit
  picked.forEach(leaf => paintApple(ctx, leaf.x, leaf.y + APPLE_HANG, rng() < 0.5 ? pal.body : pal.light, pal))
}
//
// One apple: stem, body with its contour, the shaded lower-right part and a
// small lit spot on the upper left (sun from the left).
//
function paintApple(ctx, x, y, body, pal) {
  const r = APPLE_RADIUS
  ctx.strokeStyle = FOREST_PAL.treeColor.root
  ctx.lineWidth = APPLE_STEM_W
  ctx.beginPath()
  ctx.moveTo(x, y - r)
  ctx.lineTo(x + 1, y - r - APPLE_STEM_LEN)
  ctx.stroke()
  ctx.fillStyle = body
  ctx.strokeStyle = pal.contour
  ctx.lineWidth = APPLE_CONTOUR_W
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.save()
  ctx.clip()
  ctx.globalAlpha = APPLE_SHADE_ALPHA
  ctx.fillStyle = pal.shade
  ctx.beginPath()
  ctx.arc(x + r * APPLE_SHADE_OFFSET, y + r * APPLE_SHADE_OFFSET, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = APPLE_HIGHLIGHT_ALPHA
  ctx.fillStyle = pal.light
  ctx.beginPath()
  ctx.arc(x + r * APPLE_HIGHLIGHT_OFFSET, y + r * APPLE_HIGHLIGHT_OFFSET, r * APPLE_HIGHLIGHT_R, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.stroke()
}
//
// A small pile of shaded forest rocks around one spot.
//
function paintRockGroup(ctx, rng, group, cx, groundY, width, scale) {
  for (let i = 0; i < group.count; i++) {
    const x = cx + (rng() - 0.5) * group.spread * scale
    const radius = (group.radiusMin + rng() * group.radiusRange) * scale
    paintRock(ctx, x, groundY, width, radius, ROCK_WIDTH_SCALE_MIN + rng() * ROCK_WIDTH_SCALE_RANGE)
  }
}
//
// Textured shaded forest rock (as the level paints its scatter), stretched
// by widthScale and seated in the soil: only its part above the ground line
// is drawn, the soil cuts it flat.
//
function paintRock(ctx, x, groundY, width, radius, widthScale) {
  const contour = forestContourRgb('forest')
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, width, groundY)
  ctx.clip()
  ctx.translate(x, 0)
  ctx.scale(widthScale, 1)
  drawRockToCanvas(ctx, {
    cx: 0,
    cy: groundY - radius * ROCK_CENTER_ABOVE_GROUND,
    radius,
    verts: buildRockVertices(radius),
    palette: forestRockShadedDrawPalette(),
    skipShadow: true,
    skipTexture: false,
    outlineColor: `rgb(${contour.r}, ${contour.g}, ${contour.b})`,
    outlineWidth: ROCK_OUTLINE_WIDTH,
    outlineAlpha: 1
  })
  ctx.restore()
}
//
// Ferns, mushroom groups, spotted mushrooms and the sleeping trampoline
// mushroom at their spots, then straw tufts thickening toward the edges;
// nothing grows on the lake.
//
function paintGroundPlants(ctx, rng, width, groundY, lake) {
  const colors = forestFloorPainterColors()
  const shadow = forestContactShadowRgb()
  const onLake = x => x > lake.x1 && x < lake.x2
  FERN_SPOTS.forEach(f => {
    const x = width * f
    const size = FERN_SIZE_MIN + rng() * FERN_SIZE_RANGE
    paintForestContactShadow(ctx, x, groundY, size * 0.42, CONTACT_SHADOW_RY, shadow)
    drawFernToCanvas(ctx, { x, baseY: groundY, size, rng, colors: colors.fern })
  })
  paintCuteMushroom(ctx, width * CUTE_MUSHROOM_X_FRAC, groundY, shadow)
  MUSHROOM_GROUP_SPOTS.forEach(f => drawSmallMushroomGroupToCanvas(ctx, {
    x: width * f,
    baseY: groundY,
    rng,
    colors: { ...colors.mushroom, contactShadow: shadow }
  }))
  SPOTTED_MUSHROOM_SPOTS.forEach(f => drawSpottedMushroomToCanvas(ctx, { x: width * f, baseY: groundY, colors: colors.spotted }))
  const tuftColors = {
    grass: FOREST_PAL.forestFloor.rimDry,
    dry: FOREST_PAL.forestFloor.grassDry,
    contactShadow: shadow
  }
  for (let i = 0; i < TUFT_COUNT; i++) {
    const t = Math.pow(rng(), TUFT_EDGE_BIAS) * 0.5
    const x = (i % 2 === 0 ? t : 1 - t) * width
    onLake(x) || drawGrassTuftToCanvas(ctx, { x, baseY: groundY, rng, colors: tuftColors })
  }
}
//
// The level's trampoline mushroom with its face, eyes closed (asleep).
//
function paintCuteMushroom(ctx, x, groundY, shadow) {
  paintForestContactShadow(ctx, x, groundY, CUTE_MUSHROOM_W * 0.45, CONTACT_SHADOW_RY, shadow)
  drawCuteMushroomToCanvas(ctx, {
    cx: x,
    baseY: groundY,
    width: CUTE_MUSHROOM_W,
    colors: FOREST_PAL.cuteMushroomMenu,
    withFace: true,
    eyesOpen: false,
    eyeScale: TRAMP_FACE_EYE_SCALE,
    simpleShade: true
  })
}
//
// Copy of the painted pixels of a canvas trimmed to their alpha bounding
// box — one pixel read per bake. Null canvas when nothing is there.
//
function cropToContent(canvas) {
  const data = canvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, canvas.width, canvas.height).data
  let minX = canvas.width
  let minY = canvas.height
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      if (data[(y * canvas.width + x) * RGBA_STRIDE + 3] === 0) continue
      x < minX && (minX = x)
      x > maxX && (maxX = x)
      y < minY && (minY = y)
      y > maxY && (maxY = y)
    }
  }
  if (maxX < 0) return { canvas: null, x: 0, y: 0 }
  const out = newCanvas(maxX - minX + 1, maxY - minY + 1)
  out.getContext('2d').drawImage(canvas, minX, minY, out.width, out.height, 0, 0, out.width, out.height)
  return { canvas: out, x: minX, y: minY }
}
function newCanvas(width, height) {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width))
  canvas.height = Math.max(1, Math.round(height))
  return canvas
}
function releaseCanvas(canvas) {
  canvas.width = 0
  canvas.height = 0
}
