import { drawFeatherPlumeToCanvas, featherPlumeBounds } from '../../../utils/draw-feather-plume.js'
import { drawFernToCanvas, fernBounds } from '../../../utils/draw-fern.js'
import { drawGrassTuftToCanvas } from '../../../utils/draw-grass-tuft.js'
import { drawGroundRimToCanvas, groundRimBounds } from '../../../utils/draw-ground-rim.js'
import { drawMossyHillToCanvas, mossyHillBounds, mossyHillTopY } from '../../../utils/draw-mossy-hill.js'
import { drawSmallMushroomGroupToCanvas, drawSpottedMushroomToCanvas, smallMushroomGroupBounds } from '../../../utils/draw-small-mushroom.js'
import { createSeededRandom, nextSeed } from '../../../utils/seeded-random.js'
import { forestContactShadowRgb, paintForestContactShadow } from '../utils/forest-atmosphere.js'
import { FOREST_PAL } from '../utils/forest-palette.js'
import { drawStaticDecorSprite, ensureStaticDecorSprite, isWorldSpanInView } from '../utils/forest-static-bake.js'
//
// Colour-world forest floor dressing from the reference art: the ragged
// ground rim and one wide mossy hill behind the hero, ferns and light spike
// bushes in front of him, and small clusters of ordinary cream mushrooms on
// the ground. This module only lays the pieces out; the painters live in
// src/utils/draw-*.js. Everything is baked once per live Kaplay instance into
// a few chunk sprites (film grain applied by forest-static-bake), then blitted
// with one drawSprite per visible chunk — no per-plant objects or draws.
//
const LAYOUT_SEED = 40213
const CHUNK_W = 420
const BAKE_VARIANT = 'v10'
const SEED_BACK = 7100
const SEED_FRONT = 7300
const VIEW_CULL_PAD = 80
const MIN_DRAW_OPACITY = 0.02
const KIND = { HILL: 'hill', FERN: 'fern', PLUME: 'plume', MUSHROOMS: 'mushrooms', RIM: 'rim' }
//
// Foreground plants grow in separate patches, not a mixed even scatter:
// a teal fern patch (a few big fronds in the middle, smaller ones at its
// edges) or a smaller patch of light spike bushes, then open ground.
// Patches keep clear of the red ear-tree accents so the two never mingle.
//
const PATCH_GAP_MIN = 150
const PATCH_GAP_RANGE = 190
const PATCH_FERN_COUNT_MIN = 3
const PATCH_FERN_COUNT_RANGE = 3
const PATCH_PLUME_COUNT_MIN = 2
const PATCH_PLUME_COUNT_RANGE = 2
const PATCH_PLUME_CHANCE = 0.3
const PATCH_STEP_MIN = 20
const PATCH_STEP_RANGE = 18
const PATCH_EDGE_SIZE_MULT = 0.68
const PATCH_ACCENT_CLEAR_HALF = 110
const FRONT_FERN_HALF_W = 28
const FRONT_PLUME_HALF_W = 14
const FERN_SIZE_MIN = 42
const FERN_SIZE_RANGE = 22
const PLUME_H_MIN = 36
const PLUME_H_RANGE = 20
//
// Ordinary mushroom groups behind the hero.
//
const MUSH_STEP_MIN = 210
const MUSH_STEP_RANGE = 170
const MUSH_GROUP_HALF_W = 16
//
// Mossy hill footprint and the plants rooted on it (spread by fraction of
// the hill width, each skipped where the hero needs a clear read).
//
const HILL_HALF_W = 340
const HILL_H = 118
const HILL_PLANT_PAD = 90
const HILL_PLANT_SINK = 4
const HILL_PLANT_HALF_W = 14
//
// Hill plants in fern patches plus grass tufts — no gold spike bushes on the
// right mound (they stay in open ground patches only).
//
const HILL_FERNS_T = [0.09, 0.15, 0.22, 0.63, 0.7]
const HILL_TUFT_STEP_T = 0.055
const HILL_MUSH_T = [0.04, 0.36, 0.68, 0.97]
const HILL_SPOT_MUSH_T = [0.16, 0.6]

/**
 * Creates the forest-floor dressing (ground rim, hill, ferns, spike bushes,
 * mushrooms) and its two draw layers — one behind the hero, one in front.
 * @param {Object} cfg - Configuration
 * @param {Object} cfg.k - Kaplay inst
 * @param {number} cfg.floorY - Walkable ground Y
 * @param {number} cfg.xMin - Leftmost world X for scattered plants
 * @param {number} cfg.xMax - Rightmost world X for scattered plants
 * @param {number} cfg.hillX2 - World X of the hill peak (the slope climbs to it from the left)
 * @param {Array<{x1: number, x2: number}>} cfg.rimSpans - Ground runs that get the ragged rim
 * @param {Function} cfg.isSpotFree - (x, halfW) => boolean, false over water, trampolines, trunks, cave
 * @param {number[]} [cfg.accentXs] - World X of red accent plants (ear-trees) that fern / spike patches keep clear of
 * @param {Function} cfg.getOpacity - () => number, 0 outside the colour world
 * @param {number} cfg.backZ - Z of the layer behind the hero
 * @param {number} cfg.frontZ - Z of the layer in front of the hero
 * @returns {Object} Forest-floor inst
 */
export function create(cfg) {
  const { k, floorY, xMin, xMax, hillX2, rimSpans, isSpotFree, getOpacity, backZ, frontZ } = cfg
  const inst = {
    k,
    floorY,
    getOpacity,
    isSpotFree,
    accentXs: cfg.accentXs ?? [],
    colors: { ...forestFloorPainterColors(), contactShadow: forestContactShadowRgb() },
    hill: { x1: hillX2 - HILL_HALF_W * 2, x2: hillX2, floorY, height: HILL_H },
    back: [],
    front: []
  }
  const rng = createSeededRandom(LAYOUT_SEED)
  const backItems = [...buildRimItems(rimSpans, rng), ...buildBackItems(inst, rng, xMin, xMax)]
  inst.back = bakeChunks(inst, backItems, 'back', SEED_BACK)
  inst.front = bakeChunks(inst, buildFrontItems(inst, rng, xMin, xMax), 'front', SEED_FRONT)
  k.add([k.z(backZ), { draw() { onDraw(inst, 'back') } }])
  k.add([k.z(frontZ), { draw() { onDraw(inst, 'front') } }])
  return inst
}

/**
 * Blits one layer's visible chunks at the colour-world opacity.
 * @param {Object} inst - Forest-floor inst
 * @param {'back'|'front'} layer - Which layer to draw
 */
export function onDraw(inst, layer) {
  const opacity = inst.getOpacity()
  if (opacity < MIN_DRAW_OPACITY) return
  const view = viewXRange(inst.k)
  inst[layer].forEach(chunk => {
    if (!isWorldSpanInView(chunk.baked.x, chunk.baked.x + chunk.baked.w, view)) return
    drawStaticDecorSprite(inst.k, chunk.baked, opacity)
  })
}

/**
 * Painter colour contracts of the forest floor, shared with other ground
 * pieces (the lake island) so their surface matches the right-side ground.
 * @returns {Object} Colours keyed by painter (fern, plume, mushroom, spotted, tuft, hill, rim)
 */
export function forestFloorPainterColors() {
  return buildPainterColors(FOREST_PAL.forestFloor)
}
//
// Maps the flat forestFloor cfg block onto each painter's colour contract.
//
function buildPainterColors(c) {
  return {
    fern: { contour: c.contour, stem: c.fernDark, dark: c.fernDark, mid: c.fernMid, light: c.fernLight },
    plume: { contour: c.contour, body: c.plume, light: c.plumeLight, shade: c.plumeShade, stem: c.plumeStem, leaf: c.fernMid },
    mushroom: { cap: c.mushCap, capLight: c.mushCapLight, gill: c.mushGill, stem: c.mushStem, outline: c.mushOutline },
    spotted: { cap: c.spotCap, capLight: c.spotCapLight, dot: c.spotDot, stem: c.mushCap, outline: c.mushOutline },
    tuft: { grass: c.grass, dry: c.grassDry },
    hill: {
      contour: c.contour, stoneDark: c.stoneDark, stone: c.stone, stoneLight: c.stoneLight,
      deep: c.mossDeep, shadow: c.mossShadow, mid: c.mossMid, light: c.mossLight, glint: c.mossGlint,
      soilTop: c.slopeSoilTop, soil: c.slopeSoil, soilDeep: c.slopeSoilDeep, soilLight: c.slopeSoilLight
    },
    rim: {
      soil: c.rimSoil, earth: c.rimEarth, moss: c.rimMoss, mossLight: c.rimMossLight,
      dry: c.rimDry, dryLight: c.rimDryLight, pebble: c.rimPebble, contour: c.contour
    }
  }
}
//
// Ground rim pieces cut at chunk edges so each chunk bakes its own slice.
//
function buildRimItems(rimSpans, rng) {
  const items = []
  const spans = rimSpans ?? []
  spans.forEach(span => {
    for (let x1 = span.x1; x1 < span.x2; x1 = (Math.floor(x1 / CHUNK_W) + 1) * CHUNK_W) {
      const x2 = Math.min(span.x2, (Math.floor(x1 / CHUNK_W) + 1) * CHUNK_W)
      items.push({ kind: KIND.RIM, x: (x1 + x2) / 2, x1, x2, seed: nextSeed(rng) })
    }
  })
  return items
}
//
// Hill plus mushroom groups on the free ground around it.
//
function buildBackItems(inst, rng, xMin, xMax) {
  const items = [{ kind: KIND.HILL, x: (inst.hill.x1 + inst.hill.x2) / 2, seed: nextSeed(rng) }]
  for (let x = xMin + rng() * MUSH_STEP_MIN; x < xMax; x += MUSH_STEP_MIN + rng() * MUSH_STEP_RANGE) {
    if (isInHill(inst, x, MUSH_GROUP_HALF_W) || !inst.isSpotFree(x, MUSH_GROUP_HALF_W)) continue
    items.push({ kind: KIND.MUSHROOMS, x, seed: nextSeed(rng) })
  }
  return items
}
function buildFrontItems(inst, rng, xMin, xMax) {
  const items = []
  let x = xMin + rng() * PATCH_GAP_MIN
  while (x < xMax) {
    const isPlume = rng() < PATCH_PLUME_CHANCE
    const count = isPlume
      ? PATCH_PLUME_COUNT_MIN + Math.floor(rng() * PATCH_PLUME_COUNT_RANGE)
      : PATCH_FERN_COUNT_MIN + Math.floor(rng() * PATCH_FERN_COUNT_RANGE)
    for (let i = 0; i < count; i++) {
      const edge = i === 0 || i === count - 1
      const plant = buildPatchPlant(inst, rng, x, isPlume, edge)
      plant && items.push(plant)
      x += PATCH_STEP_MIN + rng() * PATCH_STEP_RANGE
    }
    x += PATCH_GAP_MIN + rng() * PATCH_GAP_RANGE
  }
  return items
}
//
// One plant of a patch; edge plants are smaller so the patch fades out.
//
function buildPatchPlant(inst, rng, x, isPlume, edge) {
  const halfW = isPlume ? FRONT_PLUME_HALF_W : FRONT_FERN_HALF_W
  const base = isPlume ? PLUME_H_MIN + rng() * PLUME_H_RANGE : FERN_SIZE_MIN + rng() * FERN_SIZE_RANGE
  const size = edge ? base * PATCH_EDGE_SIZE_MULT : base
  const seed = nextSeed(rng)
  if (isInHill(inst, x, halfW) || !inst.isSpotFree(x, halfW) || isNearAccent(inst, x, halfW)) return null
  return { kind: isPlume ? KIND.PLUME : KIND.FERN, x, size, seed }
}
function isNearAccent(inst, x, halfW) {
  return inst.accentXs.some(ax => Math.abs(ax - x) < PATCH_ACCENT_CLEAR_HALF + halfW)
}
function isInHill(inst, x, halfW) {
  return x + halfW >= inst.hill.x1 && x - halfW <= inst.hill.x2
}
//
// Groups items into CHUNK_W-wide strips and bakes each strip once.
//
function bakeChunks(inst, items, slot, seedBase) {
  const groups = new Map()
  items.forEach(item => {
    const key = Math.floor(item.x / CHUNK_W)
    groups.has(key) ? groups.get(key).push(item) : groups.set(key, [item])
  })
  const chunks = []
  groups.forEach((group, key) => {
    const bounds = group.reduce((b, item) => mergeBounds(b, itemBounds(inst, item)), null)
    const baked = ensureStaticDecorSprite(
      inst.k, inst, `${slot}-${key}`, BAKE_VARIANT, bounds,
      ctx => group.forEach(item => paintItem(ctx, inst, item)),
      seedBase + key
    )
    baked && chunks.push({ baked })
  })
  return chunks
}
function itemBounds(inst, item) {
  if (item.kind === KIND.RIM) return groundRimBounds(item.x1, item.x2, inst.floorY)
  if (item.kind === KIND.HILL) return mossyHillBounds(inst.hill, HILL_PLANT_PAD)
  if (item.kind === KIND.FERN) return fernBounds(item.x, inst.floorY, item.size)
  if (item.kind === KIND.PLUME) return featherPlumeBounds(item.x, inst.floorY, item.size)
  return smallMushroomGroupBounds(item.x, inst.floorY)
}
function mergeBounds(a, b) {
  if (!a) return { ...b }
  return { x1: Math.min(a.x1, b.x1), y1: Math.min(a.y1, b.y1), x2: Math.max(a.x2, b.x2), y2: Math.max(a.y2, b.y2) }
}
function paintItem(ctx, inst, item) {
  const rng = createSeededRandom(item.seed)
  const { colors, floorY } = inst
  const { x, size } = item
  if (item.kind === KIND.RIM) drawGroundRimToCanvas(ctx, { x1: item.x1, x2: item.x2, floorY, rng, colors: colors.rim })
  else if (item.kind === KIND.HILL) paintHill(ctx, inst, rng)
  else if (item.kind === KIND.FERN) {
    paintForestFloorContactShadow(ctx, x, floorY, size * 0.42, 5, colors)
    drawFernToCanvas(ctx, { x, baseY: floorY, size, rng, colors: colors.fern })
  }
  else if (item.kind === KIND.PLUME) {
    paintForestFloorContactShadow(ctx, x, floorY, size * 0.22, 4, colors)
    drawFeatherPlumeToCanvas(ctx, { x, baseY: floorY, height: size, rng, colors: colors.plume })
  }
  else {
    paintForestFloorContactShadow(ctx, x, floorY, 14, 4.5, colors)
    drawSmallMushroomGroupToCanvas(ctx, { x, baseY: floorY, rng, colors: { ...colors.mushroom, contactShadow: colors.contactShadow } })
  }
}
//
// Boulder heap under its moss first, then ferns, grass tufts, mushrooms at the
// feet and two red spotted accents, as on the reference hill. Plants that
// would cover a trunk, trampoline or stalk eye are skipped.
//
function paintHill(ctx, inst, rng) {
  const { hill, colors, floorY } = inst
  drawMossyHillToCanvas(ctx, { hill, rng, colors: colors.hill, erodedSoil: true })
  hillPlantXs(inst, HILL_FERNS_T).forEach(x => {
    const size = FERN_SIZE_MIN + rng() * FERN_SIZE_RANGE
    const baseY = hillPlantY(hill, x)
    paintForestFloorContactShadow(ctx, x, baseY, size * 0.4, 5, colors)
    drawFernToCanvas(ctx, { x, baseY, size, rng, colors: colors.fern })
  })
  hillPlantXs(inst, hillTuftTs()).forEach(x => {
    const baseY = hillPlantY(hill, x)
    paintForestFloorContactShadow(ctx, x, baseY, 9, 3.2, colors)
    drawGrassTuftToCanvas(ctx, { x, baseY, rng, colors: { ...colors.tuft, contactShadow: colors.contactShadow } })
  })
  hillPlantXs(inst, HILL_MUSH_T).forEach(x => {
    paintForestFloorContactShadow(ctx, x, floorY, 14, 4.5, colors)
    drawSmallMushroomGroupToCanvas(ctx, { x, baseY: floorY, rng, colors: { ...colors.mushroom, contactShadow: colors.contactShadow } })
  })
  hillPlantXs(inst, HILL_SPOT_MUSH_T).forEach(x => {
    paintForestFloorContactShadow(ctx, x, floorY, 12, 4, colors)
    drawSpottedMushroomToCanvas(ctx, { x, baseY: floorY, colors: colors.spotted })
  })
}
function hillPlantXs(inst, ts) {
  return ts.map(t => inst.hill.x1 + (inst.hill.x2 - inst.hill.x1) * t).filter(x => inst.isSpotFree(x, HILL_PLANT_HALF_W))
}
function hillTuftTs() {
  const ts = []
  for (let t = HILL_TUFT_STEP_T; t < 1; t += HILL_TUFT_STEP_T) ts.push(t)
  return ts
}
function hillPlantY(hill, x) {
  return mossyHillTopY(hill, x) + HILL_PLANT_SINK
}
function paintForestFloorContactShadow(ctx, x, baseY, rx, ry, colors) {
  colors.contactShadow && paintForestContactShadow(ctx, x, baseY, rx, ry, colors.contactShadow)
}
function viewXRange(k) {
  const cam = k.getCamPos()
  const half = k.width() / 2 / (k.getCamScale().x || 1)
  return { x1: cam.x - half - VIEW_CULL_PAD, x2: cam.x + half + VIEW_CULL_PAD }
}
