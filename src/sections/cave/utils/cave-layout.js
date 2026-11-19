import { createSeededRandom } from '../../../utils/seeded-random.js'
//
// Cave lesson 0 geometry: the hero drops in from the forest down the
// tunnel the forest eye-flower's roots tore through the thick ceiling by
// the left wall, onto the lake's left bank — a lantern mushroom left of
// where he lands. The lake hall: a wide, deep lake between two low banks
// (BANK_Y, a little over the water: the way across is on the giant's back
// as it breathes); past the right bank a shaft drops by the right wall,
// stone steps zigzagging down it into a passage that runs under the lake
// hall to the left wall, where the stalk-eye stands.
//
export const WORLD_W = 2760
export const WORLD_H = 1700
//
// Invisible wall bodies along both edges; the painted earth is wider and
// ragged, so the hero can tuck slightly into its broken outline.
//
export const WALL_COLLIDE_W = 56
//
// Ceiling over the upper corridor, a thin band of soil under the top of
// the world: a calm base line (x, Y knots, eased between them) — low over
// the entry alcove, rising and falling gently
// along the way — shaped like a platform's underside (cave-platform.js):
// broad lobes and fine ones, and soil bulging down here and there.
//
const CEILING_KNOTS = [
  { x: -60, y: 520 },
  { x: 300, y: 550 },
  { x: 520, y: 480 },
  { x: 700, y: 380 },
  { x: 900, y: 340 },
  { x: 1100, y: 370 },
  { x: 1380, y: 355 },
  { x: 1650, y: 330 },
  { x: 1950, y: 345 },
  { x: 2200, y: 350 },
  { x: 2500, y: 370 },
  { x: 2820, y: 360 }
]
//
// The roots' hole through the ceiling the hero dropped through (the
// forest's root tunnel ends here, its lower lip at ENTRY_Y); he starts
// standing on the ledge right under it (START_PLATFORM). Its sides are no plumb cut: they
// wander in and out by ENTRY_WAVE_AMP px (and finer by ENTRY_FINE_AMP).
//
export const ENTRY_X = 300
export const ENTRY_HALF_W = 46
export const ENTRY_Y = 550
const HALL_FLOOR_ID = 'hallFloor'
export const START_PLATFORM = HALL_FLOOR_ID
const ENTRY_WAVE_STRETCH = 0.5
const ENTRY_WAVE_AMP = 12
const ENTRY_FINE_STRETCH = 0.3
const ENTRY_FINE_AMP = 3
const ENTRY_SEED = 4.4
const ENTRY_FINE_SEED = 7.9
//
// The lake in the hall's floor: between its banks, its surface a little
// under the banks' top; the floor dips into a deep bowl under it (about
// 255 px under the surface), deep enough to drown in. Its left bank is
// just wide enough to catch a hero dropping straight through the gap above.
//
export const LAKE_X1 = 505
export const LAKE_X2 = 2120
export const LAKE_SURFACE_Y = 860
//
// Hero feet sit this far below the character anchor.
//
export const HERO_FEET_DY = 38
//
// Platform kinds: ledge (a slab of soil in the air, maybe running into a
// wall or into another mass), ground (soil down to the world bottom),
// float (a short stone platform of platforms.png hanging in the air).
//
export const PLATFORM_KIND = {
  LEDGE: 'ledge',
  GROUND: 'ground',
  FLOAT: 'float'
}
const K = PLATFORM_KIND
//
// Platforms. `y` is the top at the platform's start; `top` (when given) is
// its base line as [x, y] knots — flat runs joined by slopes. The line the
// hero walks is the art's own top (cave-ground.js), not these knots. A
// ledge may give `bottom` (its underside's line, else a fixed thickness),
// `joinR` (its right end runs on into the mass next to it), `faceTo` (its
// free left end shows a face only down to that Y; below it the ledge runs
// on into the mass next to it) and `under` (its underside continues that
// platform's). A float is `w` px wide, centred on `x`, its flat top at
// `y`, cut from piece `piece` of platforms.png.
// Floats step within a run-jump of each other (reach ≈ 147 px, rise
// ≈ 100 px) down the shaft, zigzagging between two columns of floats.
// The banks stand BANK_Y high; the left one runs on into the left wall,
// the right one ends at the shaft (SHAFT_X1).
//
const BANK_Y = 780
const PASSAGE_TOP_Y = 1260
const PASSAGE_FLOOR_Y = 1620
const SHAFT_X1 = 2500
//
// The shaft by the right wall, between the right bank's mass and the wall:
// its floats zigzag between a left column SHAFT_L_IN px off the bank's
// end and a right one SHAFT_R_IN px in from the world's edge (clear of the
// wall's ragged face), each float nudged a little off its column.
//
const SHAFT_L_IN = 40
const SHAFT_R_IN = 132
export const PLATFORMS = [
  {
    id: HALL_FLOOR_ID,
    x1: 0,
    x2: SHAFT_X1,
    y: BANK_Y,
    top: [[0, BANK_Y], [LAKE_X1 - 45, BANK_Y], [LAKE_X1 + 10, 880], [LAKE_X1 + 40, 960], [580, 1030], [650, 1088], [800, 1112], [1000, 1120], [1200, 1110], [1400, 1122], [1550, 1112], [1700, 1120], [1850, 1110], [1970, 1117], [LAKE_X2 - 70, 1072], [LAKE_X2 - 35, 985], [LAKE_X2 - 5, 880], [LAKE_X2 + 45, BANK_Y], [SHAFT_X1, BANK_Y]],
    bottom: PASSAGE_TOP_Y,
    kind: K.LEDGE,
    seed: 31
  },
  { id: 'passage', x1: 0, x2: WORLD_W, y: PASSAGE_FLOOR_Y, top: [[0, PASSAGE_FLOOR_Y], [420, PASSAGE_FLOOR_Y - 8], [820, PASSAGE_FLOOR_Y + 4], [1240, PASSAGE_FLOOR_Y - 6], [1640, PASSAGE_FLOOR_Y + 2], [WORLD_W, PASSAGE_FLOOR_Y - 4]], kind: K.GROUND, seed: 59 },
  { id: 'shaft5', x: shaftR(0), y: 805, w: 60, piece: 'float8', kind: K.FLOAT, seed: 65 },
  { id: 'shaft6', x: shaftL(5), y: 880, w: 60, piece: 'float15', kind: K.FLOAT, seed: 66 },
  { id: 'shaft7', x: shaftR(12), y: 960, w: 55, piece: 'float1', kind: K.FLOAT, seed: 67 },
  { id: 'shaft8', x: shaftL(10), y: 1040, w: 60, piece: 'float16', kind: K.FLOAT, seed: 68 },
  { id: 'shaft9', x: shaftR(5), y: 1120, w: 60, piece: 'float4', kind: K.FLOAT, seed: 69 },
  { id: 'shaft10', x: shaftL(17), y: 1190, w: 55, piece: 'float17', kind: K.FLOAT, seed: 70 },
  { id: 'shaft11', x: shaftR(2), y: 1275, w: 60, piece: 'float3', kind: K.FLOAT, seed: 71 },
  { id: 'shaft12', x: shaftL(15), y: 1360, w: 60, piece: 'float9', kind: K.FLOAT, seed: 72 },
  { id: 'shaft13', x: shaftR(9), y: 1440, w: 60, piece: 'float6', kind: K.FLOAT, seed: 73 },
  { id: 'shaft14', x: shaftL(8), y: 1525, w: 55, piece: 'float13', kind: K.FLOAT, seed: 74 }
].map(p => (p.kind === K.FLOAT ? { ...p, x1: p.x - p.w / 2, x2: p.x + p.w / 2 } : p))
//
// The stalk-eye in the passage, short of the foot of the shaft; the
// dormant lantern mushroom left of where the hero lands (`on` names the
// platform each stands on; `y` is its base line, the art's own top is
// cave-ground.js's).
//
export const STALK_EYE = { x: 2240, y: PASSAGE_FLOOR_Y, on: 'passage' }
export const LANTERN = { x: 195, y: BANK_Y, on: HALL_FLOOR_ID }
//
// Bounds for ambient fireflies: the hall under its ceiling.
//
export const FIREFLY_BOUNDS = { x1: 70, y1: 360, x2: WORLD_W - 70, y2: LAKE_SURFACE_Y - 20 }
//
// Wall profile, shaped like a platform's underside: inset past the
// collider, broad lobes and fine ones (stretch, height), nothing sticking
// out of the face.
//
const WALL_ART_INSET = 22
const WALL_LOBE_STRETCH = 1.2
const WALL_LOBE_AMP = 14
const WALL_FINE_STRETCH = 0.6
const WALL_FINE_AMP = 5
const WALL_FINE_SEED = 2.2
const LEFT_WALL_SEED = 1.7
const RIGHT_WALL_SEED = 3.1
//
// Ceiling underside: broad lobes and fine ones (stretch, height), soil
// bulging down every BULGE_GAP..+RANGE px, BULGE_DEPTH..+RANGE deep,
// BULGE_HALF..+RANGE px either side.
//
const CEILING_SEED = 2.6
const CEILING_LOBE_STRETCH = 1.2
const CEILING_LOBE_AMP = 20
const CEILING_FINE_STRETCH = 0.6
const CEILING_FINE_AMP = 6
const CEILING_FINE_SEED = 5.3
const CEILING_BULGE_GAP = 110
const CEILING_BULGE_GAP_RANGE = 150
const CEILING_BULGE_DEPTH = 8
const CEILING_BULGE_DEPTH_RANGE = 18
const CEILING_BULGE_HALF = 55
const CEILING_BULGE_HALF_RANGE = 55
const CEILING_BULGE_SEED = 6161
//
// A base line's knots are no sharp bends: each is rounded off by a curve
// cutting its corner, KNOT_ROUND..+RANGE px along each side of it (picked
// per knot from the platform's seed, never more than KNOT_SHARE of either
// segment); a bend gentler than KNOT_STRAIGHT (cosine) stays as it is.
//
const KNOT_ROUND = 16
const KNOT_ROUND_RANGE = 40
const KNOT_SHARE = 0.45
const KNOT_STRAIGHT = 0.9995
const KNOT_SEED = 17
const KNOT_EPS = 1e-6
const knotCurves = new Map()
//
// Where soil meets a side wall it is no square corner: it curves into the
// wall's face over a quarter circle WALL_FILLET px round (a floor rising
// to it, an underside or the ceiling coming down to it).
//
const WALL_FILLET = 55
//
// Profile noise octaves: wavelength (px), weight and seed multiplier.
//
const NOISE_OCTAVES = [
  { len: 97, weight: 0.55, seedMul: 1 },
  { len: 41, weight: 0.3, seedMul: 2.3 },
  { len: 13, weight: 0.15, seedMul: 5.1 }
]
let ceilingBulges = null

/**
 * Ragged underside of the ceiling at world X (the entry hole not cut).
 * @param {number} x - World X
 * @returns {number}
 */
export function ceilingBottomAt(x) {
  const i = Math.max(1, CEILING_KNOTS.findIndex(knot => knot.x >= x))
  const a = CEILING_KNOTS[i - 1]
  const b = CEILING_KNOTS[Math.min(i, CEILING_KNOTS.length - 1)]
  const u = b.x === a.x ? 0 : Math.max(0, Math.min(1, (x - a.x) / (b.x - a.x)))
  const ease = u * u * (3 - 2 * u)
  ceilingBulges ??= placeCeilingBulges()
  const bulge = ceilingBulges.reduce((sum, c) => {
    const d = Math.abs(x - c.x) / c.half
    return d >= 1 ? sum : sum + c.depth * (1 + Math.cos(Math.PI * d)) / 2
  }, 0)
  const y = a.y + (b.y - a.y) * ease +
    profileNoise(x / CEILING_LOBE_STRETCH, CEILING_SEED) * CEILING_LOBE_AMP +
    profileNoise(x / CEILING_FINE_STRETCH, CEILING_FINE_SEED) * CEILING_FINE_AMP +
    bulge
  return y + wallFillet(x, y)
}

/**
 * How far soil at (x, y) curves toward a side wall's face it meets: a
 * quarter circle WALL_FILLET (times `scale`) round, 0 farther than that
 * from both walls.
 * @param {number} x - World X
 * @param {number} y - World Y of the soil's line there
 * @param {number} [scale=1] - The fillet's size share
 * @returns {number} Px toward the open side of the line (up for a floor, down for an underside)
 */
export function wallFillet(x, y, scale = 1) {
  const r = WALL_FILLET * scale
  const d = Math.max(0, Math.min(x - leftWallX(y), rightWallX(y) - x))
  return d >= r ? 0 : r - Math.sqrt(r * r - (r - d) * (r - d))
}

/**
 * X of a side of the roots' hole at world Y: its plumb line wandering in
 * and out (each side its own wave).
 * @param {number} y - World Y
 * @param {number} dir - -1 for the hole's left side, 1 for its right side
 * @returns {number}
 */
export function entrySideX(y, dir) {
  const seed = ENTRY_SEED + dir
  return ENTRY_X + dir * ENTRY_HALF_W +
    profileNoise(y / ENTRY_WAVE_STRETCH, seed) * ENTRY_WAVE_AMP +
    profileNoise(y / ENTRY_FINE_STRETCH, seed + ENTRY_FINE_SEED) * ENTRY_FINE_AMP
}

/**
 * A platform's base line Y at world X from its knots (clamped to its
 * span), every bend rounded off; the hero walks the art's own top
 * (cave-ground.js).
 * @param {Object} p - PLATFORMS entry
 * @param {number} x - World X
 * @returns {number}
 */
export function topAt(p, x) {
  const curve = curvesOf(p).find(c => x > c.ax && x < c.bx)
  if (curve) return curveY(curve, x)
  const knots = baseKnots(p)
  const i = Math.max(1, knots.findIndex(k => k[0] >= x))
  const [ax, ay] = knots[i - 1]
  const [bx, by] = knots[Math.min(i, knots.length - 1)]
  const u = bx === ax ? 0 : Math.max(0, Math.min(1, (x - ax) / (bx - ax)))
  return ay + (by - ay) * u
}

/**
 * A platform's base line as segments.
 * @param {Object} p - PLATFORMS entry
 * @returns {Array<{x1: number, y1: number, x2: number, y2: number}>}
 */
export function baseSegments(p) {
  return segmentsOf(baseKnots(p))
}

/**
 * The platform whose floor holds the lake (its bowl is the lake's bed).
 * @returns {Object} PLATFORMS entry
 */
export function lakeFloor() {
  return PLATFORMS.find(p => p.id === HALL_FLOOR_ID)
}

/**
 * True as soon as the hero's feet touch the lake's water (not when he
 * walks the passage under it).
 * @param {number} x - Hero anchor X
 * @param {number} y - Hero anchor Y
 * @returns {boolean}
 */
export function isInLake(x, y) {
  const feet = y + HERO_FEET_DY
  return x > LAKE_X1 && x < LAKE_X2 && feet > LAKE_SURFACE_Y && feet < PASSAGE_TOP_Y
}

/**
 * Seeded value noise for profiles (sum of shifted sines).
 * @param {number} v - Coordinate along the profile
 * @param {number} seed - Profile seed
 * @returns {number} Roughly in [-1, 1]
 */
export function profileNoise(v, seed) {
  return NOISE_OCTAVES.reduce((sum, o) => sum + Math.sin(v / o.len + seed * o.seedMul) * o.weight, 0)
}

/**
 * Inner X of the left wall at world Y.
 * @param {number} y - World Y
 * @returns {number}
 */
export function leftWallX(y) {
  return WALL_COLLIDE_W + WALL_ART_INSET + wallWave(y, LEFT_WALL_SEED)
}

/**
 * Inner X of the right wall at world Y.
 * @param {number} y - World Y
 * @returns {number}
 */
export function rightWallX(y) {
  return WORLD_W - WALL_COLLIDE_W - WALL_ART_INSET - wallWave(y, RIGHT_WALL_SEED)
}
//
// A wall face's wave at Y (positive: into the room).
//
function wallWave(y, seed) {
  return profileNoise(y / WALL_LOBE_STRETCH, seed) * WALL_LOBE_AMP + profileNoise(y / WALL_FINE_STRETCH, seed + WALL_FINE_SEED) * WALL_FINE_AMP
}
//
// The ceiling's bulges along the world, placed once.
//
function placeCeilingBulges() {
  const rng = createSeededRandom(CEILING_BULGE_SEED)
  const out = []
  for (let x = rng() * CEILING_BULGE_GAP; x < WORLD_W; x += CEILING_BULGE_GAP + rng() * CEILING_BULGE_GAP_RANGE) {
    out.push({ x, depth: CEILING_BULGE_DEPTH + rng() * CEILING_BULGE_DEPTH_RANGE, half: CEILING_BULGE_HALF + rng() * CEILING_BULGE_HALF_RANGE })
  }
  return out
}
//
// A shaft float's X in the left or right column, `dx` px toward the
// shaft's middle.
//
function shaftL(dx) {
  return SHAFT_X1 + SHAFT_L_IN + dx
}
function shaftR(dx) {
  return WORLD_W - SHAFT_R_IN - dx
}
function baseKnots(p) {
  return p.top ?? [[p.x1, p.y], [p.x2, p.y]]
}
//
// The curves rounding a platform's bends (once per platform): each from a
// point on the segment before its knot to one on the segment after, the
// knot their control point.
//
function curvesOf(p) {
  if (knotCurves.has(p.id)) return knotCurves.get(p.id)
  const rng = createSeededRandom(p.seed * KNOT_SEED)
  const knots = baseKnots(p)
  const curves = []
  for (let i = 1; i < knots.length - 1; i++) {
    const r = KNOT_ROUND + rng() * KNOT_ROUND_RANGE
    const [px, py] = knots[i - 1]
    const [kx, ky] = knots[i]
    const [nx, ny] = knots[i + 1]
    const la = Math.hypot(kx - px, ky - py)
    const lb = Math.hypot(nx - kx, ny - ky)
    if (la < KNOT_EPS || lb < KNOT_EPS) continue
    const cos = ((kx - px) * (nx - kx) + (ky - py) * (ny - ky)) / (la * lb)
    if (cos > KNOT_STRAIGHT) continue
    const ra = Math.min(r, la * KNOT_SHARE) / la
    const rb = Math.min(r, lb * KNOT_SHARE) / lb
    curves.push({ ax: kx - (kx - px) * ra, ay: ky - (ky - py) * ra, kx, ky, bx: kx + (nx - kx) * rb, by: ky + (ny - ky) * rb })
  }
  knotCurves.set(p.id, curves)
  return curves
}
//
// A rounding curve's Y at X (its parameter solved from X: the curve runs
// left to right).
//
function curveY(c, x) {
  const a = c.ax - 2 * c.kx + c.bx
  const b = 2 * (c.kx - c.ax)
  const k = c.ax - x
  const t = Math.abs(a) < KNOT_EPS ? -k / b : (-b + Math.sqrt(Math.max(0, b * b - 4 * a * k))) / (2 * a)
  const u = 1 - t
  return u * u * c.ay + 2 * u * t * c.ky + t * t * c.by
}
function segmentsOf(knots) {
  return knots.slice(1).map((k, i) => ({ x1: knots[i][0], y1: knots[i][1], x2: k[0], y2: k[1] }))
}
