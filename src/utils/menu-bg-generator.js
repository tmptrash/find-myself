//
// Procedural background for the `ready` and `menu` scenes. Replaces the
// hand-painted `menu.png` asset: at preload time the game composes a
// single off-screen canvas using the same drawing primitives the gameplay
// levels use (L1-style trees + roots, L0 mushrooms / rocks / clouds /
// grass, L3 moon) and registers the canvas as the `menu-bg` kaplay
// sprite.
//
// Composition philosophy:
//   - Complementary teal+orange palette. Cool teal sky + soil hold the
//     cool half; warm amber moon, fireflies, grass tufts, mushroom caps
//     and underground roots hold the warm half.
//   - Layered side trees: a far/back layer of small cool-tinted
//     silhouettes sits behind a near/front layer of taller near-black
//     silhouettes. Both clusters frame the empty central UI zone.
//   - Each front-layer tree owns its own underground roots, generated
//     with the touch L1 root algorithm (`grow-tree-root.js`). A small
//     lateral angle bias is applied per segment so the roots start as
//     a straight continuation of the trunk and gradually curl toward
//     the centre of the canvas as they descend.
//   - Centre stays clean: trees, rocks and mushrooms are excluded from
//     the central UI zone so the logo / hero illustration / hints have
//     visual negative space.
//
import { CFG } from '../cfg.js'
import * as OrganicParallax from '../sections/touch/utils/organic-parallax-tree.js'
import { drawMushroomToCanvas } from './draw-mushroom.js'
import { buildRockVertices, buildRockPalette, drawRockToCanvas } from './draw-rock.js'
import { buildCloudCrown, drawCloudCrownToCanvas } from './draw-cloud-crown.js'
import { buildGrassBladeData, drawGrassBladeToCanvas } from './draw-grass-blade.js'
import { drawMoonToCanvas } from './draw-moon.js'
import { growTreeRootSegments, drawTreeRootSegmentsToCanvas } from './grow-tree-root.js'
//
// Canvas matches the kaplay logical viewport so the sprite needs no
// stretching when drawn full-screen.
//
const CANVAS_W = CFG.visual.screen.width
const CANVAS_H = CFG.visual.screen.height
//
// Ground line — matches the proportion of the legacy menu.png (black
// horizon at ≈ 66% from the top). Sky lives above, soil below.
//
const GROUND_Y = Math.round(CANVAS_H * 0.66)
const HORIZON_LINE_HEIGHT = 6
//
// Cool teal sky + dark teal underground anchor the cool half of the
// complementary palette. Warm accents (moon, fireflies, grass, mushroom
// caps, roots) provide the opposing colour temperature.
//
const SKY_FILL_R = 28
const SKY_FILL_G = 42
const SKY_FILL_B = 48
const UNDERGROUND_FILL_R = 14
const UNDERGROUND_FILL_G = 22
const UNDERGROUND_FILL_B = 26
const HORIZON_LINE_R = 0
const HORIZON_LINE_G = 0
const HORIZON_LINE_B = 0
//
// Central UI keep-out zone (half-width). Trees never spawn inside it
// and rocks / mushrooms are excluded from it too. Measured from the
// canvas horizontal centre.
//
const CENTER_KEEPOUT_HALF = Math.round(CANVAS_W * 0.18)
const CENTER_X = Math.round(CANVAS_W / 2)
//
// Side tree clusters. Trees frame the composition on the far left and
// far right; heights taper toward the centre forming a gentle V that
// opens up the sky for the on-screen UI.
//
const SIDE_CLUSTER_WIDTH = 360
const SIDE_CLUSTER_MARGIN = 20
//
// Front layer — taller, fewer, near-black silhouettes with subtle
// warm leaf accents. Each tree extends into the underground band as
// a network of roots.
//
const FRONT_TREE_COUNT = 5
const FRONT_TREE_TRUNK_HEIGHT_OUTER = 240
const FRONT_TREE_TRUNK_HEIGHT_INNER = 110
const FRONT_TREE_TRUNK_HEIGHT_JITTER = 36
const FRONT_TREE_OPACITY_MIN = 0.92
const FRONT_TREE_OPACITY_RANGE = 0.06
const FRONT_TREE_TRUNK_R = 8
const FRONT_TREE_TRUNK_G = 12
const FRONT_TREE_TRUNK_B = 14
const FRONT_TREE_LEAF_R = 22
const FRONT_TREE_LEAF_G = 16
const FRONT_TREE_LEAF_B = 18
//
// Back layer — shorter, more numerous, cool teal-tinted silhouettes.
// Sits behind the front layer and stays above ground (no roots) so
// the underground belongs visually to the front layer alone.
//
const BACK_TREE_COUNT = 8
const BACK_TREE_TRUNK_HEIGHT_OUTER = 160
const BACK_TREE_TRUNK_HEIGHT_INNER = 90
const BACK_TREE_TRUNK_HEIGHT_JITTER = 30
const BACK_TREE_OPACITY = 0.55
const BACK_TREE_TRUNK_R = 40
const BACK_TREE_TRUNK_G = 64
const BACK_TREE_TRUNK_B = 76
const BACK_TREE_LEAF_R = 56
const BACK_TREE_LEAF_G = 86
const BACK_TREE_LEAF_B = 98
//
// Underground roots (L1 style). Each front-layer tree generates
// `ROOTS_PER_TREE` primary roots; each root is grown by
// `growTreeRootSegments` from `grow-tree-root.js`.
//
// `ROOT_LATERAL_BIAS` is a small constant angular delta added per
// segment. Sign depends on side: left-side trees get a negative bias
// (pulls root toward angle 0 = right = centre); right-side trees get
// a positive bias (pulls toward angle PI = left = centre). The bias
// is small enough that the first few segments still read as a straight
// continuation of the trunk, while accumulated curl over many segments
// produces a visible bend toward the centre lower in the soil.
//
const ROOTS_PER_TREE_MIN = 2
const ROOTS_PER_TREE_RANGE = 2
const ROOT_INITIAL_SEGMENTS_MIN = 7
const ROOT_INITIAL_SEGMENTS_RANGE = 5
const ROOT_INITIAL_THICKNESS_MIN = 4
const ROOT_INITIAL_THICKNESS_RANGE = 2
const ROOT_INITIAL_ANGLE_SPREAD = 0.45
const ROOT_LATERAL_BIAS = 0.038
const ROOT_COLOR = 'rgba(150, 84, 42, 0.92)'
//
// Mushrooms — small caps studding the soil. Palette mirrors the L0
// teal+orange complementary set so the menu reads as the same world.
//
const MUSHROOM_COUNT = 9
const MUSHROOM_CAP_WIDTH_MIN = 18
const MUSHROOM_CAP_WIDTH_MAX = 34
const MUSHROOM_STEM_HEIGHT_MIN = 14
const MUSHROOM_STEM_HEIGHT_MAX = 26
const MUSHROOM_EDGE_MARGIN = 140
const MUSHROOM_CAP_COLORS = [
  [220, 110, 40],
  [200, 80, 30],
  [240, 180, 70],
  [180, 130, 60],
  [90, 136, 152],
  [60, 100, 120]
]
//
// Rocks — boulders along the soil line. Same shape + palette as the L0
// floor rocks (silhouette + gradient + blotches + sheen).
//
const ROCK_COUNT = 6
const ROCK_RADIUS_MIN = 30
const ROCK_RADIUS_MAX = 56
const ROCK_LIFT_FROM_FLOOR = 3
const ROCK_EDGE_MARGIN = 220
//
// Grass — drawn in TUFTS rather than a continuous band. Each tuft is a
// dense cluster of short blades; tufts are scattered along the soil
// with random gaps so the grass reads as patches growing where the
// soil allows. Blades are shorter than the L0 default so the grass
// stays low against the horizon line.
//
const GRASS_TUFT_COUNT = 36
const GRASS_TUFT_BLADES_MIN = 10
const GRASS_TUFT_BLADES_RANGE = 14
const GRASS_TUFT_WIDTH_MIN = 18
const GRASS_TUFT_WIDTH_RANGE = 22
const GRASS_TUFT_LEFT_INSET = 30
const GRASS_TUFT_RIGHT_INSET = 30
const GRASS_BLADE_SCALE_MIN = 0.45
const GRASS_BLADE_SCALE_RANGE = 0.3
const GRASS_BASE_R = 200
const GRASS_BASE_G = 156
const GRASS_BASE_B = 64
const GRASS_OPACITY = 0.92
//
// Background fireflies — static warm-amber sparkle baked into the
// image. The ready scene adds a second, ANIMATED layer of blinking
// stars on top of this baked image (see ready.js).
//
const FIREFLY_COUNT = 10
const FIREFLY_COLOR_R = 244
const FIREFLY_COLOR_G = 192
const FIREFLY_COLOR_B = 64
const FIREFLY_RADIUS_MIN = 2
const FIREFLY_RADIUS_RANGE = 2
const FIREFLY_ALPHA_MIN = 0.4
const FIREFLY_ALPHA_RANGE = 0.35
//
// Cloud band — denser puffs styled after the L0 cloud strip (same
// teal-tinted base colour). Drawn statically (no scroll-wrap) since
// the menu-bg is a single bake.
//
const CLOUD_COUNT = 18
const CLOUD_TOP_Y = -10
const CLOUD_BOTTOM_Y = 110
const CLOUD_COLOR = { r: 32, g: 60, b: 68 }
const CLOUD_OPACITY_SCALE = 0.95
//
// Moon — uses the shared L3 moon primitive (`draw-moon.js`) so the
// celestial body is visually identical to the touch L3 night-sky moon.
//
const MOON_CENTER_X = CANVAS_W - 220
const MOON_CENTER_Y = 220
const MOON_RADIUS = 72
const MOON_GLOW_RADIUS = 42
const MOON_HALO_KEEPOUT = MOON_RADIUS + MOON_GLOW_RADIUS
//
// pickXAvoiding retry budget — generous so the placement loop has a
// real chance to find a slot inside the constrained left/right bands.
//
const PLACEMENT_MAX_ATTEMPTS = 80

/**
 * Generates the procedural ready/menu background image and returns the
 * canvas. Caller is expected to pass the canvas straight to
 * `k.loadSprite(name, canvas)`.
 *
 * @returns {HTMLCanvasElement}
 */
export function generateMenuBackgroundCanvas() {
  const canvas = document.createElement('canvas')
  canvas.width = CANVAS_W
  canvas.height = CANVAS_H
  const ctx = canvas.getContext('2d')
  //
  // Build tree clusters up-front so above-ground and underground
  // passes can render different parts of the same tree.
  //
  const backTrees = [
    ...buildSideCluster({
      isRightSide: false,
      clusterLeftX: SIDE_CLUSTER_MARGIN,
      clusterWidth: SIDE_CLUSTER_WIDTH,
      count: BACK_TREE_COUNT,
      heightOuter: BACK_TREE_TRUNK_HEIGHT_OUTER,
      heightInner: BACK_TREE_TRUNK_HEIGHT_INNER,
      heightJitter: BACK_TREE_TRUNK_HEIGHT_JITTER,
      opacity: BACK_TREE_OPACITY,
      trunkColor: { r: BACK_TREE_TRUNK_R, g: BACK_TREE_TRUNK_G, b: BACK_TREE_TRUNK_B },
      leafColor: { r: BACK_TREE_LEAF_R, g: BACK_TREE_LEAF_G, b: BACK_TREE_LEAF_B }
    }),
    ...buildSideCluster({
      isRightSide: true,
      clusterLeftX: CANVAS_W - SIDE_CLUSTER_MARGIN - SIDE_CLUSTER_WIDTH,
      clusterWidth: SIDE_CLUSTER_WIDTH,
      count: BACK_TREE_COUNT,
      heightOuter: BACK_TREE_TRUNK_HEIGHT_OUTER,
      heightInner: BACK_TREE_TRUNK_HEIGHT_INNER,
      heightJitter: BACK_TREE_TRUNK_HEIGHT_JITTER,
      opacity: BACK_TREE_OPACITY,
      trunkColor: { r: BACK_TREE_TRUNK_R, g: BACK_TREE_TRUNK_G, b: BACK_TREE_TRUNK_B },
      leafColor: { r: BACK_TREE_LEAF_R, g: BACK_TREE_LEAF_G, b: BACK_TREE_LEAF_B }
    })
  ]
  const frontTrees = [
    ...buildSideCluster({
      isRightSide: false,
      clusterLeftX: SIDE_CLUSTER_MARGIN + 40,
      clusterWidth: SIDE_CLUSTER_WIDTH - 80,
      count: FRONT_TREE_COUNT,
      heightOuter: FRONT_TREE_TRUNK_HEIGHT_OUTER,
      heightInner: FRONT_TREE_TRUNK_HEIGHT_INNER,
      heightJitter: FRONT_TREE_TRUNK_HEIGHT_JITTER,
      opacityRange: FRONT_TREE_OPACITY_RANGE,
      opacity: FRONT_TREE_OPACITY_MIN,
      trunkColor: { r: FRONT_TREE_TRUNK_R, g: FRONT_TREE_TRUNK_G, b: FRONT_TREE_TRUNK_B },
      leafColor: { r: FRONT_TREE_LEAF_R, g: FRONT_TREE_LEAF_G, b: FRONT_TREE_LEAF_B }
    }),
    ...buildSideCluster({
      isRightSide: true,
      clusterLeftX: CANVAS_W - SIDE_CLUSTER_MARGIN - SIDE_CLUSTER_WIDTH + 40,
      clusterWidth: SIDE_CLUSTER_WIDTH - 80,
      count: FRONT_TREE_COUNT,
      heightOuter: FRONT_TREE_TRUNK_HEIGHT_OUTER,
      heightInner: FRONT_TREE_TRUNK_HEIGHT_INNER,
      heightJitter: FRONT_TREE_TRUNK_HEIGHT_JITTER,
      opacityRange: FRONT_TREE_OPACITY_RANGE,
      opacity: FRONT_TREE_OPACITY_MIN,
      trunkColor: { r: FRONT_TREE_TRUNK_R, g: FRONT_TREE_TRUNK_G, b: FRONT_TREE_TRUNK_B },
      leafColor: { r: FRONT_TREE_LEAF_R, g: FRONT_TREE_LEAF_G, b: FRONT_TREE_LEAF_B }
    })
  ]
  //
  // Front-layer trees also get an L1-style root system that extends
  // below the ground line. The lateral bias is signed so each side's
  // roots curl inward toward the canvas centre.
  //
  for (const tree of frontTrees) {
    tree.rootSegmentsL1 = buildL1RootSystem(tree)
  }
  //
  // Composition order matters: sky/clouds/moon/stars go down first;
  // back tree silhouettes overlay the sky; soil paints over the
  // sky-coloured pixels below ground; front trees overlay; ground
  // detail (grass/rocks/mushrooms) layers on top of soil; the black
  // horizon strip caps the soil edge; and finally the front-tree
  // roots are stroked across the underground band.
  //
  drawSky(ctx)
  drawClouds(ctx)
  drawMoon(ctx)
  drawFireflies(ctx)
  drawTreeLayer(ctx, backTrees)
  drawSoilFill(ctx)
  drawTreeLayer(ctx, frontTrees)
  drawGrass(ctx)
  drawRocks(ctx)
  drawMushrooms(ctx)
  drawBlackHorizonLine(ctx)
  drawFrontTreeRoots(ctx, frontTrees)
  return canvas
}

function drawSky(ctx) {
  //
  // Solid teal sky across the entire canvas. The underground band gets
  // repainted on top of the lower portion further down in the pipeline.
  //
  ctx.fillStyle = `rgb(${SKY_FILL_R}, ${SKY_FILL_G}, ${SKY_FILL_B})`
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
}

function drawSoilFill(ctx) {
  //
  // Underground band painted AFTER back trees (so the back-tree
  // silhouettes only show above ground) but BEFORE front trees (so
  // the front trunks visually sit on the soil edge).
  //
  ctx.fillStyle = `rgb(${UNDERGROUND_FILL_R}, ${UNDERGROUND_FILL_G}, ${UNDERGROUND_FILL_B})`
  ctx.fillRect(0, GROUND_Y, CANVAS_W, CANVAS_H - GROUND_Y)
}

function drawBlackHorizonLine(ctx) {
  //
  // Thin black strip on the ground line — kept in the same Y position
  // as the legacy menu.png so the composition reads identically.
  //
  ctx.fillStyle = `rgb(${HORIZON_LINE_R}, ${HORIZON_LINE_G}, ${HORIZON_LINE_B})`
  ctx.fillRect(0, GROUND_Y, CANVAS_W, HORIZON_LINE_HEIGHT)
}

function drawClouds(ctx) {
  //
  // L0-style cloud puffs: teal-tinted base colour, denser packing than
  // the previous wispy version. Each cloud uses the shared
  // `draw-cloud-crown` primitive (the same L0 uses for its scrolling
  // band) so the puffs feel identical to the in-game clouds.
  //
  const cloudConfigs = []
  const cloudSpacing = CANVAS_W / CLOUD_COUNT
  for (let i = 0; i < CLOUD_COUNT; i++) {
    const x = cloudSpacing * i + cloudSpacing * 0.5 + (Math.random() - 0.5) * 40
    const y = CLOUD_TOP_Y + Math.random() * (CLOUD_BOTTOM_Y - CLOUD_TOP_Y)
    cloudConfigs.push(buildCloudCrown({ x, y }))
  }
  for (const cloud of cloudConfigs) {
    drawCloudCrownToCanvas(ctx, cloud, CLOUD_COLOR, { opacityScale: CLOUD_OPACITY_SCALE })
  }
}

function drawMoon(ctx) {
  //
  // Delegates to the shared L3 moon primitive so the menu/ready moon
  // is visually identical to the touch L3 night-sky moon.
  //
  drawMoonToCanvas(ctx, {
    cx: MOON_CENTER_X,
    cy: MOON_CENTER_Y,
    radius: MOON_RADIUS,
    glowRadius: MOON_GLOW_RADIUS
  })
}

function drawFireflies(ctx) {
  //
  // Warm-amber dots scattered through the upper sky — keeps the warm
  // half of the complementary palette present even in the centre where
  // there are no trees. Avoids overlapping the moon halo so the moon
  // stays the dominant warm element.
  //
  for (let i = 0; i < FIREFLY_COUNT; i++) {
    let x, y
    let tries = 0
    do {
      x = 80 + Math.random() * (CANVAS_W - 160)
      y = 40 + Math.random() * (GROUND_Y - 180)
      tries++
    } while (tries < 12 && Math.hypot(x - MOON_CENTER_X, y - MOON_CENTER_Y) < MOON_HALO_KEEPOUT * 0.9)
    const r = FIREFLY_RADIUS_MIN + Math.random() * FIREFLY_RADIUS_RANGE
    const alpha = FIREFLY_ALPHA_MIN + Math.random() * FIREFLY_ALPHA_RANGE
    ctx.fillStyle = `rgba(${FIREFLY_COLOR_R}, ${FIREFLY_COLOR_G}, ${FIREFLY_COLOR_B}, ${alpha})`
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
}
//
// Builds the trunk + branch silhouette data for every tree of a
// cluster. The cluster spans `clusterWidth` starting at `clusterLeftX`;
// trees are evenly distributed inside the span with a small per-tree
// X jitter. Height tapers toward the centre (V-shape) using
// `clusterRatio` (0 = outer edge, 1 = inner edge).
//
function buildSideCluster(opts) {
  const {
    isRightSide,
    clusterLeftX,
    clusterWidth,
    count,
    heightOuter,
    heightInner,
    heightJitter,
    opacity,
    opacityRange = 0,
    trunkColor,
    leafColor
  } = opts
  const trees = []
  for (let i = 0; i < count; i++) {
    const tInsideCluster = i / Math.max(1, count - 1)
    //
    // Flip cluster ratio direction on the right side so the height
    // taper points inward (toward the canvas centre) on both clusters.
    //
    const clusterRatio = isRightSide ? (1 - tInsideCluster) : tInsideCluster
    const baseX = clusterLeftX + tInsideCluster * clusterWidth + (Math.random() - 0.5) * 18
    const treeHeight =
      heightOuter * (1 - clusterRatio)
      + heightInner * clusterRatio
      + (Math.random() - 0.5) * heightJitter
    const trunkBottom = GROUND_Y - 2 + (Math.random() - 0.3) * 10
    const trunkTop = trunkBottom - treeHeight
    const treeOpacity = opacity + Math.random() * opacityRange
    const organic = OrganicParallax.buildOrganicTreeData(trunkBottom, trunkTop, { includeRoots: false })
    //
    // Override every leaf colour with the layer's leaf palette so the
    // organic generator's default warm autumn leaves don't leak into a
    // pure-silhouette layer.
    //
    for (const cluster of organic.branchClusters) {
      for (const leaf of cluster.leaves) {
        leaf.r = leafColor.r
        leaf.g = leafColor.g
        leaf.b = leafColor.b
      }
    }
    trees.push({
      x: baseX,
      trunkBottom,
      isRightSide,
      opacity: treeOpacity,
      trunkColor,
      leafColor,
      rootColor: trunkColor,
      trunkSegments: organic.trunkSegments,
      rootSegments: organic.rootSegments,
      branchClusters: organic.branchClusters
    })
  }
  //
  // Back-to-front sort by trunkBottom so closer trees overlap correctly.
  //
  trees.sort((a, b) => a.trunkBottom - b.trunkBottom)
  return trees
}
//
// Renders an array of tree descriptors (silhouettes only — trunk +
// branches + leaves) onto the canvas. Roots are intentionally skipped
// here; front-layer roots are drawn separately so they sit on top of
// the soil + horizon line in the underground band.
//
function drawTreeLayer(ctx, trees) {
  for (const tree of trees) {
    OrganicParallax.drawOrganicTreeToCanvas(ctx, { ...tree, rootSegments: [] }, 0)
  }
}
//
// Generates the L1-style root system for a single front-layer tree.
// Each tree anchors its roots at its own X position (so the roots
// visually continue the trunk). The lateral bias signs select inward
// curl: negative for left-side trees (curl right toward angle 0),
// positive for right-side trees (curl left toward angle PI).
//
function buildL1RootSystem(tree) {
  const lateralBias = tree.isRightSide ? ROOT_LATERAL_BIAS : -ROOT_LATERAL_BIAS
  const rootsCount = ROOTS_PER_TREE_MIN + Math.floor(Math.random() * ROOTS_PER_TREE_RANGE)
  const out = []
  for (let r = 0; r < rootsCount; r++) {
    //
    // Initial angle ≈ Math.PI / 2 (straight down) with a small random
    // jitter so multiple roots from the same anchor fan out slightly
    // rather than overlap perfectly.
    //
    const angle = Math.PI / 2 + (Math.random() - 0.5) * ROOT_INITIAL_ANGLE_SPREAD
    const segments = ROOT_INITIAL_SEGMENTS_MIN + Math.floor(Math.random() * ROOT_INITIAL_SEGMENTS_RANGE)
    const thickness = ROOT_INITIAL_THICKNESS_MIN + Math.random() * ROOT_INITIAL_THICKNESS_RANGE
    out.push(...growTreeRootSegments({
      x: tree.x,
      y: GROUND_Y + 2,
      angle,
      segments,
      thickness,
      lateralBiasPerSegment: lateralBias
    }))
  }
  return out
}
//
// Strokes the underground roots for every front-layer tree on top of
// the soil fill + horizon strip. Segments below the canvas bottom are
// implicitly clipped by the canvas.
//
function drawFrontTreeRoots(ctx, frontTrees) {
  for (const tree of frontTrees) {
    drawTreeRootSegmentsToCanvas(ctx, tree.rootSegmentsL1, ROOT_COLOR)
  }
}

function drawGrass(ctx) {
  //
  // Grass grows in tufts — clusters of dense, SHORT blades inside a
  // narrow X span, with random gaps between tufts. Inside a tuft, blade
  // base X is loosely triangular-distributed around the tuft centre so
  // blades stack densely in the middle and feather out at the edges.
  //
  const grassY = GROUND_Y - 2
  const usableLeft = GRASS_TUFT_LEFT_INSET
  const usableRight = CANVAS_W - GRASS_TUFT_RIGHT_INSET
  for (let t = 0; t < GRASS_TUFT_COUNT; t++) {
    const tuftCenter = usableLeft + Math.random() * (usableRight - usableLeft)
    const tuftWidth = GRASS_TUFT_WIDTH_MIN + Math.random() * GRASS_TUFT_WIDTH_RANGE
    const bladeCount = GRASS_TUFT_BLADES_MIN + Math.floor(Math.random() * GRASS_TUFT_BLADES_RANGE)
    const tuftBlades = []
    for (let b = 0; b < bladeCount; b++) {
      //
      // Two random samples averaged ≈ triangular distribution: blades
      // densest near tuft centre, sparser at edges.
      //
      const offsetT = (Math.random() + Math.random() - 1) * 0.5
      const baseX = tuftCenter + offsetT * tuftWidth
      tuftBlades.push(buildGrassBladeData({
        baseX,
        grassY,
        scale: GRASS_BLADE_SCALE_MIN + Math.random() * GRASS_BLADE_SCALE_RANGE,
        baseOpacity: GRASS_OPACITY,
        baseR: GRASS_BASE_R,
        baseG: GRASS_BASE_G,
        baseB: GRASS_BASE_B
      }))
    }
    //
    // Draw shorter blades first, taller last so tall blades sit on top
    // of the cluster instead of being half-hidden.
    //
    tuftBlades.sort((a, b) => a.height - b.height)
    for (const blade of tuftBlades) drawGrassBladeToCanvas(ctx, blade, 0)
  }
}

function drawRocks(ctx) {
  //
  // Boulders studding the soil line on the OUTER halves only — the
  // central UI zone stays clear so the on-screen logo + hint live in
  // visual negative space.
  //
  const reserved = []
  for (let i = 0; i < ROCK_COUNT; i++) {
    const radius = ROCK_RADIUS_MIN + Math.random() * (ROCK_RADIUS_MAX - ROCK_RADIUS_MIN)
    const totalH = Math.ceil(radius * 1.9)
    const posX = pickXAvoidingCentre(reserved, ROCK_EDGE_MARGIN, radius * 1.6)
    if (posX == null) continue
    reserved.push({ x: posX, halfWidth: radius * 1.6 })
    const verts = buildRockVertices(radius)
    const palette = buildRockPalette()
    const cy = totalH * 0.56
    const canvasY = GROUND_Y - cy * 0.45 - ROCK_LIFT_FROM_FLOOR + Math.random() * 6
    ctx.save()
    ctx.translate(posX, canvasY)
    drawRockToCanvas(ctx, { cx: 0, cy: 0, radius, verts, palette })
    ctx.restore()
  }
}

function drawMushrooms(ctx) {
  //
  // Same OUTER-halves-only constraint as the rocks. Cap colour rotates
  // through the L0 teal+orange palette so the cluster has visual
  // variety without leaving the touch identity colour family.
  //
  const reserved = []
  for (let i = 0; i < MUSHROOM_COUNT; i++) {
    const capW = MUSHROOM_CAP_WIDTH_MIN + Math.random() * (MUSHROOM_CAP_WIDTH_MAX - MUSHROOM_CAP_WIDTH_MIN)
    const capH = capW * (0.4 + Math.random() * 0.3)
    const stemH = MUSHROOM_STEM_HEIGHT_MIN + Math.random() * (MUSHROOM_STEM_HEIGHT_MAX - MUSHROOM_STEM_HEIGHT_MIN)
    const stemW = capW * (0.25 + Math.random() * 0.15)
    const posX = pickXAvoidingCentre(reserved, MUSHROOM_EDGE_MARGIN, capW * 0.9)
    if (posX == null) continue
    reserved.push({ x: posX, halfWidth: capW * 0.9 })
    const capColor = MUSHROOM_CAP_COLORS[Math.floor(Math.random() * MUSHROOM_CAP_COLORS.length)]
    drawMushroomToCanvas(ctx, {
      cx: posX,
      baseY: GROUND_Y - 2,
      capWidth: capW,
      capHeight: capH,
      stemWidth: stemW,
      stemHeight: stemH,
      capColor
    })
  }
}
//
// Picks a horizontal X that lives OUTSIDE the central UI keep-out zone
// (one of two bands: left = [edgeMargin, centre-keepout], right =
// [centre+keepout, W-edgeMargin]) and that doesn't overlap any already-
// reserved span by less than `minGap`. Returns null after
// PLACEMENT_MAX_ATTEMPTS unsuccessful tries so the caller can skip
// placing that element rather than crowd the soil line.
//
function pickXAvoidingCentre(reserved, edgeMargin, minGap) {
  const leftMin = edgeMargin
  const leftMax = CENTER_X - CENTER_KEEPOUT_HALF
  const rightMin = CENTER_X + CENTER_KEEPOUT_HALF
  const rightMax = CANVAS_W - edgeMargin
  const leftSpan = Math.max(0, leftMax - leftMin)
  const rightSpan = Math.max(0, rightMax - rightMin)
  const totalSpan = leftSpan + rightSpan
  if (totalSpan <= 0) return null
  for (let attempt = 0; attempt < PLACEMENT_MAX_ATTEMPTS; attempt++) {
    //
    // Weighted pick between left and right bands so wider bands get
    // proportionally more candidates.
    //
    const pickLeft = Math.random() * totalSpan < leftSpan
    const candidate = pickLeft
      ? leftMin + Math.random() * leftSpan
      : rightMin + Math.random() * rightSpan
    let ok = true
    for (const r of reserved) {
      if (Math.abs(candidate - r.x) < minGap + r.halfWidth) {
        ok = false
        break
      }
    }
    if (ok) return candidate
  }
  return null
}
