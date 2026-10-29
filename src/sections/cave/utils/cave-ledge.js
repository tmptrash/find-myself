import { createSeededRandom } from '../../../utils/seeded-random.js'
import { CAVE_CFG } from '../cfg.js'
import * as Layout from './cave-layout.js'
import { css, paintEdgeFern, paintMossStrand, smoothPath, fillEllipse, polygonBounds, sampleEdge, insidePath } from './cave-paint.js'
//
// Heavy cave rock ledges (the reference's mossy rubble platform), baked
// into the terrain canvas. A ledge grows out of its wall: a thick body
// tapering toward the free end, its top lip jutting out over the body,
// rock masses bulging from the irregular underside. The body is packed
// rubble: irregular stones of very different sizes (big ones first, then
// medium, then small ones filling the gaps) with dark gaps between them;
// stones on the rim stick out, so the silhouette is made of stones, while
// the walkable top stays flat. Each stone is faceted — lit up-left, shaded
// down-right — light grey near the light, sinking to cool slate below.
// Green only as small plants: grass tufts and leaf sprigs on top and on the
// upper stones, ferns and tiny mushrooms, short vines over the lip; roots
// and vines hang from the underside. The walkable line is the platform's
// y: the collider is untouched.
//
const C = CAVE_CFG.ledge.colors
const ART_PAD = 24
const EDGE_STEP = 6
const CAP_STEPS = 10
//
// The body is painted only this far into the wall's rock (no dark strip
// over the wall face).
//
const WALL_TUCK = 10
//
// Ground platforms: how deep the stones sink into full shadow, how ragged
// the open face is.
//
const GROUND_SHADE_DEPTH = 220
const GROUND_FACE_JAG = 10
const NOISE_A = 1.3
const NOISE_B = 4.1
//
// Underside: taper curve toward the free end, small jag on top of lobes.
//
const TAPER_POW = 1.4
const UNDER_JAG = 5
const UNDER_JAG_FREQ = 3.2
const LOBE_FROM = 0.08
const LOBE_SPAN = 0.8
const CAP_POW = 1.6
const CAP_JAG = 4
//
// Rubble packing (size classes in the style): how close neighbours may
// sit, stones kept a little under the walkable top; stones are drawn a bit
// bigger than their packing size so neighbours touch with thin dark gaps.
//
const PACK_OVERLAP = 0.8
const STONE_GROW = 1.12
const PACK_TOP_CLEAR = 0
const PACK_CELL = 24
//
// One stone: vertex count, radius wobble, flattened sides, the facet point
// (up-left of the centre), outline and lit edge widths.
//
const STONE_VERTS_MIN = 6
const STONE_VERTS_RANGE = 4
const STONE_WOBBLE = 0.22
const STONE_FLAT_CHANCE = 0.35
const STONE_FLAT_PULL = 0.82
const STONE_SQUASH = 0.85
const FACET_DX = -0.18
const FACET_DY = -0.24
const FACET_LIT_FROM = -2.7
const FACET_LIT_TO = -0.5
const FACET_SHADE_FROM = 0
const FACET_SHADE_TO = 2
const FACET_LIT_ALPHA = 0.55
const FACET_SHADE_ALPHA = 0.5
const STONE_OUTLINE_W = 1.4
const STONE_LIT_W = 1.3
const STONE_LIT_INSET = 1
//
// Ragged edges: displacement as a share of the edge length (capped by the
// stone size), subdivision levels.
//
const ROUGH_SHARE = 0.16
const ROUGH_MAX = 0.18
const ROUGH_LEVELS = 3
//
// Chips and hairline cracks: one per this much radius, length (share of
// the radius), strength.
//
const CHIP_PER_R = 9
const CHIP_LEN_MIN = 0.25
const CHIP_LEN_RANGE = 0.35
const CHIP_ALPHA = 0.55
const CHIP_LIT_ALPHA = 0.4
//
// Depth: share of the body's depth to the darkest stone tone; light also
// fades toward the wall side.
//
const DEPTH_POW = 0.8
const WALL_DARK = 0.25
//
// Gaps between the stones: blotches of earth and grit greys and now and
// then a patch of moss (only the gaps show them), plus grit specks; counts
// per px² of body.
//
const GAP_BLOTCHES = 0.006
const GAP_R_MIN = 3
const GAP_R_RANGE = 9
const GAP_FLAT = 0.7
const GAP_MOSS_CHANCE = 0.18
const GAP_SPECKS = 0.01
//
// Moss lying on the top (thickness from the style, swelling and thinning
// along it), and the strip of greens in front of the hero (how far it
// reaches above / below the top, side pad, how deep the plants root).
//
const MOSS_STEP = 3
const MOSS_FREQ = 0.4
const MOSS_COVER = 1.6
const MOSS_BARE = 0.02
const MOSS_MIN = 2
const MOSS_R = 4
const MOSS_JITTER = 3
const MOSS_LIGHT_CHANCE = 0.45
const FRONT_ABOVE = 24
const FRONT_BELOW = 10
const FRONT_PAD = 12
const FRONT_SINK = 1
//
// Greens on stones near the top (chance falls with depth).
//
const CAP_CHANCE = 0.55
const CAP_DEPTH = 0.4
//
// Greens: top step for grass and leaf sprigs, what
// a stone near the top grows (shares of grass, leaves, the rest a short
// vine), small leaves, vines over the lip and under the body; mushroom cap
// squash.
//
const TOP_STEP = 6
const GRASS_FREQ = 0.5
const GRASS_PATCHY = 1.3
const GRASS_SIZE_MIN = 0.35
const GRASS_SIZE_RANGE = 2
const GRASS_SIZE_POW = 2.2
//
// Kinds of top plants (shares; the rest are flowers), small fern size,
// flowers: count, stem height range, lean, bloom radius, spread.
//
const PLANT_GRASS = 0.5
const PLANT_SPRIG = 0.22
const PLANT_FERN = 0.14
const TOP_FERN_SCALE = 0.3
const FLOWER_MAX = 3
const FLOWER_H_MIN = 5
const FLOWER_H_RANGE = 9
const FLOWER_LEAN = 0.35
const FLOWER_R = 1.6
const FLOWER_SPREAD = 6
const GREEN_GRASS = 0.4
const GREEN_LEAVES = 0.4
const STONE_VINE_MIN = 8
const STONE_VINE_RANGE = 18
const SPRIG_LEAVES_MIN = 2
const SPRIG_LEAVES_RANGE = 3
const SPRIG_FAN = 2
const SPRIG_JITTER = 0.4
const SPRIG_LEN_MIN = 3.5
const SPRIG_LEN_RANGE = 3.5
const LEAF_W = 0.38
const LEAF_EDGE_W = 0.8
const LEAF_RIB_FROM = 0.15
const LEAF_RIB_TO = 0.75
const HANG_STEP = 9
const HANG_LIP = 2
const HANG_LEN_MIN = 10
const HANG_LEN_RANGE = 26
const HANG_UNDER_EVERY = 2
const FLAT = 0.6
//
// Plants: fern size, grass blades, mushrooms, ground spread from the ends.
//
const FERN_SCALE = 0.5
const FERN_RANGE = 0.3
const FERN_TILT = 0.4
const TUFT_BLADES_MIN = 3
const TUFT_BLADES = 4
const TUFT_LEN_MIN = 4
const TUFT_LEN_RANGE = 8
const TUFT_SPREAD = 7
const PLANT_FROM = 0.15
const PLANT_SPAN = 0.8
const SHROOM_COUNT = 3
const SHROOM_H_MIN = 5
const SHROOM_H_RANGE = 7
const SHROOM_CAP = 3.2
const SHROOM_SPREAD = 9
//
// Hanging roots and long vines.
//
const ROOT_LEN_MIN = 30
const ROOT_LEN_RANGE = 70
const ROOT_W = 3.2
const ROOT_STEPS = 14
const ROOT_HUG = 0.35
const ROOT_WIGGLE = 6
const HALF = 0.5
const FULL_TURN = Math.PI * 2

/**
 * Paints a rock ledge in the given style into the terrain canvas.
 * @param {CanvasRenderingContext2D} ctx - World-space terrain context
 * @param {Object} p - Layout.PLATFORMS entry (walkable top p.y, wall side)
 * @param {Object} style - Style from CAVE_CFG.ledge (e.g. .wide)
 * @param {{x1: number, x2: number}} moss - Span the moss and plants keep to (outside the wall rock)
 * @returns {{swaying: Array<{x: number, y: number}>, front: {canvas: HTMLCanvasElement, x: number, y: number}}}
 *   pin points of the vines left to sway (drawn live), and a strip of top
 *   greens to draw in front of the hero (canvas at world x / y)
 */
export function paintLedge(ctx, p, style, moss) {
  const rng = createSeededRandom(style.seed)
  return paintRock(ctx, ledgeGeometry(p, style, rng), style, moss, rng)
}

/**
 * Paints a free-standing rock bridge in the ledge look: the top arches up
 * over the middle, the underside arches up higher (thick ends, thin
 * middle), both ends ragged and uneven.
 * @param {CanvasRenderingContext2D} ctx - World-space context
 * @param {{x1: number, x2: number, y: number}} p - Span and the top's height at the ends
 * @param {Object} style - Ledge style (thick, archRise, archMid, endJag, endBulge …)
 * @param {{x1: number, x2: number}} moss - Span the moss and plants keep to
 * @returns {{swaying: Array, front: Object}} As paintLedge
 */
export function paintBridge(ctx, p, style, moss) {
  const rng = createSeededRandom(style.seed)
  return paintRock(ctx, bridgeGeometry(p, style, rng), style, moss, rng)
}
//
// Rubble body, roots, vines, stone greens, moss and plants of a ledge or
// bridge from its geometry.
//
function paintRock(ctx, geo, style, moss, rng) {
  const body = smoothPath(geo.outline)
  const bounds = polygonBounds(geo.outline)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const greens = []
  const room = outOfWall(geo, bounds)
  const below = belowTop(geo, bounds)
  ctx.save()
  ctx.clip(room)
  ctx.clip(below)
  paintRubble(ctx, {
    path: body,
    bounds,
    sizes: style.stones,
    colors: style.colors,
    inside: (x, y) => insidePath(ctx, body, x, y),
    shadeAt: st => ledgeShade(st, geo, bounds),
    onStone: (st, shade) => shade < CAP_DEPTH && rng() < CAP_CHANCE * (1 - shade / CAP_DEPTH) && insidePath(ctx, room, st.x, st.y) && greens.push(st)
  }, rng)
  ctx.restore()
  const swaying = []
  paintRoots(ctx, geo, style, rng)
  paintVines(ctx, geo, style, swaying, rng)
  paintHangers(ctx, geo, style, moss, swaying, rng)
  greens.forEach(g => paintStoneGreen(ctx, g, rng))
  const front = frontStrip(geo, moss)
  paintTopMoss(ctx, geo, style, moss, rng)
  paintPlants(ctx, geo, style, moss, rng)
  paintTopGreens(ctx, front.ctx, geo, style, moss, rng)
  return { swaying, front: { canvas: front.canvas, x: front.x, y: front.y } }
}
//
// A canvas covering the strip along the top, in world coordinates, for the
// greens that stand in front of the hero.
//
function frontStrip(geo, moss) {
  const x = Math.floor(moss.x1 - FRONT_PAD)
  const y = Math.floor(geo.topAt(moss.x1) - FRONT_ABOVE)
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(moss.x2 - moss.x1 + FRONT_PAD * 2)
  canvas.height = FRONT_ABOVE + FRONT_BELOW
  const ctx = canvas.getContext('2d')
  ctx.translate(-x, -y)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  return { canvas, ctx, x, y }
}
//
// Moss lying in patches along the top over the stones' upper edge (bare
// stone between them, lumps of uneven height): a dark rooted base and
// lumps of green, lighter where the light falls (behind the hero).
//
function paintTopMoss(ctx, geo, style, moss, rng) {
  const [shadow, dark, olive, mid, light] = C.moss
  const seed = rng() * FULL_TURN
  for (let x = moss.x1; x <= moss.x2; x += MOSS_STEP) {
    const thick = style.topMoss * Math.max(0, Layout.profileNoise(x * MOSS_FREQ, seed) * MOSS_COVER - MOSS_BARE) * (HALF + rng())
    if (thick < MOSS_MIN) continue
    const y = geo.topAt(x) - rng() * MOSS_JITTER
    ctx.fillStyle = css(shadow)
    fillEllipse(ctx, x, y + thick * HALF + 1, MOSS_R, thick * HALF + 1)
    ctx.fillStyle = css(rng() < HALF ? dark : olive)
    fillEllipse(ctx, x, y + thick * HALF, MOSS_R * (HALF + rng() * HALF), thick * HALF)
    rng() < MOSS_LIGHT_CHANCE && (ctx.fillStyle = css(rng() < HALF ? mid : light), fillEllipse(ctx, x, y + 1, MOSS_R * HALF, MOSS_R * HALF * FLAT))
  }
}


/**
 * Paints a ground platform (solid down to the world bottom) in the rubble
 * style: stones darkening with depth, moss and plants on top, a ragged face
 * toward the open side.
 * @param {CanvasRenderingContext2D} ctx - World-space terrain context
 * @param {Object} p - Layout.PLATFORMS entry of kind GROUND
 * @param {Object} style - Style from CAVE_CFG.ledge
 * @param {{x1: number, x2: number}} moss - Span the moss and plants keep to
 * @returns {{swaying: Array, front: {canvas: HTMLCanvasElement, x: number, y: number}}}
 */
export function paintGround(ctx, p, style, moss) {
  const rng = createSeededRandom(style.seed)
  const span = Layout.platformArtSpan(p)
  const seed = rng() * FULL_TURN
  const topAt = x => p.y + Layout.profileNoise(x * NOISE_A, seed) * style.topWave
  const faceAt = y => span.x1 - Layout.profileNoise(y * NOISE_A, seed + NOISE_B) * GROUND_FACE_JAG
  const top = sampleEdge(span.x1, span.x2 + ART_PAD, EDGE_STEP, x => ({ x, y: topAt(x) }))
  const face = sampleEdge(Layout.WORLD_H + ART_PAD, p.y, EDGE_STEP, y => ({ x: faceAt(y), y }))
  const outline = [...top, { x: span.x2 + ART_PAD, y: Layout.WORLD_H + ART_PAD }, ...face]
  const body = smoothPath(outline)
  const bounds = polygonBounds(outline)
  const geo = { topAt }
  ctx.save()
  ctx.clip(belowTop(geo, bounds))
  paintRubble(ctx, {
    path: body,
    bounds,
    sizes: style.stones,
    inside: (x, y) => x > faceAt(y) && y > topAt(x),
    shadeAt: st => Math.min(1, Math.pow(Math.max(0, st.y - topAt(st.x)) / GROUND_SHADE_DEPTH, DEPTH_POW))
  }, rng)
  ctx.restore()
  const front = frontStrip(geo, moss)
  paintTopMoss(ctx, geo, style, moss, rng)
  paintPlants(ctx, geo, style, moss, rng)
  paintTopGreens(ctx, front.ctx, geo, style, moss, rng)
  return { swaying: [], front: { canvas: front.canvas, x: front.x, y: front.y } }
}
/**
 * Paints packed rubble filling an area: a dark backing with grit and moss
 * in the gaps, then faceted stones of very different sizes (big first,
 * small ones filling the gaps), each shaded by how deep it sits.
 * @param {CanvasRenderingContext2D} ctx - World-space context (clip as needed)
 * @param {Object} cfg
 * @param {Path2D} cfg.path - Area outline (backing and gaps)
 * @param {{x: number, y: number, w: number, h: number}} cfg.bounds - Area box
 * @param {Array<{r: number, range: number, tries: number}>} cfg.sizes - Stone size classes, big first
 * @param {(x: number, y: number) => boolean} cfg.inside - Is a stone centre inside the area
 * @param {(st: Object) => number} cfg.shadeAt - Shadow of a stone, 0 lit … 1 darkest
 * @param {(st: Object, shade: number) => void} [cfg.onStone] - Called for every stone painted
 * @param {Object} [cfg.colors] - {void, rock, rockLit, gaps} (defaults to the light ledge stone)
 * @param {() => number} rng - Seeded random
 */
export function paintRubble(ctx, cfg, rng) {
  const stones = packStones(cfg.inside, cfg.bounds, cfg.sizes, rng)
  const colors = cfg.colors ?? C
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.fillStyle = css(colors.void)
  ctx.fill(cfg.path)
  ctx.save()
  ctx.clip(cfg.path)
  paintGaps(ctx, cfg.bounds, colors, rng)
  ctx.restore()
  stones.forEach(st => {
    const shade = cfg.shadeAt(st)
    paintStone(ctx, st, shade, colors, rng)
    cfg.onStone?.(st, shade)
  })
  ctx.restore()
}
//
// Top line, underside and outline of a ledge growing from its wall: the
// free end is at x2 for a left-wall ledge (mirrored for the right wall).
//
function ledgeGeometry(p, style, rng) {
  const left = p.wall !== 'right'
  const span = Layout.platformArtSpan(p)
  const wallX = left ? span.x1 - ART_PAD : span.x2 + ART_PAD
  const tipX = left ? span.x2 : span.x1
  const len = Math.abs(tipX - wallX)
  const u = x => Math.abs(x - wallX) / len
  const seed = rng() * FULL_TURN
  const lobes = []
  for (let i = 0; i < style.lobes; i++) lobes.push({ u: LOBE_FROM + rng() * LOBE_SPAN, d: style.lobeDepth * (HALF + rng()), w: style.lobeWidth * (HALF + rng()) })
  const topAt = x => p.y + Layout.profileNoise(x * NOISE_A, seed) * style.topWave
  const thickAt = x => {
    const t = u(x)
    const base = style.thick * (1 - (1 - style.tipShare) * Math.pow(t, TAPER_POW))
    const lobe = lobes.reduce((sum, l) => sum + l.d * Math.exp(-Math.pow((t - l.u) / l.w, 2)), 0)
    return base + lobe + Layout.profileNoise(x * UNDER_JAG_FREQ, seed + NOISE_B) * UNDER_JAG
  }
  const bottomAt = x => topAt(x) + thickAt(x)
  const sign = left ? 1 : -1
  const capX = tipX - sign * style.overhang
  const top = sampleEdge(wallX, tipX, EDGE_STEP, x => ({ x, y: topAt(x) }))
  const capBottom = bottomAt(capX)
  const capBulge = (rng() * 2 - 1) * (style.endBulge ?? 0)
  const cap = []
  for (let i = 1; i <= CAP_STEPS; i++) {
    const s = i / CAP_STEPS
    cap.push({ x: tipX - sign * style.overhang * Math.pow(s, CAP_POW) + sign * capBulge * Math.sin(Math.PI * s) + (rng() - HALF) * (style.endJag ?? CAP_JAG), y: topAt(tipX) + (capBottom - topAt(tipX)) * s })
  }
  const under = sampleEdge(capX, wallX, EDGE_STEP, x => ({ x, y: bottomAt(x) }))
  return { left, wallX, tipX, sign, topAt, bottomAt, top, under, outline: [...top, ...cap, ...under] }
}
//
// Rubble stones inside the body: each size class in turn (big first), a
// stone is kept when its centre is in the body and it does not overlap
// the stones already placed (a coarse grid keeps the check cheap).
//
function packStones(inside, bounds, sizes, rng) {
  const stones = []
  const grid = new Map()
  sizes.forEach(cls => {
    const tries = Math.round(bounds.w * bounds.h / (cls.r * cls.r) * cls.tries)
    for (let i = 0; i < tries; i++) {
      const st = { x: bounds.x + rng() * bounds.w, y: bounds.y + rng() * bounds.h, r: cls.r * (1 - cls.range + rng() * cls.range) }
      inside(st.x, st.y) && fits(grid, st) && (stones.push(st), addToGrid(grid, st))
    }
  })
  return stones
}
//
// How deep a ledge stone sits in shadow (0 lit … 1 darkest): down from the
// top, and toward the wall.
//
function ledgeShade(st, geo, bounds) {
  const depth = Math.pow(Math.max(0, Math.min(1, (st.y - geo.topAt(st.x)) / (bounds.y + bounds.h - geo.topAt(st.x)))), DEPTH_POW)
  const fromWall = Math.abs(st.x - geo.wallX) / Math.abs(geo.tipX - geo.wallX)
  return Math.min(1, depth + (1 - fromWall) * WALL_DARK)
}
function gridKey(cx, cy) {
  return `${cx},${cy}`
}
function fits(grid, st) {
  const cx = Math.floor(st.x / PACK_CELL)
  const cy = Math.floor(st.y / PACK_CELL)
  const reach = Math.ceil(st.r * 2 / PACK_CELL) + 1
  for (let gx = cx - reach; gx <= cx + reach; gx++) {
    for (let gy = cy - reach; gy <= cy + reach; gy++) {
      const cell = grid.get(gridKey(gx, gy))
      if (cell && cell.some(o => Math.hypot(o.x - st.x, o.y - st.y) < (o.r + st.r) * PACK_OVERLAP)) return false
    }
  }
  return true
}
function addToGrid(grid, st) {
  const key = gridKey(Math.floor(st.x / PACK_CELL), Math.floor(st.y / PACK_CELL))
  const cell = grid.get(key)
  cell ? cell.push(st) : grid.set(key, [st])
}
//
// A rock bridge: arched top, an underside arching higher (thick ends, thin
// middle), and two ragged ends, each bulging its own way.
//
function bridgeGeometry(p, style, rng) {
  const len = p.x2 - p.x1
  const seed = rng() * FULL_TURN
  const arch = x => Math.sin(Math.PI * Math.max(0, Math.min(1, (x - p.x1) / len)))
  const topAt = x => p.y - style.archRise * arch(x) + Layout.profileNoise(x * NOISE_A, seed) * style.topWave
  const thickAt = x => style.thick * (style.archMid + (1 - style.archMid) * (1 - arch(x))) + Layout.profileNoise(x * UNDER_JAG_FREQ, seed + NOISE_B) * UNDER_JAG
  const bottomAt = x => topAt(x) + thickAt(x)
  const end = (x, out) => {
    const bulge = (rng() * 2 - 1) * style.endBulge
    const pts = []
    for (let i = 1; i < CAP_STEPS; i++) {
      const s = i / CAP_STEPS
      pts.push({ x: x + out * (bulge * Math.sin(Math.PI * s) + (rng() - HALF) * style.endJag), y: topAt(x) + (bottomAt(x) - topAt(x)) * s })
    }
    return pts
  }
  const top = sampleEdge(p.x1, p.x2, EDGE_STEP, x => ({ x, y: topAt(x) }))
  const under = sampleEdge(p.x2, p.x1, EDGE_STEP, x => ({ x, y: bottomAt(x) }))
  return { left: true, wallX: p.x1, tipX: p.x2, sign: 1, topAt, bottomAt, top, under, outline: [...top, ...end(p.x2, 1), ...under, ...end(p.x1, -1).reverse()] }
}
//
// Space out of the wall's rock (its ragged face, tucked in a little): the
// ledge is painted only there, so it grows from the wall without a strip
// over the wall face.
//
function outOfWall(geo, bounds) {
  const path = new Path2D()
  const far = geo.left ? bounds.x + bounds.w * 2 : bounds.x - bounds.w
  const y1 = bounds.y - bounds.h
  const y2 = bounds.y + bounds.h * 2
  const faceAt = y => (geo.left ? Layout.leftWallX(y) - WALL_TUCK : Layout.rightWallX(y) + WALL_TUCK)
  path.moveTo(faceAt(y1), y1)
  for (let y = y1; y <= y2; y += EDGE_STEP) path.lineTo(faceAt(y), y)
  path.lineTo(far, y2)
  path.lineTo(far, y1)
  path.closePath()
  return path
}
//
// The gaps between stones: earth and grit blotches of several greys, some
// moss patches, grit specks (stones painted after cover all but the gaps).
//
function paintGaps(ctx, bounds, colors, rng) {
  const area = bounds.w * bounds.h
  const greys = colors.gaps.slice(0, -2)
  const mosses = colors.gaps.slice(-2)
  for (let i = 0; i < area * GAP_BLOTCHES; i++) {
    const r = GAP_R_MIN + rng() * GAP_R_RANGE
    const tones = rng() < GAP_MOSS_CHANCE ? mosses : greys
    ctx.fillStyle = css(tones[Math.floor(rng() * tones.length)])
    fillEllipse(ctx, bounds.x + rng() * bounds.w, bounds.y + rng() * bounds.h, r, r * GAP_FLAT)
  }
  for (let i = 0; i < area * GAP_SPECKS; i++) {
    ctx.fillStyle = css(greys[Math.floor(rng() * greys.length)])
    ctx.fillRect(Math.round(bounds.x + rng() * bounds.w), Math.round(bounds.y + rng() * bounds.h), 1, 1)
  }
}
//
// Everything below the walkable top (stones never rise above it).
//
function belowTop(geo, bounds) {
  const path = new Path2D()
  const xs = []
  for (let x = bounds.x - EDGE_STEP; x <= bounds.x + bounds.w + EDGE_STEP; x += EDGE_STEP) xs.push(x)
  xs.forEach((x, i) => (i ? path.lineTo(x, geo.topAt(x) + PACK_TOP_CLEAR) : path.moveTo(x, geo.topAt(x) + PACK_TOP_CLEAR)))
  path.lineTo(xs[xs.length - 1], bounds.y + bounds.h * 2)
  path.lineTo(xs[0], bounds.y + bounds.h * 2)
  path.closePath()
  return path
}
//
// One faceted stone: base tone by its shade, lit facets up-left, shaded
// facets down-right, a dark outline, a lit upper edge.
//
function paintStone(ctx, st, shade, colors, rng) {
  const corners = stoneOutline(st, rng)
  const edges = corners.map((a, k) => fractalLine(a, corners[(k + 1) % corners.length], st.r, rng))
  const f = { x: st.x + st.r * FACET_DX, y: st.y + st.r * FACET_DY }
  const spokes = corners.map(a => fractalLine(f, a, st.r, rng))
  const tone = colors.rock[Math.min(colors.rock.length - 1, Math.floor(shade * colors.rock.length))]
  const lit = colors.rockLit[Math.min(colors.rockLit.length - 1, Math.floor(shade * colors.rockLit.length))]
  const path = closed(edges.flat())
  ctx.fillStyle = css(tone)
  ctx.fill(path)
  ctx.save()
  ctx.clip(path)
  corners.forEach((a, k) => {
    const next = (k + 1) % corners.length
    const b = corners[next]
    const face = Math.atan2((a.y + b.y) / 2 - st.y, (a.x + b.x) / 2 - st.x)
    const isLit = face > FACET_LIT_FROM && face < FACET_LIT_TO
    const isShade = face > FACET_SHADE_FROM && face < FACET_SHADE_TO
    if (!isLit && !isShade) return
    ctx.fillStyle = isLit ? css(lit, FACET_LIT_ALPHA * (1 - shade * HALF)) : css(colors.void, FACET_SHADE_ALPHA)
    ctx.fill(closed([...spokes[k], ...edges[k], ...spokes[next].slice().reverse()]))
  })
  paintChips(ctx, st, lit, shade, colors.void, rng)
  ctx.restore()
  ctx.strokeStyle = css(colors.void)
  ctx.lineWidth = STONE_OUTLINE_W
  ctx.stroke(path)
  ctx.strokeStyle = css(lit, 1 - shade * HALF)
  ctx.lineWidth = STONE_LIT_W
  ctx.beginPath()
  corners.forEach((a, k) => {
    const b = corners[(k + 1) % corners.length]
    const face = Math.atan2((a.y + b.y) / 2 - st.y, (a.x + b.x) / 2 - st.x)
    if (face <= FACET_LIT_FROM || face >= FACET_LIT_TO) return
    edges[k].forEach((q, n) => {
      const x = q.x + (st.x - q.x) * STONE_LIT_INSET / st.r
      const y = q.y + (st.y - q.y) * STONE_LIT_INSET / st.r
      n ? ctx.lineTo(x, y) : ctx.moveTo(x, y)
    })
  })
  ctx.stroke()
}
//
// Irregular stone corners: jittered, some pulled in (flat sides).
//
function stoneOutline(st, rng) {
  const n = STONE_VERTS_MIN + Math.floor(rng() * STONE_VERTS_RANGE)
  const turn = rng() * FULL_TURN
  const pts = []
  for (let i = 0; i < n; i++) {
    const a = turn + (i + (rng() - HALF) * HALF) / n * FULL_TURN
    const flat = rng() < STONE_FLAT_CHANCE ? STONE_FLAT_PULL : 1
    const r = st.r * STONE_GROW * (1 + (rng() - HALF) * STONE_WOBBLE * 2) * flat
    pts.push({ x: st.x + Math.cos(a) * r, y: st.y + Math.sin(a) * r * STONE_SQUASH })
  }
  return pts
}
//
// A ragged line from a to b (b excluded): midpoint displacement sideways,
// halving each level, scaled with the stone — chipped edges and uneven
// facet borders instead of ruler lines.
//
function fractalLine(a, b, r, rng) {
  let pts = [a, b]
  let amp = Math.min(Math.hypot(b.x - a.x, b.y - a.y) * ROUGH_SHARE, r * ROUGH_MAX)
  for (let l = 0; l < ROUGH_LEVELS; l++) {
    const next = [pts[0]]
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i - 1]
      const q = pts[i]
      const len = Math.hypot(q.x - p.x, q.y - p.y) || 1
      const d = (rng() - HALF) * 2 * amp
      next.push({ x: (p.x + q.x) / 2 - (q.y - p.y) / len * d, y: (p.y + q.y) / 2 + (q.x - p.x) / len * d }, q)
    }
    pts = next
    amp *= HALF
  }
  return pts.slice(0, -1)
}
//
// A few chips and hairline cracks on a stone's face: a short ragged dark
// line with a lit lip beside it.
//
function paintChips(ctx, st, lit, shade, dark, rng) {
  const n = Math.floor(st.r / CHIP_PER_R)
  for (let i = 0; i < n; i++) {
    const a = { x: st.x + (rng() - HALF) * st.r, y: st.y + (rng() - HALF) * st.r * STONE_SQUASH }
    const ang = rng() * FULL_TURN
    const len = st.r * (CHIP_LEN_MIN + rng() * CHIP_LEN_RANGE)
    const crack = [...fractalLine(a, { x: a.x + Math.cos(ang) * len, y: a.y + Math.sin(ang) * len }, st.r, rng), { x: a.x + Math.cos(ang) * len, y: a.y + Math.sin(ang) * len }]
    polyline(ctx, crack.map(q => ({ x: q.x + 1, y: q.y + 1 })), css(lit, CHIP_LIT_ALPHA * (1 - shade * HALF)))
    polyline(ctx, crack, css(dark, CHIP_ALPHA))
  }
}
function polyline(ctx, pts, color) {
  ctx.strokeStyle = color
  ctx.lineWidth = 1
  ctx.beginPath()
  pts.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)))
  ctx.stroke()
}
function closed(pts) {
  const path = new Path2D()
  pts.forEach((q, i) => (i ? path.lineTo(q.x, q.y) : path.moveTo(q.x, q.y)))
  path.closePath()
  return path
}
//
// A bit of green on a stone: a grass tuft or a leaf sprig on its top, or a
// short vine hanging from its lower edge.
//
function paintStoneGreen(ctx, g, rng) {
  const kind = rng()
  const topY = g.y - g.r * STONE_SQUASH
  if (kind < GREEN_GRASS) return paintBlades(ctx, g.x + (rng() - HALF) * g.r, topY, rng)
  if (kind < GREEN_GRASS + GREEN_LEAVES) return paintSprig(ctx, g.x + (rng() - HALF) * g.r, topY, rng)
  paintMossStrand(ctx, g.x + (rng() - HALF) * g.r, g.y + g.r * STONE_SQUASH * HALF, STONE_VINE_MIN + rng() * STONE_VINE_RANGE, rng, { tones: C.vine, drop: false })
}
//
// A small tuft of grass blades from one point.
//
function paintBlades(ctx, x0, y, rng, size = 1) {
  const [, , olive, mid, light] = C.moss
  const tones = [olive, mid, light]
  const n = Math.max(1, Math.round((TUFT_BLADES_MIN + Math.floor(rng() * TUFT_BLADES)) * Math.sqrt(size)))
  for (let b = 0; b < n; b++) {
    const x = x0 + (rng() - HALF) * TUFT_SPREAD * Math.sqrt(size)
    const len = (TUFT_LEN_MIN + rng() * TUFT_LEN_RANGE) * size
    ctx.strokeStyle = css(tones[Math.floor(rng() * tones.length)])
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.quadraticCurveTo(x, y - len * HALF, x + (rng() - HALF) * len, y - len)
    ctx.stroke()
  }
}
//
// A sprig of a few small pointed leaves fanning up from one point, each
// over its own dark edge, with a lit midrib.
//
function paintSprig(ctx, x, y, rng) {
  const [shadow, dark, olive, mid, light] = C.moss
  const tones = [dark, olive, mid, light]
  const n = SPRIG_LEAVES_MIN + Math.floor(rng() * SPRIG_LEAVES_RANGE)
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i / Math.max(1, n - 1) - HALF) * SPRIG_FAN + (rng() - HALF) * SPRIG_JITTER
    const len = SPRIG_LEN_MIN + rng() * SPRIG_LEN_RANGE
    tinyLeaf(ctx, x, y, len, a, css(shadow), css(tones[Math.floor(rng() * tones.length)]), css(light))
  }
}
//
// One small pointed leaf from its base along an angle.
//
function tinyLeaf(ctx, x, y, len, angle, edge, fill, rib) {
  const w = len * LEAF_W
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.quadraticCurveTo(len * HALF, -w, len, 0)
  ctx.quadraticCurveTo(len * HALF, w, 0, 0)
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
  ctx.strokeStyle = edge
  ctx.lineWidth = LEAF_EDGE_W
  ctx.stroke()
  ctx.strokeStyle = rib
  ctx.lineWidth = LEAF_EDGE_W
  ctx.beginPath()
  ctx.moveTo(len * LEAF_RIB_FROM, 0)
  ctx.lineTo(len * LEAF_RIB_TO, 0)
  ctx.stroke()
  ctx.restore()
}
function line(ctx, a, b, width, color) {
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.beginPath()
  ctx.moveTo(a.x, a.y)
  ctx.lineTo(b.x, b.y)
  ctx.stroke()
}
//
// Short leafy vines hanging over the top lip and from the underside; a
// share of the underside ones is left to sway (pin points collected).
//
function paintHangers(ctx, geo, style, moss, swaying, rng) {
  for (let x = moss.x1; x <= moss.x2; x += HANG_STEP) {
    rng() < style.lipVines && paintMossStrand(ctx, x, geo.topAt(x) + HANG_LIP, HANG_LEN_MIN + rng() * HANG_LEN_RANGE, rng, { tones: C.vine, drop: false })
  }
  geo.under.forEach((q, i) => {
    if (i % HANG_UNDER_EVERY || rng() > style.underVines) return
    const len = HANG_LEN_MIN + rng() * HANG_LEN_RANGE
    if (rng() < style.swayShare) return swaying.push({ x: q.x, y: q.y - 1 })
    paintMossStrand(ctx, q.x, q.y - 1, len, rng, { tones: C.vine })
  })
}
//
// Roots leaving the underside: some first hug the rock toward the free end,
// then hang down with a slow wiggle, thinning to a point; lit on the left.
//
function paintRoots(ctx, geo, style, rng) {
  const [dark, mid, lit] = C.root
  for (let i = 0; i < style.roots; i++) {
    const start = geo.under[Math.floor((LOBE_FROM + rng() * LOBE_SPAN) * geo.under.length)]
    const len = ROOT_LEN_MIN + rng() * ROOT_LEN_RANGE
    const hug = rng() * ROOT_HUG
    const phase = rng() * FULL_TURN
    const pts = []
    for (let s = 0; s <= ROOT_STEPS; s++) {
      const t = s / ROOT_STEPS
      const along = Math.min(t, hug) * len
      const x = start.x + geo.sign * along + Math.sin(t * Math.PI * 2 + phase) * ROOT_WIGGLE * t
      pts.push({ x, y: Math.max(geo.bottomAt(x) - 1, start.y + (t - Math.min(t, hug)) * len) })
    }
    for (let s = 1; s < pts.length; s++) {
      const w = ROOT_W * (1 - s / pts.length) + HALF
      line(ctx, pts[s - 1], pts[s], w + 1, css(dark))
      line(ctx, pts[s - 1], pts[s], w, css(mid))
      line(ctx, { x: pts[s - 1].x - w * HALF, y: pts[s - 1].y }, { x: pts[s].x - w * HALF, y: pts[s].y }, HALF, css(lit))
    }
  }
}
//
// The long vines hanging from the underside: pinned here, drawn live
// (swaying) by the level.
//
function paintVines(ctx, geo, style, swaying, rng) {
  for (let i = 0; i < style.vines; i++) {
    const q = geo.under[Math.floor((LOBE_FROM + rng() * LOBE_SPAN) * geo.under.length)]
    swaying.push({ x: q.x, y: q.y - 1 })
  }
}
//
// Along the top: plants of several kinds spread unevenly — dense patches
// and bare stretches (noise along the top), of very different heights
// (most short, a few tall) — a share in front of the hero.
//
function paintTopGreens(ctx, front, geo, style, moss, rng) {
  const seed = rng() * FULL_TURN
  for (let x = moss.x1; x <= moss.x2; x += TOP_STEP * (HALF + rng())) {
    const dense = Math.max(0, HALF + Layout.profileNoise(x * GRASS_FREQ, seed) * GRASS_PATCHY)
    const roll = rng()
    const to = rng() < style.frontShare ? front : ctx
    const size = GRASS_SIZE_MIN + Math.pow(rng(), GRASS_SIZE_POW) * GRASS_SIZE_RANGE * (HALF + dense)
    if (roll > style.topGrass * dense * 2 + style.topLeaves) continue
    paintTopPlant(to, x, geo.topAt(x) + FRONT_SINK, size, rng)
  }
}
//
// One plant on the top, picked by kind: a grass tuft, a leaf sprig, a small
// fern or a few pale flowers.
//
function paintTopPlant(ctx, x, y, size, rng) {
  const kind = rng()
  if (kind < PLANT_GRASS) return paintBlades(ctx, x, y, rng, size)
  if (kind < PLANT_GRASS + PLANT_SPRIG) return paintSprig(ctx, x, y, rng)
  if (kind < PLANT_GRASS + PLANT_SPRIG + PLANT_FERN) {
    const [, dark, , mid, light] = C.moss
    return paintEdgeFern(ctx, x, y, (rng() - HALF) * FERN_TILT, rng, TOP_FERN_SCALE * size, [dark, mid, light])
  }
  paintFlowers(ctx, x, y, size, rng)
}
//
// A few small flowers on thin stems of different heights, with a leaf at
// the foot.
//
function paintFlowers(ctx, x0, y, size, rng) {
  const [shadow, , olive, mid, light] = C.moss
  const bloom = C.flower[Math.floor(rng() * C.flower.length)]
  const n = 1 + Math.floor(rng() * FLOWER_MAX)
  tinyLeaf(ctx, x0, y, SPRIG_LEN_MIN, -Math.PI + rng(), css(shadow), css(mid), css(light))
  for (let i = 0; i < n; i++) {
    const x = x0 + (rng() - HALF) * FLOWER_SPREAD
    const h = (FLOWER_H_MIN + rng() * FLOWER_H_RANGE) * Math.max(HALF, size)
    const tipX = x + (rng() - HALF) * h * FLOWER_LEAN
    ctx.strokeStyle = css(olive)
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.quadraticCurveTo(x, y - h * HALF, tipX, y - h)
    ctx.stroke()
    ctx.fillStyle = css(shadow)
    fillEllipse(ctx, tipX + HALF, y - h + HALF, FLOWER_R + HALF, FLOWER_R)
    ctx.fillStyle = css(bloom)
    fillEllipse(ctx, tipX, y - h, FLOWER_R, FLOWER_R * FLAT + HALF)
  }
}
//
// Ferns, grass tufts and tiny mushrooms on the top, kept off the very ends.
//
function paintPlants(ctx, geo, style, moss, rng) {
  const at = () => moss.x1 + (moss.x2 - moss.x1) * (PLANT_FROM + rng() * PLANT_SPAN)
  const [, dark, , mid, light] = C.moss
  for (let i = 0; i < style.ferns; i++) {
    const x = at()
    paintEdgeFern(ctx, x, geo.topAt(x), (rng() - HALF) * FERN_TILT, rng, FERN_SCALE + rng() * FERN_RANGE, [dark, mid, light])
  }
  for (let i = 0; i < style.tufts; i++) {
    const x = at()
    paintBlades(ctx, x, geo.topAt(x), rng)
  }
  for (let i = 0; i < style.mushrooms; i++) paintMushrooms(ctx, at(), geo, rng)
}
//
// A little cluster of pale cave mushrooms.
//
function paintMushrooms(ctx, x0, geo, rng) {
  const m = C.mushroom
  for (let i = 0; i < SHROOM_COUNT; i++) {
    const x = x0 + (rng() - HALF) * SHROOM_SPREAD
    const y = geo.topAt(x)
    const h = SHROOM_H_MIN + rng() * SHROOM_H_RANGE * (i === 0 ? 1 : HALF)
    const cap = SHROOM_CAP * h / (SHROOM_H_MIN + SHROOM_H_RANGE) + 1
    line(ctx, { x, y }, { x, y: y - h }, 1.4, css(m.stem))
    ctx.fillStyle = css(m.gill)
    fillEllipse(ctx, x, y - h + 1, cap, cap * HALF)
    ctx.fillStyle = css(m.cap)
    ctx.beginPath()
    ctx.ellipse(x, y - h, cap, cap * FLAT, 0, Math.PI, FULL_TURN)
    ctx.fill()
  }
}
