//
// Background for the `ready` and `menu` scenes, composed at preload time
// on one off-screen canvas from the forest level's own pictures: its trees
// (trees_far.png / trees_mid.png) in three night-tinted rows framing the
// screen, the ground stones (stones.png) and mushrooms (mushrooms.png) on
// the ground line, the buried stones (stones_ground.png) in the soil, plus
// procedural roots under the front trees and the moon.
//
// Composition philosophy:
//   - Sky + underground use the exact `ready` scene backdrop colour so the
//     baked image bleeds seamlessly into the page chrome.
//   - Three tree rows per side, farther rows tinted more towards the night
//     sky, frame the empty central UI zone.
//   - Each front-row tree owns its own underground roots, generated with
//     the shared root algorithm (`grow-tree-root.js`), curling toward the
//     centre as they descend.
//   - Centre stays clean: trees, stones and mushrooms keep out of the
//     central UI zone.
//   - Grass, fireflies and clouds are NOT baked here. The `ready` scene
//     draws them as animated overlays on top of this static base.
//
import { CFG } from '../cfg.js'
import { parseHex } from './helper.js'
import { drawMoonToCanvas } from './draw-moon.js'
import { TREE_SHEET, loadForestPictureTrees, drawForestPictureTrees } from '../sections/forest/utils/forest-picture-trees.js'
import { loadForestStones, forestGroundStones, forestBuriedStones } from '../sections/forest/utils/forest-stones.js'
import { loadForestMushrooms, drawForestMushroom } from '../sections/forest/utils/forest-mushrooms.js'
import { BUSH_SHEET, loadForestPictureBushes, drawForestPictureBushes } from '../sections/forest/utils/forest-picture-bushes.js'
import { loadForestPlants, drawForestPlant } from '../sections/forest/utils/forest-plants.js'
import { groundEarthLayersColor, paintLayeredEarthBand } from '../sections/forest/utils/forest-earth-band.js'
import { FOREST_LAYER_GRADE, applyParallaxPostFxToContext } from '../sections/forest/utils/forest-parallax-grain.js'
import { forestDepthBlurRadiusPx } from '../sections/forest/utils/forest-focus-depth.js'
import { forestFloorPainterColors } from '../sections/forest/components/forest-floor.js'
import { drawGroundRimToCanvas } from './draw-ground-rim.js'
//
// Canvas matches the live kaplay viewport (native window resolution) so the
// sprite needs no stretching when drawn full-screen. These start out at the
// design reference size and are reassigned by recomputeMenuBgLayout() once
// the real k.width()/k.height() are known — every value derived from them
// below is declared `let` for the same reason and updated by that function.
//
let CANVAS_W = CFG.visual.screen.width
let CANVAS_H = CFG.visual.screen.height
//
// Ground line at ≈ 66% from the top (cut line of the layers standing on it,
// under the ragged rim). Sky lives above, soil
// below.
//
let GROUND_Y = Math.round(CANVAS_H * 0.66)
const HORIZON_LINE_HEIGHT = 3
//
// Sky and underground fills default to the exact `ready` scene backdrop
// colour so the canvas image bleeds seamlessly into the surrounding page
// chrome. Scenes with a different backdrop (the menu) pass their own fill
// hex, so the blend stays equal to the scene background.
//
const DEFAULT_BG_FILL_HEX = CFG.visual.colors.ready.background
//
// Exported so the `ready` scene can position its animated overlays
// (grass at the strip, fireflies under the tree canopy, clouds in the
// upper sky) against the exact same horizon used by this baked image.
//
export let MENU_BG_GROUND_Y = GROUND_Y
export const MENU_BG_HORIZON_LINE_HEIGHT = HORIZON_LINE_HEIGHT
export let MENU_BG_CANVAS_W = CANVAS_W
export let MENU_BG_CANVAS_H = CANVAS_H
//
// Central UI keep-out zone (half-width). Trees never spawn inside it
// and stones / mushrooms are excluded from it too. Measured from the
// canvas horizontal centre.
//
//
// Wide enough to clear the full footprint of the centred monster
// illustration drawn by `ready.js`. Keeps trees, stones and mushrooms
// from sprouting under the monster.
//
const CENTER_KEEPOUT_HALF = 400
let CENTER_X = Math.round(CANVAS_W / 2)
//
// Tree rows back to front, like the forest level's parallax: a far row of
// small, dense, hazy trees (the far sheet), then rows of fewer, taller and
// sharper ones; the near rows have the level's hedges at their feet. Per
// row: the tree sheet, the picture's scale at REF_HEIGHT (more on a taller
// screen), the gap between trees (px at REF_HEIGHT), its depth tier (blur
// and grade, as in the level), the hedge sheet and scale, and how far the
// row is tinted towards the night sky.
//
// On each side the trees run from the screen edge towards the middle and
// shrink as they go (to TREE_TAPER of their size at the inner end), ending
// TREE_CLEAR_HALF px short of the centre so none stands before the eye.
//
const REF_HEIGHT = 1000
const TREE_ROWS = [
  { sheet: TREE_SHEET.FAR, scale: 0.36, gap: 60, tier: 'background', grade: 'far', night: 0.55 },
  { sheet: TREE_SHEET.MID, scale: 0.62, gap: 140, tier: 'midground', grade: 'mid', night: 0.38, bushSheet: BUSH_SHEET.MID, bushScale: 0.5 },
  { sheet: TREE_SHEET.MID, scale: 1.05, gap: 300, tier: 'nearground', grade: 'near', night: 0.2, bushSheet: BUSH_SHEET.NEAR, bushScale: 0.34 }
]
const TREE_SINK = 4
const TREE_JITTER = 0.35
const TREE_TAPER = 0.4
const TREE_CLEAR_HALF = 290
const TREE_EDGE_START = -20
const FRONT_ROW = TREE_ROWS.length - 1
//
// Ground decor from the forest's pictures, out of the central zone:
// STONE_COUNT ground stones (STONE_SCALE of their sheet size, pulled
// towards the screen edges by STONE_EDGE_BIAS), PLANT_COUNT ferns and
// plants (PLANT_H_MIN..+RANGE tall) and MUSHROOM_COUNT mushrooms
// (MUSHROOM_H_MIN..+RANGE tall), all tinted DECOR_NIGHT towards the sky;
// BURIED_COUNT buried stones (BURIED_SCALE) in the soil a little darker
// (BURIED_NIGHT), between BURIED_TOP and BURIED_BOTTOM px under the ground
// line. The soil itself is the level's layered earth, tinted SOIL_NIGHT.
//
const STONE_COUNT = 6
const STONE_SCALE = 0.28
const STONE_SINK = 4
const STONE_EDGE_MARGIN = 140
const STONE_EDGE_BIAS = 2.5
const MUSHROOM_COUNT = 9
const MUSHROOM_H_MIN = 30
const MUSHROOM_H_RANGE = 18
const MUSHROOM_EDGE_MARGIN = 200
const MUSHROOM_GAP = 18
const PLANT_COUNT = 10
const PLANT_H_MIN = 36
const PLANT_H_RANGE = 22
const PLANT_EDGE_MARGIN = 60
const PLANT_GAP = 22
const DECOR_NIGHT = 0.22
const SOIL_NIGHT = 0.35
const RIM_NIGHT = 0.12
const RIM_SCALE = 2
const BURIED_COUNT = 12
const BURIED_SCALE = 0.3
const BURIED_TOP = 40
const BURIED_BOTTOM = 30
const BURIED_EDGE_MARGIN = 40
const BURIED_NIGHT = 0.3
//
// Moon — drawn by the shared moon primitive (`draw-moon.js`).
// Anchored to the top-right corner by a FIXED pixel margin (not a ratio of
// CANVAS_W/H) so it sits the same distance from the corner at any
// resolution, per the side-decoration rule below.
//
const MOON_MARGIN_RIGHT = 220
const MOON_MARGIN_TOP = 220
//
// On a canvas taller than wide (a phone held upright) the moon hangs this
// much lower, clear of the title centred above it.
//
const UPRIGHT_MOON_DROP = 110
let MOON_CENTER_X = CANVAS_W - MOON_MARGIN_RIGHT
let MOON_CENTER_Y = MOON_MARGIN_TOP
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
export let MENU_BG_MOON_CENTER_X = MOON_CENTER_X
export let MENU_BG_MOON_CENTER_Y = MOON_CENTER_Y
export const MENU_BG_MOON_HALO_KEEPOUT = MOON_RADIUS + MOON_HALO_RADIUS
//
// pickXAvoiding retry budget — generous so the placement loop has a
// real chance to find a slot inside the constrained left/right bands.
//
const PLACEMENT_MAX_ATTEMPTS = 80

/**
 * Waits for the forest pictures the background paints (trees, hedges,
 * plants, ground and buried stones, mushrooms; once per page). Call before
 * generateMenuBackgroundCanvas().
 * @returns {Promise<void>}
 */
export async function loadMenuBackgroundArt() {
  await Promise.all([loadForestPictureTrees(), loadForestPictureBushes(), loadForestPlants(), loadForestStones(), loadForestMushrooms()])
}

/**
 * Recomputes every resolution-derived layout value from the live kaplay
 * viewport. Must be called before generateMenuBackgroundCanvas() (and before
 * any caller reads the MENU_BG_* exports) whenever the canvas/window size is
 * known — `ready` and `menu` both call this first, mirroring Forest's
 * recomputeForestScreenLayout() pattern. Side decoration (tree clusters, rocks,
 * mushrooms) keeps its fixed pixel margin from each edge, so the clusters sit
 * closer together on a smaller window and farther apart on a larger one; the
 * moon keeps a fixed pixel margin from the top-right corner instead, so it
 * never drifts with the window size the way a ratio-based position would.
 * @param {number} width - Current k.width()
 * @param {number} height - Current k.height()
 */
export function recomputeMenuBgLayout(width, height) {
  CANVAS_W = Math.round(width)
  CANVAS_H = Math.round(height)
  GROUND_Y = Math.round(CANVAS_H * 0.66)
  CENTER_X = Math.round(CANVAS_W / 2)
  MOON_CENTER_X = CANVAS_W - MOON_MARGIN_RIGHT
  MOON_CENTER_Y = MOON_MARGIN_TOP + (CANVAS_H > CANVAS_W ? UPRIGHT_MOON_DROP : 0)
  MENU_BG_GROUND_Y = GROUND_Y
  MENU_BG_CANVAS_W = CANVAS_W
  MENU_BG_CANVAS_H = CANVAS_H
  MENU_BG_MOON_CENTER_X = MOON_CENTER_X
  MENU_BG_MOON_CENTER_Y = MOON_CENTER_Y
}

/**
 * Generates the procedural ready/menu background image and returns the
 * canvas. Caller is expected to pass the canvas straight to
 * `k.loadSprite(name, canvas)`.
 *
 * @param {string} [bgFillHex] - Sky/underground fill colour; pass the
 *   calling scene's backdrop hex so the plain bands above and below the
 *   composition blend into the scene background (no top/bottom strips)
 * @returns {HTMLCanvasElement}
 */
export function generateMenuBackgroundCanvas(bgFillHex = DEFAULT_BG_FILL_HEX, opts = {}) {
  const skipMoon = opts.skipMoon === true
  const [bgFillR, bgFillG, bgFillB] = parseHex(bgFillHex)
  const canvas = document.createElement('canvas')
  canvas.width = CANVAS_W
  canvas.height = CANVAS_H
  const ctx = canvas.getContext('2d')
  const night = { r: bgFillR, g: bgFillG, b: bgFillB }
  const s = CANVAS_H / REF_HEIGHT
  //
  // Composition order: sky/moon, the far tree rows, the layered soil over
  // the sky below ground, buried stones, the front row, the level's ragged
  // ground rim, then ground decor standing on it.
  //
  // Grass, fireflies and clouds are intentionally NOT painted here — the
  // `ready` scene renders them as animated overlays.
  //
  drawSky(ctx, bgFillR, bgFillG, bgFillB)
  !skipMoon && drawMenuMoon(ctx)
  TREE_ROWS.slice(0, FRONT_ROW).forEach(row => paintTreeRow(ctx, row, s, night))
  paintSoil(ctx, night)
  paintBuriedStones(ctx, s, night)
  paintTreeRow(ctx, TREE_ROWS[FRONT_ROW], s, night)
  paintGroundRim(ctx, night)
  paintGroundDecor(ctx, s, night)
  return canvas
}

function drawSky(ctx, fillR, fillG, fillB) {
  //
  // Solid backdrop-tone sky across the entire canvas. The underground band
  // gets repainted on top of the lower portion further down in the pipeline.
  //
  ctx.fillStyle = `rgb(${fillR}, ${fillG}, ${fillB})`
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
}
//
// The forest level's layered soil under the ground line, tinted towards
// the night.
//
function paintSoil(ctx, night) {
  const layer = newLayer()
  paintLayeredEarthBand(layer.getContext('2d'), groundEarthLayersColor(), 0, GROUND_Y, CANVAS_W, CANVAS_H - GROUND_Y)
  composeTinted(ctx, layer, night, SOIL_NIGHT)
}
//
// The forest level's ragged ground rim (soil lip, lumps, moss and litter
// patches, twigs) along the whole ground line, painted RIM_SCALE times
// larger (it reads at the backdrop's size), tinted towards the night.
//
function paintGroundRim(ctx, night) {
  const layer = newLayer()
  const lctx = layer.getContext('2d')
  lctx.scale(RIM_SCALE, RIM_SCALE)
  drawGroundRimToCanvas(lctx, { x1: 0, x2: CANVAS_W / RIM_SCALE, floorY: GROUND_Y / RIM_SCALE, rng: Math.random, colors: forestFloorPainterColors().rim })
  lctx.setTransform(1, 0, 0, 1, 0, 0)
  composeTinted(ctx, layer, night, RIM_NIGHT)
}
/**
 * Draws the menu / ready moon (wide halo + L3 disc) at its fixed canvas
 * position. Used by the baked background and by the ready-scene moon
 * overlay that sits above the twinkling stars.
 * @param {CanvasRenderingContext2D} ctx
 */
export function drawMenuMoon(ctx) {
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
  // Moon body + built-in halo, drawn by the shared moon primitive.
  //
  drawMoonToCanvas(ctx, {
    cx: MOON_CENTER_X,
    cy: MOON_CENTER_Y,
    radius: MOON_RADIUS,
    glowRadius: MOON_GLOW_RADIUS
  })
}
//
// One row of the forest's tree pictures on both sides, each tree smaller
// the nearer it stands to the middle, the row's hedges at their feet, then
// the level's depth finish for the row (blur and grade) and the night tint.
//
function paintTreeRow(ctx, row, s, night) {
  const layer = newLayer()
  const lctx = layer.getContext('2d')
  const inner = CENTER_X - TREE_CLEAR_HALF
  const span = inner - TREE_EDGE_START
  const gap = row.gap * s
  for (let d = TREE_EDGE_START; d < inner; d += gap * (1 + (Math.random() - 0.5) * TREE_JITTER)) {
    const scale = row.scale * s * (1 - (1 - TREE_TAPER) * (d - TREE_EDGE_START) / span)
    drawForestPictureTrees(lctx, row.sheet, [d], GROUND_Y + TREE_SINK, scale)
    drawForestPictureTrees(lctx, row.sheet, [CANVAS_W - d], GROUND_Y + TREE_SINK, scale)
  }
  if (row.bushSheet) {
    drawForestPictureBushes(lctx, row.bushSheet, 0, inner, GROUND_Y, row.bushScale * s)
    drawForestPictureBushes(lctx, row.bushSheet, CANVAS_W - inner, CANVAS_W, GROUND_Y, row.bushScale * s)
  }
  lctx.globalCompositeOperation = 'destination-out'
  lctx.fillRect(0, GROUND_Y + HORIZON_LINE_HEIGHT, CANVAS_W, CANVAS_H)
  lctx.globalCompositeOperation = 'source-over'
  applyParallaxPostFxToContext(lctx, CANVAS_W, CANVAS_H, {
    blurRadius: forestDepthBlurRadiusPx(row.tier),
    grade: FOREST_LAYER_GRADE[row.grade]
  })
  composeTinted(ctx, layer, night, row.night)
}
//
// Ground stones, plants and mushrooms standing on the ground line (cut off
// flat at it), tinted towards the night together.
//
function paintGroundDecor(ctx, s, night) {
  const layer = newLayer()
  const lctx = layer.getContext('2d')
  const reserved = []
  const stones = forestGroundStones()
  for (let i = 0; i < STONE_COUNT && stones.length; i++) {
    const stone = stones[Math.floor(Math.random() * stones.length)].canvas
    const w = stone.width * STONE_SCALE * s
    const h = stone.height * STONE_SCALE * s
    const x = pickXAvoidingCentre(reserved, STONE_EDGE_MARGIN, w * 0.5, STONE_EDGE_BIAS)
    if (x == null) continue
    reserved.push({ x, halfWidth: w * 0.5 })
    lctx.drawImage(stone, x - w / 2, GROUND_Y + STONE_SINK - h, w, h)
  }
  for (let i = 0; i < PLANT_COUNT; i++) {
    const x = pickXAvoidingCentre(reserved, PLANT_EDGE_MARGIN, PLANT_GAP * s)
    if (x == null) continue
    reserved.push({ x, halfWidth: PLANT_GAP * s })
    drawForestPlant(lctx, { x, baseY: GROUND_Y, size: (PLANT_H_MIN + Math.random() * PLANT_H_RANGE) * s, rng: Math.random })
  }
  for (let i = 0; i < MUSHROOM_COUNT; i++) {
    const x = pickXAvoidingCentre(reserved, MUSHROOM_EDGE_MARGIN, MUSHROOM_GAP * s)
    if (x == null) continue
    reserved.push({ x, halfWidth: MUSHROOM_GAP * s })
    drawForestMushroom(lctx, { x, baseY: GROUND_Y, size: (MUSHROOM_H_MIN + Math.random() * MUSHROOM_H_RANGE) * s, rng: Math.random })
  }
  lctx.globalCompositeOperation = 'destination-out'
  lctx.fillRect(0, GROUND_Y + HORIZON_LINE_HEIGHT, CANVAS_W, CANVAS_H)
  composeTinted(ctx, layer, night, DECOR_NIGHT)
}
//
// Buried stones scattered through the soil on both sides, out of the
// central zone (where the description text sits).
//
function paintBuriedStones(ctx, s, night) {
  const stones = forestBuriedStones()
  if (!stones.length) return
  const layer = newLayer()
  const lctx = layer.getContext('2d')
  const reserved = []
  for (let i = 0; i < BURIED_COUNT; i++) {
    const stone = stones[Math.floor(Math.random() * stones.length)]
    const w = stone.width * BURIED_SCALE * s
    const h = stone.height * BURIED_SCALE * s
    const x = pickXAvoidingCentre(reserved, BURIED_EDGE_MARGIN, w * 0.5)
    if (x == null) continue
    reserved.push({ x, halfWidth: w * 0.5 })
    const y = GROUND_Y + BURIED_TOP + Math.random() * Math.max(0, CANVAS_H - GROUND_Y - BURIED_TOP - BURIED_BOTTOM - h)
    lctx.drawImage(stone, x - w / 2, y, w, h)
  }
  composeTinted(ctx, layer, night, BURIED_NIGHT)
}
function newLayer() {
  const layer = document.createElement('canvas')
  layer.width = CANVAS_W
  layer.height = CANVAS_H
  return layer
}
//
// Draws a layer onto the scene after tinting its painted pixels towards
// the night colour by `amount`.
//
function composeTinted(ctx, layer, night, amount) {
  const lctx = layer.getContext('2d')
  lctx.globalCompositeOperation = 'source-atop'
  lctx.globalAlpha = amount
  lctx.fillStyle = `rgb(${night.r}, ${night.g}, ${night.b})`
  lctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
  ctx.drawImage(layer, 0, 0)
  layer.width = 0
  layer.height = 0
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
