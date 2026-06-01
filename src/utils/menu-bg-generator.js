//
// Procedural background for the `ready` and `menu` scenes. Replaces the
// hand-painted `menu.png` asset: at preload time the game composes a
// single off-screen canvas using the same drawing primitives the gameplay
// levels use (L1-style trees + roots, L0 mushrooms / rocks / clouds /
// grass, L3 moon) and registers the canvas as the `menu-bg` kaplay
// sprite.
//
// Composition philosophy:
//   - Sky + underground use the exact `ready` scene backdrop colour
//     (`#1A2530`) so the baked image bleeds seamlessly into the page
//     chrome — no visible top/bottom strips when the canvas is drawn
//     at any opacity over the matching backdrop rect.
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
//   - Mushrooms grow FROM the black horizon strip — their stems are
//     buried in the strip so they read as emerging from the soil.
//   - Grass, fireflies and clouds are NOT baked here. The `ready`
//     scene draws them as ANIMATED overlays (swaying grass, drifting
//     clouds, wandering fireflies) on top of this static base.
//
import { CFG } from '../cfg.js'
import { parseHex } from './helper.js'
import * as OrganicParallax from '../sections/touch/utils/organic-parallax-tree.js'
import { drawMushroomToCanvas } from './draw-mushroom.js'
import { buildRockVertices, buildRockPalette, drawRockToCanvas } from './draw-rock.js'
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
const HORIZON_LINE_HEIGHT = 3
//
// Sky and underground fills both use the exact `ready` scene backdrop
// colour (`CFG.visual.colors.ready.background`) so the canvas image
// bleeds seamlessly into the surrounding page chrome — no top/bottom
// colour strips visible at any sprite opacity over the matching
// backdrop rect.
//
const [READY_BG_R, READY_BG_G, READY_BG_B] = parseHex(CFG.visual.colors.ready.background)
const SKY_FILL_R = READY_BG_R
const SKY_FILL_G = READY_BG_G
const SKY_FILL_B = READY_BG_B
const UNDERGROUND_FILL_R = READY_BG_R
const UNDERGROUND_FILL_G = READY_BG_G
const UNDERGROUND_FILL_B = READY_BG_B
const HORIZON_LINE_R = 0
const HORIZON_LINE_G = 0
const HORIZON_LINE_B = 0
//
// Exported so the `ready` scene can position its animated overlays
// (grass at the strip, fireflies under the tree canopy, clouds in the
// upper sky) against the exact same horizon used by this baked image.
//
export const MENU_BG_GROUND_Y = GROUND_Y
export const MENU_BG_HORIZON_LINE_HEIGHT = HORIZON_LINE_HEIGHT
export const MENU_BG_CANVAS_W = CANVAS_W
export const MENU_BG_CANVAS_H = CANVAS_H
//
// Central UI keep-out zone (half-width). Trees never spawn inside it
// and rocks / mushrooms are excluded from it too. Measured from the
// canvas horizontal centre.
//
//
// Wide enough to clear the full footprint of the centred monster
// illustration drawn by `ready.js` (life-ready.png is 767 px wide).
// Keeps trees, rocks and mushrooms from sprouting under the monster.
//
const CENTER_KEEPOUT_HALF = 400
const CENTER_X = Math.round(CANVAS_W / 2)
//
// Side tree clusters. Trees frame the composition on the far left and
// far right; heights taper toward the centre forming a gentle V that
// opens up the sky for the on-screen UI.
//
const SIDE_CLUSTER_WIDTH = 360
const SIDE_CLUSTER_MARGIN = 20
//
// Cloud puff palette — shared by the Touch L0 cloud band and the
// ready scene's drifting cloud overlay. The farthest tree row tints
// toward this cool-teal triplet so distant silhouettes merge with
// the sky mass.
//
const MENU_BG_CLOUD_R = 32
const MENU_BG_CLOUD_G = 60
const MENU_BG_CLOUD_B = 68
//
// Warm yellow leaf + umber trunk — front-row anchor for the three-band
// tree gradient (nearest = yellow, farthest = cloud teal).
//
const MENU_BG_TREE_YELLOW_LEAF_R = 220
const MENU_BG_TREE_YELLOW_LEAF_G = 128
const MENU_BG_TREE_YELLOW_LEAF_B = 48
const MENU_BG_TREE_YELLOW_TRUNK_R = 96
const MENU_BG_TREE_YELLOW_TRUNK_G = 58
const MENU_BG_TREE_YELLOW_TRUNK_B = 28
//
// Depth mix factor for the mid row (0 = full yellow, 1 = cloud).
//
const MID_TREE_COLOR_MIX = 0.5
//
// Side trees are layered in THREE depth bands. Colour steps from warm
// yellow (front) through a mid blend to cloud teal (back). Height
// increases with distance — the farther the layer, the taller the
// silhouettes read against the sky.
//
//   Front  – nearest, shortest, warm yellow-orange foliage.
//   Mid    – mid-distance height + 50 % blend toward cloud teal.
//   Back   – farthest, tallest, full cloud-teal silhouettes.
//
const FRONT_TREE_COUNT = 5
const FRONT_TREE_TRUNK_HEIGHT_OUTER = 140
const FRONT_TREE_TRUNK_HEIGHT_INNER = 75
const FRONT_TREE_TRUNK_HEIGHT_JITTER = 28
const FRONT_TREE_OPACITY_MIN = 0.92
const FRONT_TREE_OPACITY_RANGE = 0.06
const FRONT_TREE_TRUNK_R = MENU_BG_TREE_YELLOW_TRUNK_R
const FRONT_TREE_TRUNK_G = MENU_BG_TREE_YELLOW_TRUNK_G
const FRONT_TREE_TRUNK_B = MENU_BG_TREE_YELLOW_TRUNK_B
const FRONT_TREE_LEAF_R = MENU_BG_TREE_YELLOW_LEAF_R
const FRONT_TREE_LEAF_G = MENU_BG_TREE_YELLOW_LEAF_G
const FRONT_TREE_LEAF_B = MENU_BG_TREE_YELLOW_LEAF_B
//
// Middle layer — between the dark front silhouettes and the light
// hazy back row. Cool teal tint, opacity slightly faded so the
// front row still pops over it.
//
const MID_TREE_COUNT = 7
const MID_TREE_TRUNK_HEIGHT_OUTER = 210
const MID_TREE_TRUNK_HEIGHT_INNER = 110
const MID_TREE_TRUNK_HEIGHT_JITTER = 32
const MID_TREE_OPACITY = 0.7
const MID_TREE_TRUNK_R = Math.round(MENU_BG_TREE_YELLOW_TRUNK_R + (MENU_BG_CLOUD_R - MENU_BG_TREE_YELLOW_TRUNK_R) * MID_TREE_COLOR_MIX)
const MID_TREE_TRUNK_G = Math.round(MENU_BG_TREE_YELLOW_TRUNK_G + (MENU_BG_CLOUD_G - MENU_BG_TREE_YELLOW_TRUNK_G) * MID_TREE_COLOR_MIX)
const MID_TREE_TRUNK_B = Math.round(MENU_BG_TREE_YELLOW_TRUNK_B + (MENU_BG_CLOUD_B - MENU_BG_TREE_YELLOW_TRUNK_B) * MID_TREE_COLOR_MIX)
const MID_TREE_LEAF_R = Math.round(MENU_BG_TREE_YELLOW_LEAF_R + (MENU_BG_CLOUD_R - MENU_BG_TREE_YELLOW_LEAF_R) * MID_TREE_COLOR_MIX)
const MID_TREE_LEAF_G = Math.round(MENU_BG_TREE_YELLOW_LEAF_G + (MENU_BG_CLOUD_G - MENU_BG_TREE_YELLOW_LEAF_G) * MID_TREE_COLOR_MIX)
const MID_TREE_LEAF_B = Math.round(MENU_BG_TREE_YELLOW_LEAF_B + (MENU_BG_CLOUD_B - MENU_BG_TREE_YELLOW_LEAF_B) * MID_TREE_COLOR_MIX)
//
// Back layer — tallest, most numerous, lightest cool teal silhouettes
// (atmospheric haze). Sits behind both other layers and stays above
// ground (no roots) so the underground belongs visually to the front
// layer alone.
//
const BACK_TREE_COUNT = 9
const BACK_TREE_TRUNK_HEIGHT_OUTER = 280
const BACK_TREE_TRUNK_HEIGHT_INNER = 150
const BACK_TREE_TRUNK_HEIGHT_JITTER = 36
const BACK_TREE_OPACITY = 0.45
const BACK_TREE_TRUNK_R = MENU_BG_CLOUD_R
const BACK_TREE_TRUNK_G = MENU_BG_CLOUD_G
const BACK_TREE_TRUNK_B = MENU_BG_CLOUD_B
const BACK_TREE_LEAF_R = MENU_BG_CLOUD_R
const BACK_TREE_LEAF_G = MENU_BG_CLOUD_G
const BACK_TREE_LEAF_B = MENU_BG_CLOUD_B
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
// Stems are buried into the black horizon strip so the caps appear to
// grow from the strip itself.
//
const MUSHROOM_COUNT = 9
const MUSHROOM_CAP_WIDTH_MIN = 18
const MUSHROOM_CAP_WIDTH_MAX = 34
const MUSHROOM_STEM_HEIGHT_MIN = 14
const MUSHROOM_STEM_HEIGHT_MAX = 26
const MUSHROOM_EDGE_MARGIN = 140
const MUSHROOM_BURY_DEPTH = HORIZON_LINE_HEIGHT
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
const ROCK_EDGE_MARGIN = 220
//
// Fraction of the rock radius that extends BELOW its silhouette
// centre — driven by the `VERT_FLATTEN_Y * VERT_HEAVY_SIDE` math in
// `draw-rock.js` (0.62 * 1.05 ≈ 0.65, plus radius jitter up to ~0.10).
// Used to land every rock's lower edge directly ON the black horizon
// strip in the menu-bg composite (no extra lift — rocks REST on the
// line rather than hovering above it).
//
const ROCK_BOTTOM_FACTOR = 0.63
//
// Extra pixels to sink the rock centre downward so the silhouette
// meets the black horizon strip before the clip rect slices it flat.
//
const ROCK_GROUND_SINK = 5
//
// Power used to bias the rock X sampling toward the outer edges of
// the canvas. `Math.pow(Math.random(), n)` with n > 1 pushes the
// random sample toward 0, which the picker maps to the OUTER edge of
// each side-band. Values around 2.5 give a clear edge preference
// while still letting the occasional rock land mid-band.
//
const ROCK_EDGE_BIAS = 2.5
//
// Moon — uses the shared L3 moon primitive (`draw-moon.js`) so the
// celestial body is visually identical to the touch L3 night-sky moon.
//
const MOON_CENTER_X = CANVAS_W - 220
const MOON_CENTER_Y = 220
const MOON_RADIUS = 72
const MOON_GLOW_RADIUS = 42
//
// Wide smooth radial-gradient halo painted BEHIND the moon body.
// Uses canvas2D `createRadialGradient` so the falloff is a single
// continuous gradient (no visible rings). Reaches `MOON_HALO_RADIUS`
// past the moon edge with an inner / mid / outer alpha curve.
//
const MOON_HALO_RADIUS = 40
const MOON_HALO_INNER_ALPHA = 0.55
const MOON_HALO_MID_ALPHA = 0.22
const MOON_HALO_MID_STOP = 0.35
const MOON_HALO_COLOR_R = 244
const MOON_HALO_COLOR_G = 200
const MOON_HALO_COLOR_B = 140
//
// Exported so the `ready` scene can keep its animated overlays
// (fireflies, twinkling stars) clear of the moon's halo.
//
export const MENU_BG_MOON_CENTER_X = MOON_CENTER_X
export const MENU_BG_MOON_CENTER_Y = MOON_CENTER_Y
export const MENU_BG_MOON_HALO_KEEPOUT = MOON_RADIUS + MOON_HALO_RADIUS
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
  //
  // Middle layer — sits between the lightest back silhouettes and
  // the dark warm-leaf front silhouettes so the depth gradient
  // (light far → dark near) reads in three clearly separated tiers.
  //
  const midTrees = [
    ...buildSideCluster({
      isRightSide: false,
      clusterLeftX: SIDE_CLUSTER_MARGIN + 20,
      clusterWidth: SIDE_CLUSTER_WIDTH - 40,
      count: MID_TREE_COUNT,
      heightOuter: MID_TREE_TRUNK_HEIGHT_OUTER,
      heightInner: MID_TREE_TRUNK_HEIGHT_INNER,
      heightJitter: MID_TREE_TRUNK_HEIGHT_JITTER,
      opacity: MID_TREE_OPACITY,
      trunkColor: { r: MID_TREE_TRUNK_R, g: MID_TREE_TRUNK_G, b: MID_TREE_TRUNK_B },
      leafColor: { r: MID_TREE_LEAF_R, g: MID_TREE_LEAF_G, b: MID_TREE_LEAF_B }
    }),
    ...buildSideCluster({
      isRightSide: true,
      clusterLeftX: CANVAS_W - SIDE_CLUSTER_MARGIN - SIDE_CLUSTER_WIDTH + 20,
      clusterWidth: SIDE_CLUSTER_WIDTH - 40,
      count: MID_TREE_COUNT,
      heightOuter: MID_TREE_TRUNK_HEIGHT_OUTER,
      heightInner: MID_TREE_TRUNK_HEIGHT_INNER,
      heightJitter: MID_TREE_TRUNK_HEIGHT_JITTER,
      opacity: MID_TREE_OPACITY,
      trunkColor: { r: MID_TREE_TRUNK_R, g: MID_TREE_TRUNK_G, b: MID_TREE_TRUNK_B },
      leafColor: { r: MID_TREE_LEAF_R, g: MID_TREE_LEAF_G, b: MID_TREE_LEAF_B }
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
  // Composition order matters: sky/moon go down first; back tree
  // silhouettes overlay the sky; soil paints over the sky-coloured
  // pixels below ground; front trees overlay; rocks/mushrooms layer
  // on top of soil; the black horizon strip caps the soil edge; and
  // finally the front-tree roots are stroked across the underground
  // band.
  //
  // Grass, fireflies and clouds are intentionally NOT painted here —
  // the `ready` scene renders them as animated overlays (`ready.js`)
  // so they sway, twinkle and drift instead of sitting as a still
  // image baked into the sprite.
  //
  drawSky(ctx)
  drawMoon(ctx)
  drawTreeLayer(ctx, backTrees)
  drawTreeLayer(ctx, midTrees)
  drawSoilFill(ctx)
  drawTreeLayer(ctx, frontTrees)
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

function drawMoon(ctx) {
  //
  // Wide smooth radial-gradient halo painted FIRST so the moon body
  // (drawn below by `drawMoonToCanvas`) overlaps and tops it. Using
  // `createRadialGradient` gives a perfectly continuous falloff — no
  // visible rings around the disc — at any opacity the sprite is
  // later drawn with.
  //
  const haloOuterR = MOON_RADIUS + MOON_HALO_RADIUS
  const grad = ctx.createRadialGradient(
    MOON_CENTER_X, MOON_CENTER_Y, MOON_RADIUS * 0.6,
    MOON_CENTER_X, MOON_CENTER_Y, haloOuterR
  )
  grad.addColorStop(0, `rgba(${MOON_HALO_COLOR_R}, ${MOON_HALO_COLOR_G}, ${MOON_HALO_COLOR_B}, ${MOON_HALO_INNER_ALPHA})`)
  grad.addColorStop(MOON_HALO_MID_STOP, `rgba(${MOON_HALO_COLOR_R}, ${MOON_HALO_COLOR_G}, ${MOON_HALO_COLOR_B}, ${MOON_HALO_MID_ALPHA})`)
  grad.addColorStop(1, `rgba(${MOON_HALO_COLOR_R}, ${MOON_HALO_COLOR_G}, ${MOON_HALO_COLOR_B}, 0)`)
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(MOON_CENTER_X, MOON_CENTER_Y, haloOuterR, 0, Math.PI * 2)
  ctx.fill()
  //
  // Moon body + built-in halo. Delegates to the shared L3 moon
  // primitive so the celestial disc + craters are visually identical
  // to the touch L3 night-sky moon.
  //
  drawMoonToCanvas(ctx, {
    cx: MOON_CENTER_X,
    cy: MOON_CENTER_Y,
    radius: MOON_RADIUS,
    glowRadius: MOON_GLOW_RADIUS
  })
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

function drawRocks(ctx) {
  //
  // Boulders RESTING on the black horizon strip on the OUTER halves
  // only. The central UI zone stays clear so the on-screen logo +
  // hint live in visual negative space.
  //
  // The rock silhouette extends ≈ `radius * ROCK_BOTTOM_FACTOR` below
  // its centre, so positioning the centre at
  // `GROUND_Y - radius * ROCK_BOTTOM_FACTOR` lands the lowest edge of
  // the silhouette exactly ON the black line — no hovering, no
  // dipping. Edge-biased X sampling makes rocks more likely to sit
  // near the canvas borders than in the inner band.
  //
  const reserved = []
  for (let i = 0; i < ROCK_COUNT; i++) {
    const radius = ROCK_RADIUS_MIN + Math.random() * (ROCK_RADIUS_MAX - ROCK_RADIUS_MIN)
    const posX = pickXAvoidingCentre(reserved, ROCK_EDGE_MARGIN, radius * 1.6, ROCK_EDGE_BIAS)
    if (posX == null) continue
    reserved.push({ x: posX, halfWidth: radius * 1.6 })
    const verts = buildRockVertices(radius)
    const palette = buildRockPalette()
    const canvasY = GROUND_Y - radius * ROCK_BOTTOM_FACTOR + ROCK_GROUND_SINK
    ctx.save()
    //
    // Clip to the sky + horizon strip so the rock silhouette is
    // sliced flat at the black line — nothing renders below it.
    //
    ctx.beginPath()
    ctx.rect(0, 0, CANVAS_W, GROUND_Y)
    ctx.clip()
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
    //
    // Bury the stem into the black horizon strip so the mushroom
    // appears to grow FROM the strip — the bottom `MUSHROOM_BURY_DEPTH`
    // pixels of every stem are hidden by the strip drawn on top.
    //
    drawMushroomToCanvas(ctx, {
      cx: posX,
      baseY: GROUND_Y + MUSHROOM_BURY_DEPTH,
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
// `edgeBias` (default 1 = uniform) controls how strongly the random
// sample is pulled toward the OUTER edge of each side-band. Values
// > 1 bias the sample toward the canvas borders (rocks); the default
// keeps the original uniform spread (mushrooms).
//
function pickXAvoidingCentre(reserved, edgeMargin, minGap, edgeBias = 1) {
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
    //
    // `t` is uniform in [0,1] when edgeBias === 1, otherwise biased
    // toward 0 by raising the uniform sample to the `edgeBias` power.
    // For the LEFT band, t=0 maps to `leftMin` (outer/canvas edge);
    // for the RIGHT band, t=0 maps to `rightMax` (outer/canvas edge).
    //
    const t = edgeBias === 1 ? Math.random() : Math.pow(Math.random(), edgeBias)
    const candidate = pickLeft
      ? leftMin + t * leftSpan
      : rightMax - t * rightSpan
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
