//
// Cave lesson 0 geometry (the reference painting): the hero drops in from
// the forest through a hole the eye-flower's roots tore in a low part of
// the ceiling, onto a long earth ledge — a dormant lantern mushroom left of
// where he lands. Along that ledge grows the hostile eye-flower; past it a
// crevice — the exit, warm light rising out of it — splits the ledge from
// the stalk-eye's ledge, which runs on far to the right wall with the
// corridor over it (so the view scrolls there). Below lies the lower cave: an
// earth floor on the left, an underground lake with earth-and-stone
// pillars standing in it, and the ground under the exit, so the cave also
// leads to the crevice from below.
//
export const WORLD_W = 3800
export const WORLD_H = 1260
//
// Invisible wall bodies along both edges; the painted earth is wider and
// ragged, so the hero can tuck slightly into its broken outline.
//
export const WALL_COLLIDE_W = 56
//
// Ceiling over the upper corridor (x, underside Y knots): it dips and
// rises along the way, so the corridor is now wide, now narrow (never
// lower than a hero can walk under), low over the entry alcove.
//
const CEILING_KNOTS = [
  { x: -60, y: 300 },
  { x: 180, y: 315 },
  { x: 470, y: 340 },
  { x: 640, y: 250 },
  { x: 820, y: 170 },
  { x: 1000, y: 270 },
  { x: 1150, y: 150 },
  { x: 1350, y: 240 },
  { x: 1500, y: 185 },
  { x: 1700, y: 310 },
  { x: 1900, y: 225 },
  { x: 2100, y: 335 },
  { x: 2300, y: 255 },
  { x: 2520, y: 330 },
  { x: 2760, y: 205 },
  { x: 2980, y: 300 },
  { x: 3200, y: 180 },
  { x: 3420, y: 280 },
  { x: 3640, y: 240 },
  { x: 3860, y: 300 }
]
//
// The roots' hole through the ceiling the hero dropped through (the
// forest's root tunnel ends here, its lower lip at ENTRY_Y); he starts
// standing on the ledge right under it.
//
export const ENTRY_X = 330
export const ENTRY_HALF_W = 46
export const ENTRY_Y = 330
//
// The underground lake, between the lower floor and the exit ground.
//
export const LAKE_X1 = 470
export const LAKE_X2 = 1380
export const LAKE_SURFACE_Y = 1080
const LAKE_DROWN_DEPTH = 14
//
// Hero feet sit this far below the character anchor.
//
export const HERO_FEET_DY = 38
//
// Platform kinds: ledge (grows from a wall, `wall` names which), pillar
// (stands up out of the lake), ground (solid down to the world bottom).
//
export const PLATFORM_KIND = {
  LEDGE: 'ledge',
  PILLAR: 'pillar',
  GROUND: 'ground'
}
const K = PLATFORM_KIND
//
// Walkable surfaces. `y` is the top at the platform's start; `top` (when
// given) is its whole top as [x, y] knots — flat runs joined by slopes
// that rise and fall (gentle enough to walk). `thick` is a ledge's depth
// at the wall, `sag` how far its underside hangs lower under its middle
// (the mass under the eye-flower); pillars are about one run-jump apart
// (reach ≈ 147 px).
//
export const PLATFORMS = [
  { id: 'upper', x1: 0, x2: 1540, y: 560, top: [[0, 560], [640, 560], [900, 520], [1300, 520], [1540, 552]], kind: K.LEDGE, wall: 'left', thick: 200, tip: 0.55, sag: 90, sagX: 1120, sagW: 260, seed: 11 },
  { id: 'eyeLedge', x1: 1680, x2: WORLD_W, y: 580, top: [[1680, 580], [1960, 580], [2200, 545], [2600, 545], [2840, 580], [3150, 580], [3390, 545], [WORLD_W, 545]], kind: K.LEDGE, wall: 'right', thick: 200, tip: 0.5, sag: 40, sagX: 1900, sagW: 200, seed: 23 },
  { id: 'floor', x1: 0, x2: LAKE_X1, y: 1000, kind: K.GROUND, bank: 'right', seed: 31 },
  { id: 'pillar1', x1: 560, x2: 650, y: 1030, kind: K.PILLAR, seed: 41 },
  { id: 'pillar2', x1: 770, x2: 860, y: 1012, kind: K.PILLAR, seed: 43 },
  { id: 'pillar3', x1: 980, x2: 1070, y: 1028, kind: K.PILLAR, seed: 47 },
  { id: 'pillar4', x1: 1190, x2: 1280, y: 1012, kind: K.PILLAR, seed: 53 },
  { id: 'exitGround', x1: LAKE_X2, x2: WORLD_W, y: 1010, top: [[LAKE_X2, 1010], [1720, 1010], [1980, 975], [2700, 975], [2960, 1010], [3300, 1010], [3560, 975], [WORLD_W, 975]], kind: K.GROUND, bank: 'left', seed: 59 }
]
//
// The exit: the crevice between the two upper ledges, from their tops down
// to the exit ground; the light rises from its glow point.
//
export const EXIT = { x1: 1540, x2: 1680, y1: 552, y2: 1010, glowX: 1610, glowY: 800 }
//
// The hostile eye-flower on the upper ledge, between the hero's landing and
// the exit; the stalk-eye on its ledge right past the exit; the dormant
// lantern mushroom left of where the hero lands.
//
export const EYE_FLOWER = { x: 1060, y: 520 }
export const STALK_EYE = { x: 1860, y: 580 }
export const LANTERN = { x: 215, y: 560 }
//
// Bounds for ambient fireflies.
//
export const FIREFLY_BOUNDS = { x1: 70, y1: 140, x2: WORLD_W - 70, y2: LAKE_SURFACE_Y - 20 }
//
// Respawn keeps the hero this far from a platform edge.
//
const STAND_EDGE_PAD = 28
//
// Wall profile: inset past the collider, ripple amplitude, outcrop bulge.
//
const WALL_ART_INSET = 22
const WALL_RIPPLE_AMP = 26
const WALL_BULGE_AMP = 36
const WALL_BULGE_FREQ = 0.37
const LEFT_WALL_SEED = 1.7
const LEFT_BULGE_SEED = 4.2
const RIGHT_WALL_SEED = 3.1
const RIGHT_BULGE_SEED = 7.9
//
// Ceiling underside ripple.
//
const CEILING_RAGGED_AMP = 14
const CEILING_SEED = 2.6
//
// Profile noise octaves: wavelength (px), weight and seed multiplier.
//
const NOISE_OCTAVES = [
  { len: 97, weight: 0.55, seedMul: 1 },
  { len: 41, weight: 0.3, seedMul: 2.3 },
  { len: 13, weight: 0.15, seedMul: 5.1 }
]

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
  return a.y + (b.y - a.y) * ease + profileNoise(x, CEILING_SEED) * CEILING_RAGGED_AMP
}

/**
 * Where a drop falling straight down from a point lands: the first
 * platform top, the lake surface, or the world bottom.
 * @param {number} x - World X
 * @param {number} fromY - World Y the drop falls from
 * @returns {{y: number, water: boolean}}
 */

/**
 * A platform's walkable top at world X (clamped to its span).
 * @param {Object} p - PLATFORMS entry
 * @param {number} x - World X
 * @returns {number}
 */
export function topAt(p, x) {
  const knots = p.top
  if (!knots) return p.y
  const i = Math.max(1, knots.findIndex(k => k[0] >= x))
  const [ax, ay] = knots[i - 1]
  const [bx, by] = knots[Math.min(i, knots.length - 1)]
  const u = bx === ax ? 0 : Math.max(0, Math.min(1, (x - ax) / (bx - ax)))
  return ay + (by - ay) * u
}

/**
 * A platform's top as segments, flat ones and slopes.
 * @param {Object} p - PLATFORMS entry
 * @returns {Array<{x1: number, y1: number, x2: number, y2: number}>}
 */
export function topSegments(p) {
  const knots = p.top ?? [[p.x1, p.y], [p.x2, p.y]]
  return knots.slice(1).map((k, i) => ({ x1: knots[i][0], y1: knots[i][1], x2: k[0], y2: k[1] }))
}

/**
 * The nearest slope (a rising or falling top segment) at world X whose top
 * there is no higher than `fromY` (slopes stacked at the same X — a
 * ledge's over a ground's — are told apart by height).
 * @param {number} x - World X
 * @param {number} fromY - Highest top that counts
 * @returns {{platform: Object, y: number}|null} Its platform and its top at X
 */
export function slopeUnder(x, fromY) {
  let best = null
  PLATFORMS.forEach(p => {
    const seg = topSegments(p).find(s => s.y1 !== s.y2 && x >= s.x1 && x <= s.x2)
    const y = seg ? topAt(p, x) : -Infinity
    y >= fromY && (!best || y < best.y) && (best = { platform: p, y })
  })
  return best
}

/**
 * True when the hero has sunk into the lake.
 * @param {number} x - Hero anchor X
 * @param {number} y - Hero anchor Y
 * @returns {boolean}
 */
export function isInLake(x, y) {
  return x > LAKE_X1 && x < LAKE_X2 && y + HERO_FEET_DY > LAKE_SURFACE_Y + LAKE_DROWN_DEPTH
}

/**
 * Respawn pose standing on a platform, kept clear of its edges.
 * @param {Object} platform - PLATFORMS entry
 * @param {number} x - Preferred X
 * @returns {{x: number, y: number}}
 */
export function standPoseOn(platform, x) {
  const pad = Math.min(STAND_EDGE_PAD, (platform.x2 - platform.x1) / 2)
  const minX = Math.max(platform.x1, WALL_COLLIDE_W) + pad
  const maxX = Math.min(platform.x2, WORLD_W - WALL_COLLIDE_W) - pad
  const sx = Math.max(minX, Math.min(maxX, x))
  return { x: sx, y: topAt(platform, sx) - HERO_FEET_DY }
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
  return WALL_COLLIDE_W + WALL_ART_INSET + profileNoise(y, LEFT_WALL_SEED) * WALL_RIPPLE_AMP +
    Math.max(0, profileNoise(y * WALL_BULGE_FREQ, LEFT_BULGE_SEED)) * WALL_BULGE_AMP
}

/**
 * Inner X of the right wall at world Y.
 * @param {number} y - World Y
 * @returns {number}
 */
export function rightWallX(y) {
  return WORLD_W - WALL_COLLIDE_W - WALL_ART_INSET - profileNoise(y, RIGHT_WALL_SEED) * WALL_RIPPLE_AMP -
    Math.max(0, profileNoise(y * WALL_BULGE_FREQ, RIGHT_BULGE_SEED)) * WALL_BULGE_AMP
}
