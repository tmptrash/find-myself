import * as Layout from './cave-layout.js'
//
// Geometry of the monster plant, shared by its bake (cave-plant-art.js),
// the eyes grown into it (wall-eye.js), its hanging strands and the level
// (rock base collider). One main woody vine rises from a mossy rock in the
// lake, thinning as it climbs; many thinner vines wind around it, showing
// in front, slipping behind and coming out again. Some peel off toward a
// leaf; under every leaf the vine feeding it splits into a brush of fingers
// holding the pad up. Each point carries its width and a depth `z`
// (-1 behind the main vine … 1 in front).
//
//
// Rock the plant grows out of (top plateau stands above the lake).
//
export const PLANT_ROCK = { x1: 655, x2: 830, topY: 1720, plateauX1: 700, plateauX2: 790 }
//
// Main trunk: the axis it grows along, the width of its stem bundle at the
// foot / top, taper curve, flare at the foot (the stems spread into roots
// there), gentle S sway.
//
const AXIS_SINK = 24
const MAIN_W0 = 100
const MAIN_W1 = 46
const MAIN_TAPER_POW = 1
const FLARE_W = 70
const FLARE_SHARE = 0.08
//
// Trunk bends: two overlapping waves (amplitude px, turns over the height,
// phase), so it swings left and right as it climbs; the foot stays on the
// rock (bends grow in over BEND_RISE of the height). Phases keep the trunk
// on the thorny band (height share ~0.75–0.88).
//
const BENDS = [
  { amp: 42, turns: 1.25, phase: 0 },
  { amp: 14, turns: 2.6, phase: 3 }
]
const BEND_RISE = 0.15
const AXIS_TOP_UNDER = 12
const TOP_LEAN_POW = 3
const STEP_PX = 6
//
// Thick stems twisted around each other like a rope (they make the trunk):
// phase around the axis, share of the bundle width each is thick. Their
// centres circle the axis at STEM_ORBIT of the bundle width, so they touch
// but stay apart (dark gaps between them); near the top they come together
// under the top leaf.
//
const STEMS = [
  { phase: 0, share: 0.42 },
  { phase: Math.PI * 2 / 3, share: 0.38 },
  { phase: Math.PI * 4 / 3, share: 0.34 }
]
const STEM_TWISTS = 2.4
const STEM_ORBIT = 0.42
const STEM_MERGE = 0.12
//
// Thin vines winding around the main one: twist phase / turns (sign =
// direction), width at the foot and at the top (each thins evenly with
// height), height span, and the leaf it peels off to (null: none). Each
// lies on the main vine's bark (its centre circles at the main radius plus
// WRAP_STAND of its width), so it shows in front, slips behind and comes
// out on the other side.
//
const WRAPS = [
  { phase: 0, twists: 2.2, w0: 18, w1: 8, from: 0, to: 1, leaf: null },
  { phase: 2.1, twists: 2.2, w0: 18, w1: 9, from: 0, to: 1, leaf: 'B' },
  { phase: 4.2, twists: 2.2, w0: 16, w1: 8, from: 0, to: 1, leaf: 'T' },
  { phase: 1, twists: 2.6, w0: 16, w1: 8, from: 0, to: 1, leaf: 'F' },
  { phase: 3, twists: -2.8, w0: 11, w1: 5, from: 0.02, to: 0.95, leaf: null },
  { phase: 5, twists: -3.4, w0: 9, w1: 4, from: 0.1, to: 1, leaf: null },
  { phase: 0.6, twists: 3.8, w0: 8, w1: 4, from: 0.15, to: 0.8, leaf: null },
  { phase: 3.9, twists: -4.2, w0: 7, w1: 4, from: 0.3, to: 1, leaf: null }
]
const WRAP_STAND = 0.15
const VINE_TAPER_POW = 1
//
// Lumpy wood: the width swells and pinches along every vine.
//
const VINE_LUMP = 0.06
const VINE_LUMP_FREQ = 1.7
const MAIN_LUMP_SEED = 1.9
//
// A vine with a free end thins to a point over this share of its length.
//
const VINE_TIP_SHARE = 0.1
const VINE_TIP_MIN = 0.25
//
// Peeling off to a leaf: the vine leaves the main one this far below the
// leaf, on the leaf's side and in front, and bends up in an S to a hub
// under the leaf (part of the way out toward the leaf's middle).
//
const PEEL_DROP = 260
const PEEL_ANGLE = Math.PI / 3
const PEEL_REACH_UP = 70
const PEEL_STEPS = 22
//
// The branch thins toward its leaf (to PEEL_TAPER of its width at the
// trunk) and bends once more on the way (a sideways wave).
//
const PEEL_TAPER = 0.5
const PEEL_WAVE = 10
const HUB_DROP = 115
const HUB_OUT = 0.7
const TOP_HUB_DROP = 125
//
// Brush under every leaf: from the hub the vine splits into fingers that
// spread under the pad and hold it up (one per FINGER_PX of leaf width),
// rising first, then bending out; they thin to a point and overlap in
// depth by turns.
//
const FINGER_PX = 55
const FINGERS_MIN = 3
const FINGERS_MAX = 7
const FINGER_SPAN_FROM = 0.1
const FINGER_SPAN = 0.8
const FINGER_UNDER = 30
const FINGER_CTRL_OUT = 0.25
const FINGER_CTRL_UP = 0.6
const FINGER_W = 0.6
const FINGER_TIP_W = 3
const FINGER_STEPS = 16
const FINGER_BACK_Z = 0.4
//
// Eyes grown into the main vine, each set by hand: height share on the axis,
// side across it (share of the half-width, - left) and radius. They sit
// where vines cross or peel off toward a leaf, alternating sides, clear of
// the thorny band (left side, shares 0.75–0.88).
//
const EYES = [
  { t: 0.07, across: 0.4, r: 11 },
  { t: 0.2, across: -0.35, r: 10 },
  { t: 0.34, across: 0.3, r: 12 },
  { t: 0.47, across: -0.3, r: 9 },
  { t: 0.6, across: 0.35, r: 11 },
  { t: 0.71, across: -0.25, r: 10 },
  { t: 0.83, across: 0.3, r: 10 },
  { t: 0.94, across: -0.2, r: 12 }
]
const EYE_MAX_W_SHARE = 0.3
const FULL_TURN = Math.PI * 2
let cached = null

/**
 * The plant's axis, its vines and eye spots (built once).
 * @returns {{axis: Array, stemCount: number, vines: Array<Array>, eyes: Array}}
 *   axis: trunk centre line {x, y, w (stem bundle width), flare (extra
 *   width at the foot), t}; stemCount:
 *   how many of the vines (first) are trunk stems; vines: arrays of points
 *   {x, y, w, z} (stems, wrapping vines, brush fingers); eyes: {x, y, r}
 */
export function plantShape() {
  if (cached) return cached
  const axis = axisPoints()
  const topLeaf = Layout.PLANT_LEAVES.find(isTopLeaf)
  const topT = axisShareAtY(axis, topLeaf.y + TOP_HUB_DROP)
  const stems = STEMS.map(def => stemPoints(def, axis, topT))
  const wraps = WRAPS.map(def => wrapPoints(def, axis))
  const leafVines = WRAPS.map((def, i) => ({ leaf: Layout.PLANT_LEAVES.find(l => l.id === def.leaf), pts: wraps[i] })).filter(v => v.leaf)
  const brushes = [{ leaf: topLeaf, pts: stems[0] }, ...leafVines].flatMap(b => brushPoints(b.pts[b.pts.length - 1], b.leaf))
  cached = { axis, stemCount: stems.length, vines: [...stems, ...wraps, ...brushes], eyes: EYES.map(def => eyeSpot(axis, def)) }
  return cached
}

/**
 * Axis point at a height share (0 = base, 1 = top), interpolated.
 * @param {Array} axis - Axis points from plantShape()
 * @param {number} t - Height share
 * @returns {{x: number, y: number, w: number}}
 */
export function axisAt(axis, t) {
  const f = Math.min(1, Math.max(0, t)) * (axis.length - 1)
  const i = Math.min(axis.length - 2, Math.floor(f))
  const u = f - i
  const a = axis[i]
  const b = axis[i + 1]
  return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, w: a.w + (b.w - a.w) * u }
}
//
// Main vine centre line from the rock up to the top leaf: tapering, flared
// at the foot, swaying gently and leaning toward the top leaf's middle.
//
function axisPoints() {
  const bottomY = PLANT_ROCK.topY + AXIS_SINK
  const topLeaf = Layout.PLANT_LEAVES.find(isTopLeaf)
  const topY = topLeaf.y + AXIS_TOP_UNDER
  const span = bottomY - topY
  const baseX = Layout.PLANT_TRUNK.x
  const leanX = (topLeaf.x1 + topLeaf.x2) / 2 - baseX
  const pts = []
  for (let y = bottomY; y >= topY; y -= STEP_PX) {
    const t = (bottomY - y) / span
    const flare = Math.pow(Math.max(0, 1 - t / FLARE_SHARE), 2) * FLARE_W
    pts.push({
      x: baseX + trunkBend(t) + leanX * Math.pow(t, TOP_LEAN_POW),
      y,
      w: MAIN_W1 + (MAIN_W0 - MAIN_W1) * Math.pow(1 - t, MAIN_TAPER_POW) + flare,
      flare,
      t
    })
  }
  return pts
}
//
// Sideways bend of the trunk at a height share.
//
function trunkBend(t) {
  return BENDS.reduce((sum, b) => sum + Math.sin(t * FULL_TURN * b.turns + b.phase) * b.amp, 0) * Math.min(1, t / BEND_RISE)
}
//
// The top leaf is the highest one: the plant ends under it.
//
function isTopLeaf(leaf) {
  return leaf.y === Math.min(...Layout.PLANT_LEAVES.map(l => l.y))
}
//
// One trunk stem up to the top leaf's hub: circling the axis with the other
// stems (rope twist), thinning with height (the foot flare only spreads the
// stems apart, it does not thicken them), drawing in to the axis near the
// top so all stems meet in the brush under the top leaf.
//
function stemPoints(def, axis, toT) {
  return axis.filter(p => p.t <= toT).map(p => {
    const a = p.t * STEM_TWISTS * FULL_TURN + def.phase
    const merge = Math.min(1, (toT - p.t) / STEM_MERGE)
    const lump = 1 + Layout.profileNoise(p.y * VINE_LUMP_FREQ, def.phase + MAIN_LUMP_SEED) * VINE_LUMP
    return { x: p.x + Math.sin(a) * p.w * STEM_ORBIT * merge, y: p.y, w: (p.w - p.flare) * def.share * lump, z: Math.cos(a) * merge }
  })
}
//
// One thin vine winding around the main one on its bark; a vine that feeds
// a leaf leaves on the leaf's side (its phase is set so it is in front
// there) and bends up to the hub under the leaf.
//
function wrapPoints(def, axis) {
  const leaf = def.leaf && Layout.PLANT_LEAVES.find(l => l.id === def.leaf)
  const peelT = leaf ? axisShareAtY(axis, leaf.y + PEEL_DROP) : def.to
  const side = leaf ? Math.sign((leaf.x1 + leaf.x2) / 2 - Layout.PLANT_TRUNK.x) || 1 : 1
  const phase = leaf ? side * PEEL_ANGLE - peelT * def.twists * FULL_TURN : def.phase
  const from = Math.round(def.from * (axis.length - 1))
  const to = Math.round(peelT * (axis.length - 1))
  const pts = []
  for (let i = from; i <= to; i++) {
    const p = axis[i]
    const u = (i - from) / Math.max(1, to - from)
    const a = p.t * def.twists * FULL_TURN + phase
    const lump = 1 + Layout.profileNoise(p.y * VINE_LUMP_FREQ, def.phase) * VINE_LUMP
    const tip = leaf ? 1 : vineTip(u, def.from > 0)
    const w = (def.w0 + (def.w1 - def.w0) * Math.pow(p.t, VINE_TAPER_POW)) * lump * tip
    pts.push({ x: p.x + Math.sin(a) * (p.w / 2 + w * WRAP_STAND), y: p.y, w, z: Math.cos(a) })
  }
  leaf && pts.push(...peelPoints(pts[pts.length - 1], leaf))
  return pts
}
//
// Width factor near a vine's ends: thins to a point at the top end and, for
// vines that start up the main vine, at the bottom end too.
//
function vineTip(u, freeStart) {
  const top = Math.min(1, (1 - u) / VINE_TIP_SHARE)
  const bottom = freeStart ? Math.min(1, u / VINE_TIP_SHARE) : 1
  return VINE_TIP_MIN + (1 - VINE_TIP_MIN) * Math.min(top, bottom)
}
//
// Height share of the axis point nearest to a world Y.
//
function axisShareAtY(axis, y) {
  let best = 0
  axis.forEach((p, i) => Math.abs(p.y - y) < Math.abs(axis[best].y - y) && (best = i))
  return best / (axis.length - 1)
}
//
// From the trunk toward the leaf's hub: rising in an S (cubic curve) with
// an extra sideways wave, thinning as it goes, coming to the front.
//
function peelPoints(p0, leaf) {
  const hub = { x: p0.x + ((leaf.x1 + leaf.x2) / 2 - p0.x) * HUB_OUT, y: leaf.y + HUB_DROP }
  const p1 = { x: p0.x, y: p0.y - PEEL_REACH_UP }
  const p2 = { x: hub.x, y: hub.y + PEEL_REACH_UP }
  const pts = cubicPoints(p0, p1, p2, hub, PEEL_STEPS, t => p0.w * (1 - (1 - PEEL_TAPER) * t), t => p0.z + (1 - p0.z) * Math.min(1, t * 2))
  return pts.slice(1).map((p, i) => ({ ...p, x: p.x + Math.sin((i + 1) / PEEL_STEPS * FULL_TURN) * PEEL_WAVE }))
}
//
// The brush under a leaf: fingers from the hub spreading under the pad.
//
function brushPoints(hub, leaf) {
  const len = leaf.x2 - leaf.x1
  const count = Math.max(FINGERS_MIN, Math.min(FINGERS_MAX, Math.round(len / FINGER_PX)))
  const fingers = []
  for (let i = 0; i < count; i++) {
    const tip = { x: leaf.x1 + len * (FINGER_SPAN_FROM + FINGER_SPAN * i / (count - 1)), y: leaf.y + FINGER_UNDER }
    const c1 = { x: hub.x, y: hub.y + (tip.y - hub.y) * FINGER_CTRL_UP }
    const c2 = { x: hub.x + (tip.x - hub.x) * (1 - FINGER_CTRL_OUT), y: tip.y }
    const w0 = hub.w * FINGER_W
    const z = i % 2 ? FINGER_BACK_Z : 1
    fingers.push(cubicPoints(hub, c1, c2, tip, FINGER_STEPS, t => w0 + (FINGER_TIP_W - w0) * t, () => z))
  }
  return fingers
}
//
// Points along a cubic curve with width and depth given per share.
//
function cubicPoints(p0, p1, p2, p3, steps, widthAt, depthAt) {
  const pts = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const u = 1 - t
    pts.push({
      x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
      y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
      w: widthAt(t),
      z: depthAt(t)
    })
  }
  return pts
}
//
// One eye on the main vine's face, no wider than it allows there.
//
function eyeSpot(axis, def) {
  const p = axisAt(axis, def.t)
  return { x: p.x + def.across * p.w / 2, y: p.y, r: Math.min(def.r, p.w * EYE_MAX_W_SHARE) }
}
