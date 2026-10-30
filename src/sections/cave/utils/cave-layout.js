//
// Cave lesson 0 geometry — a fixed 1280 px wide shaft around a giant
// monster plant. The hero drops in on the top-left ledge (a dormant lantern
// mushroom in the light shaft), must fall through the gap left of the
// plant's top flytrap leaf, jump left off the next leaf onto the spore
// mushroom ledge, lure the spores into the lower flytrap leaf so it closes
// into a step, cross to the lit floor on the right and ride a bubble, blown
// up by the air plant, to the target ledge. Below lies the lake.
//
export const WORLD_W = 1280
export const WORLD_H = 1960
//
// Tallest visible world band (same height as the forest playfield window).
//
export const MAX_VIEW_H = 920
//
// Invisible wall bodies along both edges; the baked rock art is wider and
// ragged, so the hero can tuck slightly into its broken outline.
//
export const WALL_COLLIDE_W = 56
//
// Ceiling band with the shaft opening the hero drops through from the forest.
//
export const CEILING_Y = 74
export const ENTRY_X1 = 150
export const ENTRY_X2 = 300
//
// Hero enters above the visible world and falls into the shaft.
//
export const HERO_ENTRY_X = 225
export const HERO_ENTRY_Y = -90
//
// Darkness regions (darkness is off for now): the upper part ends here.
//
export const DARK_ZONE_BOTTOM_Y = 1000
//
// Lake at the bottom, from the left wall to the lit floor.
//
export const LAKE_X1 = 70
export const LAKE_X2 = 870
export const LAKE_SURFACE_Y = 1820
const LAKE_DROWN_DEPTH = 14
//
// Hero feet sit this far below the character anchor.
//
const HERO_FEET_DY = 38
const HERO_HALF_W = 15
const HERO_HALF_H = 34
const HERO_BODY_DY = 3
//
// Platform kinds: ledge (grows from a wall), small (floating slab), ground
// (solid down to the world bottom).
//
export const PLATFORM_KIND = {
  LEDGE: 'ledge',
  SMALL: 'small',
  GROUND: 'ground'
}
const K = PLATFORM_KIND
//
// Rock surfaces. L0 entry ledge, C spore ledge, G the
// target ledge on the right wall, D the lit floor with the bubble and the
// air plant. A `style` names a rock ledge look from CAVE_CFG.ledge (baked
// by cave-ledge.js; visual only). Leaves of the plant are listed
// separately (PLANT_LEAVES).
//
export const PLATFORMS = [
  { id: 'L0', x1: 0, x2: 400, y: 430, h: 54, kind: K.LEDGE, wall: 'left', style: 'entry' },
  { id: 'C', x1: 0, x2: 440, y: 1100, h: 60, kind: K.LEDGE, wall: 'left', style: 'wide' },
  { id: 'G', x1: 1060, x2: WORLD_W, y: 1300, h: 50, kind: K.LEDGE, wall: 'right', style: 'target' },
  { id: 'D', x1: LAKE_X2, x2: WORLD_W, y: 1720, h: WORLD_H - 1720, kind: K.GROUND, style: 'ground' }
]
//
// The monster plant: rope foot (bottom in the lake, top at the first
// leaf), its pad leaves (the top leaf A and the spore leaf T are traps
// with red mouths that seize the hero; collideInset trims a leaf's collider at both ends
// where its rim droops), and the thorny band right of the second leaf.
//
export const PLANT_TRUNK = { x: 742, bottomY: WORLD_H, topY: 470, width: 84 }
export const LEAF_KIND = {
  TRAP: 'trap',
  LEAF: 'leaf'
}
export const PLANT_LEAVES = [
  { id: 'A', x1: 520, x2: 900, y: 470, kind: LEAF_KIND.TRAP, collideInset: 34 },
  { id: 'B', x1: 360, x2: 690, y: 800, kind: LEAF_KIND.LEAF },
  { id: 'T', x1: 500, x2: 700, y: 1220, kind: LEAF_KIND.TRAP, spores: true }
]
export const PLANT_THORNS = { x1: 688, x2: 775, y1: 630, y2: 800 }
//
// Extra thorns, densely, on the trunk's left side (by leaf B) from the
// leaf up to the hero's head (inside the thorny band's hit area).
//
export const PLANT_THORNS_DENSE = { y1: 712, y2: 800 }
//
// Spore mushroom on the left part of ledge C; swarm stations it hovers at:
// a little right of and above the hero's head on the mushroom, a step to the right, then above
// the spore trap leaf.
//
export const SPORE_MUSHROOM = { x: 230, y: 1100 }
export const SPORE_STATIONS = [
  { x: 288, y: 878 },
  { x: 345, y: 955 },
  { x: 600, y: 1150 }
]
//
// Bubble mushroom and air plant on the lit floor D; the bubble rises to
// the target ledge G.
//
export const BUBBLE_MUSHROOM = { x: 1005, y: 1720, topY: 1250 }
export const AIR_PLANT = { x1: 1085, x2: 1255, y: 1720 }
//
// Deadly stalactites under platforms: count and length range per platform.
//
const STALACTITE_COUNT_MIN = 3
const STALACTITE_COUNT_RANGE = 2
const STALACTITE_LEN_MIN = 38
const STALACTITE_LEN_RANGE = 30
//
// Stalactites hit test: only the upper, thick part of each spike kills.
//
const STALACTITE_HIT_INSET_X = 4
const STALACTITE_HIT_LEN_FRAC = 0.8
const STALACTITE_W_MIN = 12
const STALACTITE_W_RANGE = 10
const STALACTITE_JITTER = 0.4
const STALACTITE_ROOT_SINK = 7
//
// Only the part of a stalactite below its platform's underside kills (the
// hero standing on the platform never touches it).
//
const STALACTITE_HIT_GAP = 4
//
// Platform undersides: flat-topped slabs whose bottom tapers toward the
// ends (small ones) with a wavy edge; ledges run past their wall.
//
const PLATFORM_BOTTOM_MIN = 0.5
const PLATFORM_BOTTOM_WAVE = 0.18
const PLATFORM_BOTTOM_SEED = 9.3
const PLATFORM_TAPER_POW = 0.6
const PLATFORM_BOTTOM_FREQ = 2.2
const ART_OUTSIDE_PAD = 42
//
// Ceiling underside (ragged edge).
//
const CEILING_RAGGED_AMP = 16
const CEILING_SEED = 2.6
//
// Respawn keeps the hero this far from a platform edge.
//
const STAND_EDGE_PAD = 28
//
// Wall profile: inset past the collider, ripple amplitude, outcrop bulge.
//
const WALL_ART_INSET = 26
const WALL_RIPPLE_AMP = 30
const WALL_BULGE_AMP = 40
const WALL_BULGE_FREQ = 0.37
const LEFT_WALL_SEED = 1.7
const LEFT_BULGE_SEED = 4.2
const RIGHT_WALL_SEED = 3.1
const RIGHT_BULGE_SEED = 7.9
//
// Profile noise octaves: wavelength (px), weight and seed multiplier.
//
const NOISE_OCTAVES = [
  { len: 97, weight: 0.55, seedMul: 1 },
  { len: 41, weight: 0.3, seedMul: 2.3 },
  { len: 13, weight: 0.15, seedMul: 5.1 }
]
//
// The dormant mushroom on the entry ledge, in the light shaft.
//
export const DORMANT_MUSHROOM = { x: 345, y: 430, scale: 1, seed: 11 }
//
// Always-lit small mushrooms (x, ground y, scale, light radius).
//
export const LIT_MUSHROOMS = [
  { x: 905, y: 1720, scale: 0.55, seed: 22, light: 150 },
  { x: 950, y: 1720, scale: 0.4, seed: 23, light: 110 },
  { x: 1200, y: 1300, scale: 0.5, seed: 24, light: 140 }
]
//
// Single eyes on stalks grown from both walls (side, world Y, radius).
//
export const WALL_EYES = [
  { side: 'left', y: 250, r: 16 },
  { side: 'right', y: 420, r: 18 },
  { side: 'left', y: 760, r: 15 },
  { side: 'right', y: 950, r: 17 },
  { side: 'left', y: 1450, r: 16 },
  { side: 'right', y: 1560, r: 15 }
]
//
// Bounds for ambient fireflies.
//
export const FIREFLY_BOUNDS = { x1: 70, y1: 120, x2: WORLD_W - 70, y2: LAKE_SURFACE_Y - 20 }

/**
 * Builds the deadly stalactite triangles hanging below platforms. Seeded per
 * platform so the art bake and the hit test share the same spikes.
 * @param {() => number} rngFor - Factory returning a seeded random for a platform id
 * @returns {Array<{x: number, y: number, w: number, len: number}>} Spike base centre, width and length
 */
export function buildStalactites(rngFor) {
  const out = []
  PLATFORMS.filter(p => p.stalactites).forEach(p => {
    const rng = rngFor(p.id)
    const count = STALACTITE_COUNT_MIN + Math.floor(rng() * STALACTITE_COUNT_RANGE)
    const span = p.x2 - p.x1
    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / count
      const x = p.x1 + span * t + (rng() - 0.5) * span / count * STALACTITE_JITTER
      const w = STALACTITE_W_MIN + rng() * STALACTITE_W_RANGE
      const len = STALACTITE_LEN_MIN + rng() * STALACTITE_LEN_RANGE
      const rootY = Math.min(platformBottomAt(p, x - w / 2), platformBottomAt(p, x + w / 2))
      const underside = Math.max(platformBottomAt(p, x - w / 2), platformBottomAt(p, x + w / 2))
      out.push({ x, y: rootY - STALACTITE_ROOT_SINK, w, len, hitTop: underside + STALACTITE_HIT_GAP })
    }
  })
  return out
}

/**
 * Horizontal span of a platform's art (ledges and grounds run past the
 * world edge into their wall).
 * @param {Object} p - PLATFORMS entry
 * @returns {{x1: number, x2: number}}
 */
export function platformArtSpan(p) {
  return {
    x1: p.x1 <= 0 ? -ART_OUTSIDE_PAD : p.x1,
    x2: p.x2 >= WORLD_W ? WORLD_W + ART_OUTSIDE_PAD : p.x2
  }
}

/**
 * Underside Y of a platform's art at world X (tapered, wavy).
 * @param {Object} p - PLATFORMS entry
 * @param {number} x - World X
 * @returns {number}
 */
export function platformBottomAt(p, x) {
  const { x1, x2 } = platformArtSpan(p)
  const t = Math.max(0, Math.min(1, (x - x1) / (x2 - x1)))
  const taper = p.kind === PLATFORM_KIND.SMALL ? Math.pow(Math.sin(Math.PI * t), PLATFORM_TAPER_POW) : 1
  const wave = 1 + profileNoise(x * PLATFORM_BOTTOM_FREQ, PLATFORM_BOTTOM_SEED + p.y) * PLATFORM_BOTTOM_WAVE
  return p.y + p.h * (PLATFORM_BOTTOM_MIN + (1 - PLATFORM_BOTTOM_MIN) * taper) * wave
}

/**
 * Ragged lower edge of the ceiling at world X (before the shaft lips).
 * @param {number} x - World X
 * @returns {number}
 */
export function ceilingBottomAt(x) {
  return CEILING_Y + profileNoise(x, CEILING_SEED) * CEILING_RAGGED_AMP
}

/**
 * X that keeps a prop of the given half width fully on the platform whose
 * top is at `y` (and off the walls), so nothing sticks out over its edge.
 * @param {number} x - Wanted X
 * @param {number} y - Platform top Y
 * @param {number} halfW - Prop half width
 * @returns {number}
 */
export function fitOnPlatform(x, y, halfW) {
  const p = PLATFORMS.filter(q => q.y === y).sort((a, b) => Math.abs((a.x1 + a.x2) / 2 - x) - Math.abs((b.x1 + b.x2) / 2 - x))[0]
  if (!p) return x
  const minX = Math.max(p.x1, leftWallX(y)) + halfW
  const maxX = Math.min(p.x2, rightWallX(y)) - halfW
  return minX > maxX ? (minX + maxX) / 2 : Math.max(minX, Math.min(maxX, x))
}

/**
 * Where a drop falling straight down from a point lands: the first
 * platform or leaf top, the lake surface, or the world bottom.
 * @param {number} x - World X
 * @param {number} fromY - World Y the drop falls from
 * @returns {{y: number, water: boolean}}
 */
export function dropLandAt(x, fromY) {
  const hits = [...PLATFORMS, ...PLANT_LEAVES].filter(p => x >= p.x1 && x <= p.x2 && p.y > fromY).map(p => ({ y: p.y, water: false }))
  x > LAKE_X1 && x < LAKE_X2 && LAKE_SURFACE_Y > fromY && hits.push({ y: LAKE_SURFACE_Y, water: true })
  hits.push({ y: WORLD_H, water: false })
  return hits.reduce((a, b) => (b.y < a.y ? b : a))
}

/**
 * True when the hero hitbox touches a stalactite or the
 * plant's thorns.
 * @param {Array} stalactites - From buildStalactites()
 * @param {number} x - Hero anchor X
 * @param {number} y - Hero anchor Y
 * @returns {boolean}
 */
export function hitsSpikes(stalactites, x, y) {
  const feet = y + HERO_FEET_DY
  const top = y + HERO_BODY_DY - HERO_HALF_H
  const overlapsX = (x1, x2) => x + HERO_HALF_W > x1 && x - HERO_HALF_W < x2
  const t = PLANT_THORNS
  if (overlapsX(t.x1, t.x2) && top < t.y2 && feet > t.y1) return true
  return stalactites.some(s => {
    const half = s.w / 2 - STALACTITE_HIT_INSET_X
    const bottom = s.y + s.len * STALACTITE_HIT_LEN_FRAC
    return x + HERO_HALF_W > s.x - half && x - HERO_HALF_W < s.x + half && top < bottom && feet > s.hitTop
  })
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
  return { x: Math.max(minX, Math.min(maxX, x)), y: platform.y - HERO_FEET_DY }
}

/**
 * Seeded value noise for wall profiles (sum of shifted sines).
 * @param {number} v - Coordinate along the profile
 * @param {number} seed - Profile seed
 * @returns {number} Roughly in [-1, 1]
 */
export function profileNoise(v, seed) {
  return NOISE_OCTAVES.reduce((sum, o) => sum + Math.sin(v / o.len + seed * o.seedMul) * o.weight, 0)
}

/**
 * Inner X of the left wall rock at world Y.
 * @param {number} y - World Y
 * @returns {number}
 */
export function leftWallX(y) {
  return WALL_COLLIDE_W + WALL_ART_INSET + profileNoise(y, LEFT_WALL_SEED) * WALL_RIPPLE_AMP +
    Math.max(0, profileNoise(y * WALL_BULGE_FREQ, LEFT_BULGE_SEED)) * WALL_BULGE_AMP
}

/**
 * Inner X of the right wall rock at world Y.
 * @param {number} y - World Y
 * @returns {number}
 */
export function rightWallX(y) {
  return WORLD_W - WALL_COLLIDE_W - WALL_ART_INSET - profileNoise(y, RIGHT_WALL_SEED) * WALL_RIPPLE_AMP -
    Math.max(0, profileNoise(y * WALL_BULGE_FREQ, RIGHT_BULGE_SEED)) * WALL_BULGE_AMP
}
