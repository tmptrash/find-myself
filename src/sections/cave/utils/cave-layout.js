import { createSeededRandom } from '../../../utils/seeded-random.js'
//
// Cave lesson 0 geometry: the hero drops in from the forest through a hole
// the eye-flower's roots tore in a low part of the ceiling, onto a soil
// ledge — a lantern mushroom left of where he lands. A gap splits it from
// the next ledge, on which the hostile eye-flower grows right at the gap;
// fall through the gap into the lake hall under the ledges: a soil floor
// with a wide, deep lake in it; past its right bank small stone platforms
// climb into the crevice between the eye-flower's ledge and the
// stalk-eye's — the way up. The stalk-eye's narrow
// ledge is the top of a solid mass (the old corridor under it is filled
// in); right past the stalk-eye a shaft drops at the level's right edge,
// stone steps zigzagging down it into a passage that runs under the lake
// hall to the left wall (a dead end for now).
//
export const WORLD_W = 2260
export const WORLD_H = 1520
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
  { x: -60, y: 150 },
  { x: 300, y: 180 },
  { x: 560, y: 150 },
  { x: 820, y: 100 },
  { x: 1100, y: 150 },
  { x: 1380, y: 160 },
  { x: 1650, y: 130 },
  { x: 1950, y: 110 },
  { x: 2320, y: 120 }
]
//
// The roots' hole through the ceiling the hero dropped through (the
// forest's root tunnel ends here, its lower lip at ENTRY_Y); he starts
// standing on the ledge right under it (START_PLATFORM). Its sides are no plumb cut: they
// wander in and out by ENTRY_WAVE_AMP px (and finer by ENTRY_FINE_AMP).
//
export const ENTRY_X = 300
export const ENTRY_HALF_W = 46
export const ENTRY_Y = 180
export const START_PLATFORM = 'upper'
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
export const LAKE_X2 = 1500
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
// Floats climb within a run-jump of each other (reach ≈ 147 px, rise
// ≈ 100 px): from the lake's right bank up into the crevice, and down the
// shaft.
//
const HALL_FLOOR_ID = 'hallFloor'
const HALL_FLOOR_Y = 850
const PASSAGE_TOP_Y = 1260
const PASSAGE_FLOOR_Y = 1440
const UPPER_X2 = 400
const FLOWER_LEDGE_X1 = 465
const EYE_LEDGE_X1 = 1780
const EYE_LEDGE_X2 = 1950
export const PLATFORMS = [
  { id: 'upper', x1: 0, x2: UPPER_X2, y: 410, kind: K.LEDGE, seed: 11 },
  { id: 'flowerLedge', x1: FLOWER_LEDGE_X1, x2: 1540, y: 380, top: [[FLOWER_LEDGE_X1, 380], [1300, 380], [1540, 402]], kind: K.LEDGE, seed: 13 },
  {
    id: HALL_FLOOR_ID,
    x1: 0,
    x2: EYE_LEDGE_X1 + 20,
    y: HALL_FLOOR_Y,
    top: [[0, HALL_FLOOR_Y], [LAKE_X1, HALL_FLOOR_Y], [530, 935], [572, 1025], [650, 1088], [800, 1112], [1000, 1120], [1200, 1110], [1350, 1117], [1430, 1072], [1470, 985], [LAKE_X2, HALL_FLOOR_Y], [EYE_LEDGE_X1 + 20, HALL_FLOOR_Y]],
    bottom: PASSAGE_TOP_Y,
    joinR: true,
    kind: K.LEDGE,
    seed: 31
  },
  { id: 'eyeLedge', x1: EYE_LEDGE_X1, x2: EYE_LEDGE_X2, y: 430, bottom: PASSAGE_TOP_Y, faceTo: HALL_FLOOR_Y, under: HALL_FLOOR_ID, kind: K.LEDGE, seed: 23 },
  { id: 'passage', x1: 0, x2: WORLD_W, y: PASSAGE_FLOOR_Y, top: [[0, PASSAGE_FLOOR_Y], [420, 1432], [820, 1444], [1240, 1434], [1640, 1442], [WORLD_W, 1436]], kind: K.GROUND, seed: 59 },
  { id: 'crevice1', x: 1560, y: 770, w: 70, piece: 'float10', kind: K.FLOAT, seed: 47 },
  { id: 'crevice2', x: 1615, y: 690, w: 60, piece: 'float7', kind: K.FLOAT, seed: 51 },
  { id: 'crevice3', x: 1665, y: 620, w: 60, piece: 'float14', kind: K.FLOAT, seed: 48 },
  { id: 'crevice4', x: 1740, y: 555, w: 55, piece: 'float2', kind: K.FLOAT, seed: 49 },
  { id: 'crevice5', x: 1675, y: 490, w: 55, piece: 'float11', kind: K.FLOAT, seed: 50 },
  { id: 'shaft1', x: 2060, y: 505, w: 70, piece: 'float7', kind: K.FLOAT, seed: 61 },
  { id: 'shaft2', x: 2000, y: 585, w: 60, piece: 'float12', kind: K.FLOAT, seed: 62 },
  { id: 'shaft3', x: 2105, y: 655, w: 65, piece: 'float5', kind: K.FLOAT, seed: 63 },
  { id: 'shaft4', x: 2030, y: 730, w: 55, piece: 'float18', kind: K.FLOAT, seed: 64 },
  { id: 'shaft5', x: 2120, y: 805, w: 60, piece: 'float8', kind: K.FLOAT, seed: 65 },
  { id: 'shaft6', x: 2010, y: 880, w: 70, piece: 'float15', kind: K.FLOAT, seed: 66 },
  { id: 'shaft7', x: 2095, y: 960, w: 55, piece: 'float1', kind: K.FLOAT, seed: 67 },
  { id: 'shaft8', x: 2020, y: 1040, w: 65, piece: 'float16', kind: K.FLOAT, seed: 68 },
  { id: 'shaft9', x: 2110, y: 1120, w: 60, piece: 'float4', kind: K.FLOAT, seed: 69 },
  { id: 'shaft10', x: 2035, y: 1190, w: 55, piece: 'float17', kind: K.FLOAT, seed: 70 },
  { id: 'shaft11', x: 2115, y: 1275, w: 60, piece: 'float3', kind: K.FLOAT, seed: 71 },
  { id: 'shaft12', x: 2030, y: 1360, w: 60, piece: 'float9', kind: K.FLOAT, seed: 72 }
].map(p => (p.kind === K.FLOAT ? { ...p, x1: p.x - p.w / 2, x2: p.x + p.w / 2 } : p))
//
// The exit: the crevice between the two upper ledges (its span), from
// their tops down into the hall under them.
//
export const EXIT = { x1: 1540, x2: EYE_LEDGE_X1 }
//
// The hostile eye-flower on its ledge right at the gap; the stalk-eye on
// its ledge right past the exit, before the shaft;
// the dormant lantern mushroom left of where the hero lands (`on` names
// the platform each stands on; `y` is its base line, the art's own top
// is cave-ground.js's).
//
export const EYE_FLOWER = { x: FLOWER_LEDGE_X1 + 40, y: 380, on: 'flowerLedge' }
export const STALK_EYE = { x: 1860, y: 430, on: 'eyeLedge' }
export const LANTERN = { x: 170, y: 410, on: 'upper' }
//
// Bounds for ambient fireflies.
//
export const FIREFLY_BOUNDS = { x1: 70, y1: 40, x2: WORLD_W - 70, y2: LAKE_SURFACE_Y - 20 }
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
  return a.y + (b.y - a.y) * ease +
    profileNoise(x / CEILING_LOBE_STRETCH, CEILING_SEED) * CEILING_LOBE_AMP +
    profileNoise(x / CEILING_FINE_STRETCH, CEILING_FINE_SEED) * CEILING_FINE_AMP +
    bulge
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
 * span); the hero walks the art's own top (cave-ground.js).
 * @param {Object} p - PLATFORMS entry
 * @param {number} x - World X
 * @returns {number}
 */
export function topAt(p, x) {
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
function baseKnots(p) {
  return p.top ?? [[p.x1, p.y], [p.x2, p.y]]
}
function segmentsOf(knots) {
  return knots.slice(1).map((k, i) => ({ x1: knots[i][0], y1: knots[i][1], x2: k[0], y2: k[1] }))
}
