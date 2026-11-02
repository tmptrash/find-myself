import { drawGroundRimToCanvas, groundRimBounds } from '../../../utils/draw-ground-rim.js'
import { createSeededRandom, nextSeed } from '../../../utils/seeded-random.js'
import { forestContactShadowRgb, paintForestContactShadow } from '../utils/forest-atmosphere.js'
import { FOREST_PAL } from '../utils/forest-palette.js'
import { drawStaticDecorSprite, ensureStaticDecorSprite, isWorldSpanInView } from '../utils/forest-static-bake.js'
import { loadPictureImage } from '../utils/forest-picture.js'
import { drawForestPlant, forestPlantBounds } from '../utils/forest-plants.js'
import { drawForestMushroom, forestMushroomBounds } from '../utils/forest-mushrooms.js'
//
// Colour-world forest floor dressing from the reference art: the ragged
// ground rim and one wide mossy hill behind the hero (a picture,
// assets/forest/hill.png, loaded with this module), patches of picture
// plants (forest-plants.js) mostly behind him and some low ones in front of
// him, and picture mushrooms (forest-mushrooms.js) on the ground. This
// module only lays the pieces out. Everything is baked once per live Kaplay instance into
// a few chunk sprites (film grain applied by forest-static-bake), then blitted
// with one drawSprite per visible chunk — no per-plant objects or draws.
//
const LAYOUT_SEED = 40213
const CHUNK_W = 420
const BAKE_VARIANT = 'v11'
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
// Patch plants grow FOREGROUND_SCALE times the sizes above. Most patches
// stand behind the hero; FRONT_PATCH_SHARE of them stand in front of him,
// their plants never taller than FRONT_PLANT_MAX_H (the hero is taller).
//
const FOREGROUND_SCALE = 1.2
const FRONT_PATCH_SHARE = 0.35
const FRONT_PLANT_MAX_H = 56
//
// Ordinary mushroom groups behind the hero.
//
const MUSH_STEP_MIN = 210
const MUSH_STEP_RANGE = 170
const MUSH_GROUP_HALF_W = 16
//
// The hill on its picture (px; its bottom row stands on the ground line,
// HILL_SINK px under it) and its width in the world; the slope climbs to
// the right edge.
//
const HILL_URL = 'forest/hill.png'
const HILL_RECT = { x: 33, y: 128, w: 1979, h: 555 }
const HILL_W = 680
const HILL_SINK = 3
const HILL_BOUNDS_PAD = 2
const hillPicture = loadPictureImage(HILL_URL)
let hillImage = null

/**
 * Waits for the hill picture (once per page); create() needs it to bake the hill.
 * @returns {Promise<void>}
 */
export async function loadForestFloorHill() {
  hillImage ??= await hillPicture
}

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
    hill: { x1: hillX2 - HILL_W, x2: hillX2, floorY, height: HILL_W * HILL_RECT.h / HILL_RECT.w },
    back: [],
    front: []
  }
  const rng = createSeededRandom(LAYOUT_SEED)
  const patchItems = buildPatchItems(inst, rng, xMin, xMax)
  const backItems = [...buildRimItems(rimSpans, rng), ...buildBackItems(inst, rng, xMin, xMax), ...patchItems.filter(item => !item.front)]
  inst.back = bakeChunks(inst, backItems, 'back', SEED_BACK)
  inst.front = bakeChunks(inst, patchItems.filter(item => item.front), 'front', SEED_FRONT)
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
 * @returns {Object} Colours keyed by painter (fern, hill, rim)
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
function buildPatchItems(inst, rng, xMin, xMax) {
  const items = []
  let x = xMin + rng() * PATCH_GAP_MIN
  while (x < xMax) {
    const front = rng() < FRONT_PATCH_SHARE
    const isPlume = rng() < PATCH_PLUME_CHANCE
    const count = isPlume
      ? PATCH_PLUME_COUNT_MIN + Math.floor(rng() * PATCH_PLUME_COUNT_RANGE)
      : PATCH_FERN_COUNT_MIN + Math.floor(rng() * PATCH_FERN_COUNT_RANGE)
    for (let i = 0; i < count; i++) {
      const edge = i === 0 || i === count - 1
      const plant = buildPatchPlant(inst, rng, x, isPlume, edge, front)
      plant && items.push(plant)
      x += PATCH_STEP_MIN + rng() * PATCH_STEP_RANGE
    }
    x += PATCH_GAP_MIN + rng() * PATCH_GAP_RANGE
  }
  return items
}
//
// One plant of a patch; edge plants are smaller so the patch fades out, and
// plants in front of the hero stay lower than him.
//
function buildPatchPlant(inst, rng, x, isPlume, edge, front) {
  const halfW = isPlume ? FRONT_PLUME_HALF_W : FRONT_FERN_HALF_W
  const base = (isPlume ? PLUME_H_MIN + rng() * PLUME_H_RANGE : FERN_SIZE_MIN + rng() * FERN_SIZE_RANGE) * FOREGROUND_SCALE
  const grown = edge ? base * PATCH_EDGE_SIZE_MULT : base
  const size = front ? Math.min(grown, FRONT_PLANT_MAX_H) : grown
  const seed = nextSeed(rng)
  if (isInHill(inst, x, halfW) || !inst.isSpotFree(x, halfW) || isNearAccent(inst, x, halfW)) return null
  return { kind: isPlume ? KIND.PLUME : KIND.FERN, x, size, seed, front }
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
  if (item.kind === KIND.HILL) return hillBounds(inst.hill)
  if (item.kind === KIND.FERN) return forestPlantBounds(item.x, inst.floorY, item.size)
  if (item.kind === KIND.PLUME) return forestPlantBounds(item.x, inst.floorY, item.size)
  return forestMushroomBounds(item.x, inst.floorY)
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
  else if (item.kind === KIND.HILL) paintHill(ctx, inst)
  else if (item.kind === KIND.FERN) {
    paintForestFloorContactShadow(ctx, x, floorY, size * 0.42, 5, colors)
    drawForestPlant(ctx, { x, baseY: floorY, size, rng })
  }
  else if (item.kind === KIND.PLUME) {
    paintForestFloorContactShadow(ctx, x, floorY, size * 0.22, 4, colors)
    drawForestPlant(ctx, { x, baseY: floorY, size, rng })
  }
  else {
    paintForestFloorContactShadow(ctx, x, floorY, 14, 4.5, colors)
    drawForestMushroom(ctx, { x, baseY: floorY, rng })
  }
}
//
// The hill picture standing on the ground line (nothing if it failed to load).
//
function paintHill(ctx, inst) {
  const { hill } = inst
  if (!hillImage) return
  ctx.save()
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(hillImage, HILL_RECT.x, HILL_RECT.y, HILL_RECT.w, HILL_RECT.h,
    hill.x1, hill.floorY + HILL_SINK - hill.height, hill.x2 - hill.x1, hill.height)
  ctx.restore()
}
//
// World rect of the hill picture.
//
function hillBounds(hill) {
  return {
    x1: hill.x1 - HILL_BOUNDS_PAD,
    y1: hill.floorY + HILL_SINK - hill.height - HILL_BOUNDS_PAD,
    x2: hill.x2 + HILL_BOUNDS_PAD,
    y2: hill.floorY + HILL_SINK + HILL_BOUNDS_PAD
  }
}
function paintForestFloorContactShadow(ctx, x, baseY, rx, ry, colors) {
  colors.contactShadow && paintForestContactShadow(ctx, x, baseY, rx, ry, colors.contactShadow)
}
function viewXRange(k) {
  const cam = k.getCamPos()
  const half = k.width() / 2 / (k.getCamScale().x || 1)
  return { x1: cam.x - half - VIEW_CULL_PAD, x2: cam.x + half + VIEW_CULL_PAD }
}
