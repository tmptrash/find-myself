import * as PolyBatch from '../../../utils/poly-batch.js'
import { getRGB } from '../../../utils/helper.js'
import { addLiddedEyeBerry, FOREST_SUN_LIT_OFFSET_X, FOREST_SUN_LIT_OFFSET_Y, FOREST_SUN_LIT_FRAC } from '../../forest/utils/forest-eye-berry.js'
import { CAVE_CFG } from '../cfg.js'
//
// Shared live look of the cave's hostile stalk-eye (in the level and in
// the menu's picture), drawn into one polygon batch per frame: bloodshot eyes,
// thorny contoured stalks and leaf blades. Kin of the forest's eye-berry
// look (forest-eye-berry.js), with CAVE_CFG.creature colours.
//
// An eye: the forest berry ball (contour, pinkish shaded underside, cream
// lit face), red veins running in from the rim (VEIN_* — each a short
// wandering line, thinner toward its end, leaving the rim within
// VEIN_SPREAD of its even share of the turn), a red iris ring IRIS_FRAC times
// the pupil round it, the pupil and a small glint up right. A blinking eye
// is the forest's lidded berry for that moment (no veins under the lid).
//
const VEIN_SPREAD = 0.8
const VEIN_FORK_CHANCE = 0.5
const VEIN_FROM = 0.95
const VEIN_TO_MIN = 0.4
const VEIN_TO_RANGE = 0.25
const VEIN_W = 0.11
const VEIN_W_MIN = 0.6
const VEIN_WANDER = 0.35
const VEIN_FORK_AT = 0.5
const VEIN_FORK_TURN = 0.6
const VEIN_FORK_LEN = 0.3
const IRIS_FRAC = 1.55
const GLINT_X = 0.3
const GLINT_Y = -0.35
const GLINT_R = 0.26
//
// Thorns along a stalk: one every THORN_STEP px of its length (alternating
// sides), leaning toward the tip by THORN_LEAN rad, base THORN_BASE times
// as wide as long; contour, dark body, then the bone-pale last THORN_TIP
// share of it.
//
const THORN_LEAN = 0.6
const THORN_BASE = 0.55
const THORN_TIP = 0.35
const THORN_CONTOUR = 1.2
//
// Leaf blades: a leaf-shaped width (narrow at the root, widest at
// BLADE_WIDEST, pointed tip), contour, body, then a lit midrib.
//
const BLADE_WIDEST = 0.4
const BLADE_CONTOUR = 2
const BLADE_MIDRIB = 0.35
const COLOR_KEYS = ['contour', 'stem', 'stemLight', 'thorn', 'thornTip', 'sclera', 'scleraShade', 'vein', 'iris', 'pupil', 'glint', 'leaf', 'leafLight']
const colorCache = new WeakMap()
const lidColors = new WeakMap()

/**
 * Kaplay rgb colours of the creatures, resolved once per live Kaplay inst.
 * @param {Object} k - Kaplay inst
 * @returns {Object} Colour per CAVE_CFG.creature key
 */
export function creatureColors(k) {
  let colors = colorCache.get(k)
  if (colors) return colors
  colors = Object.fromEntries(COLOR_KEYS.map(key => [key, getRGB(k, CAVE_CFG.creature[key])]))
  colorCache.set(k, colors)
  lidColors.set(colors, { contour: colors.contour, berry: colors.sclera, berryShade: colors.scleraShade, pupil: colors.pupil, stem: colors.stem })
  return colors
}

/**
 * Seeded vein layout of one eye: where each vein leaves the rim, how far
 * in it runs, how it wanders and where it forks.
 * @param {() => number} rng - Seeded random
 * @param {number} count - Number of veins
 * @param {number} [inner=VEIN_TO_MIN] - How far in the shortest-reaching vein ends (share of the radius from the centre; smaller reaches deeper)
 * @returns {Array<Object>} Vein layout (pass to addVeinedEye)
 */
export function eyeVeins(rng, count, inner = VEIN_TO_MIN) {
  const veins = []
  for (let i = 0; i < count; i++) {
    veins.push({
      a: (i + rng() * VEIN_SPREAD) / count * Math.PI * 2,
      to: inner + rng() * VEIN_TO_RANGE,
      bend: (rng() * 2 - 1) * VEIN_WANDER,
      fork: rng() < VEIN_FORK_CHANCE ? -1 : 1
    })
  }
  return veins
}

/**
 * Queues one bloodshot eye.
 * @param {Object} batch - PolyBatch inst
 * @param {Object} eye - {x, y, r: centre and radius, lookX, lookY: pupil offset, pupilR, close: 0 open … 1 shut, veins: from eyeVeins()}
 * @param {Object} colors - From creatureColors()
 * @param {number} contourW - Contour ring width
 */
export function addVeinedEye(batch, eye, colors, contourW) {
  const { x, y, r, pupilR } = eye
  const px = x + eye.lookX
  const py = y + eye.lookY
  if (eye.close > 0) {
    addLiddedEyeBerry(batch, x, y, r, px, py, pupilR, lidColors.get(colors), contourW, eye.close)
    return
  }
  PolyBatch.addDisc(batch, x, y, r + contourW, colors.contour)
  PolyBatch.addDisc(batch, x, y, r, colors.scleraShade)
  PolyBatch.addDisc(batch, x + r * FOREST_SUN_LIT_OFFSET_X, y + r * FOREST_SUN_LIT_OFFSET_Y, r * FOREST_SUN_LIT_FRAC, colors.sclera)
  eye.veins.forEach(v => addVein(batch, x, y, r, v, colors.vein))
  PolyBatch.addDisc(batch, px, py, pupilR * IRIS_FRAC, colors.iris)
  PolyBatch.addDisc(batch, px, py, pupilR, colors.pupil)
  PolyBatch.addDisc(batch, px + pupilR * GLINT_X, py + pupilR * GLINT_Y, pupilR * GLINT_R, colors.glint)
}

/**
 * Queues a stalk: contour, body, a lit line on its upper-left side.
 * @param {Object} batch - PolyBatch inst
 * @param {Array<{x: number, y: number}>} pts - Stalk points, root first
 * @param {number} wBase - Width at the root
 * @param {number} wTip - Width at the tip
 * @param {Object} colors - From creatureColors()
 * @param {number} contourPad - Extra width of the contour
 * @param {number} lightFrac - Lit line width share
 */
export function addStalk(batch, pts, wBase, wTip, colors, contourPad, lightFrac) {
  PolyBatch.addTaperedRibbon(batch, pts, wBase + contourPad, wTip + contourPad, colors.contour, true)
  PolyBatch.addTaperedRibbon(batch, pts, wBase, wTip, colors.stem, true)
  PolyBatch.addTaperedRibbon(batch, pts, wBase * lightFrac, wTip * lightFrac, colors.stemLight, true)
}

/**
 * Queues thorns along a stalk, alternating sides, leaning toward its tip.
 * @param {Object} batch - PolyBatch inst
 * @param {Array<{x: number, y: number}>} pts - Stalk points, root first
 * @param {number} wBase - Stalk width at the root
 * @param {number} wTip - Stalk width at the tip
 * @param {Object} cfg - {step: px between thorns, len: thorn length at the root, tipLen: at the tip, from: share of the stalk where they start, to: where they end}
 * @param {Object} colors - From creatureColors()
 */
export function addThorns(batch, pts, wBase, wTip, cfg, colors) {
  const total = pathLength(pts)
  const count = Math.floor(total * (cfg.to - cfg.from) / cfg.step)
  for (let i = 0; i < count; i++) {
    const u = cfg.from + (i + 0.5) * cfg.step / total
    const at = pointAt(pts, u * total)
    const side = i % 2 === 0 ? 1 : -1
    const half = (wBase + (wTip - wBase) * u) / 2
    const len = cfg.len + (cfg.tipLen - cfg.len) * u
    addThorn(batch, at, side, half, len, colors)
  }
}

/**
 * Queues one leaf blade along a spine.
 * @param {Object} batch - PolyBatch inst
 * @param {Array<{x: number, y: number}>} pts - Blade spine, root first
 * @param {number} w - Widest width
 * @param {Object} colors - From creatureColors()
 */
export function addBlade(batch, pts, w, colors) {
  addLeafShape(batch, pts, w + BLADE_CONTOUR, colors.contour)
  addLeafShape(batch, pts, w, colors.leaf)
  addLeafShape(batch, pts, w * BLADE_MIDRIB, colors.leafLight)
}

/**
 * Fills pts with an arc: from (x, y) heading `angle`, bending by `bend`
 * rad over its length (shaped by pow), segments of segLen px.
 * @param {Array<{x: number, y: number}>} pts - Points to fill (length = segments + 1)
 * @param {number} x - Root X
 * @param {number} y - Root Y
 * @param {number} angle - Root heading (rad)
 * @param {number} bend - Total turn over the length (rad)
 * @param {number} pow - Bend shape (1 even, > 1 more toward the tip)
 * @param {number} segLen - Segment length
 */
export function fillArc(pts, x, y, angle, bend, pow, segLen) {
  const n = pts.length - 1
  pts[0].x = x
  pts[0].y = y
  let a = angle
  for (let i = 1; i <= n; i++) {
    a = angle + bend * Math.pow(i / n, pow)
    pts[i].x = pts[i - 1].x + Math.cos(a) * segLen
    pts[i].y = pts[i - 1].y + Math.sin(a) * segLen
  }
}

/**
 * How close something is, eased: 0 from `far` out, 1 from `near` in.
 * @param {number} far - Distance where it starts
 * @param {number} near - Distance where it is full
 * @param {number} dist - Distance
 * @returns {number} 0..1
 */
export function closeness(far, near, dist) {
  const t = Math.max(0, Math.min(1, (dist - far) / (near - far)))
  return t * t * (3 - 2 * t)
}

/**
 * Point array for fillArc.
 * @param {number} segments - Segment count
 * @returns {Array<{x: number, y: number}>}
 */
export function makePoints(segments) {
  return Array.from({ length: segments + 1 }, () => ({ x: 0, y: 0 }))
}
//
// One vein: from the rim toward the centre, wandering, thinning, forking once.
//
function addVein(batch, x, y, r, v, color) {
  const w = Math.max(VEIN_W_MIN, r * VEIN_W)
  const ax = x + Math.cos(v.a) * r * VEIN_FROM
  const ay = y + Math.sin(v.a) * r * VEIN_FROM
  const mid = v.a + v.bend
  const mr = r * (VEIN_FROM + v.to) / 2
  const bx = x + Math.cos(mid) * mr
  const by = y + Math.sin(mid) * mr
  const cx = x + Math.cos(v.a - v.bend) * r * v.to
  const cy = y + Math.sin(v.a - v.bend) * r * v.to
  PolyBatch.addLine(batch, ax, ay, bx, by, w, color)
  PolyBatch.addLine(batch, bx, by, cx, cy, w * VEIN_FORK_AT, color)
  const fa = Math.atan2(by - ay, bx - ax) + v.fork * VEIN_FORK_TURN
  PolyBatch.addLine(batch, bx, by, bx + Math.cos(fa) * r * VEIN_FORK_LEN, by + Math.sin(fa) * r * VEIN_FORK_LEN, w * VEIN_FORK_AT, color)
}
//
// One thorn on the stalk's edge: a contoured dark triangle, its point bone-pale.
//
function addThorn(batch, at, side, half, len, colors) {
  const nx = -Math.sin(at.a) * side
  const ny = Math.cos(at.a) * side
  const out = Math.atan2(ny, nx) + side * -THORN_LEAN
  const dirX = Math.cos(out)
  const dirY = Math.sin(out)
  const bx = at.x + nx * half
  const by = at.y + ny * half
  const base = len * THORN_BASE / 2
  const tx = Math.cos(at.a) * base
  const ty = Math.sin(at.a) * base
  const tipX = bx + dirX * len
  const tipY = by + dirY * len
  const c = THORN_CONTOUR
  PolyBatch.addTriangle(batch, bx - tx * (1 + c / base) - nx * c, by - ty * (1 + c / base) - ny * c, bx + tx * (1 + c / base) - nx * c, by + ty * (1 + c / base) - ny * c, tipX + dirX * c, tipY + dirY * c, colors.contour)
  PolyBatch.addTriangle(batch, bx - tx - nx, by - ty - ny, bx + tx - nx, by + ty - ny, tipX, tipY, colors.thorn)
  const sx = bx + dirX * len * (1 - THORN_TIP)
  const sy = by + dirY * len * (1 - THORN_TIP)
  PolyBatch.addTriangle(batch, sx - tx * THORN_TIP, sy - ty * THORN_TIP, sx + tx * THORN_TIP, sy + ty * THORN_TIP, tipX, tipY, colors.thornTip)
}
//
// A leaf-shaped ribbon along the spine (narrow root, wide at BLADE_WIDEST,
// pointed tip) as one polygon strip.
//
function addLeafShape(batch, pts, w, color) {
  const n = pts.length
  const left = []
  const right = []
  for (let i = 0; i < n; i++) {
    const a = pts[Math.min(i + 1, n - 1)]
    const b = pts[Math.max(i - 1, 0)]
    const d = Math.hypot(a.x - b.x, a.y - b.y) || 1
    const nx = -(a.y - b.y) / d
    const ny = (a.x - b.x) / d
    const u = i / (n - 1)
    const half = w / 2 * leafProfile(u)
    left.push({ x: pts[i].x + nx * half, y: pts[i].y + ny * half })
    right.push({ x: pts[i].x - nx * half, y: pts[i].y - ny * half })
  }
  const poly = [...left, ...right.reverse()]
  const indices = []
  for (let i = 0; i < n - 1; i++) {
    const a = i
    const b = i + 1
    const c = 2 * n - 1 - i
    const d = 2 * n - 2 - i
    indices.push(a, b, c, b, d, c)
  }
  PolyBatch.addPolygon(batch, poly, indices, color)
}
//
// Leaf width share along it: rising to 1 at BLADE_WIDEST, then easing to a point.
//
function leafProfile(u) {
  return u < BLADE_WIDEST ? Math.sin(u / BLADE_WIDEST * Math.PI / 2) : Math.cos((u - BLADE_WIDEST) / (1 - BLADE_WIDEST) * Math.PI / 2)
}
function pathLength(pts) {
  let total = 0
  for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y)
  return total
}
//
// Point and heading at a distance along the path.
//
function pointAt(pts, dist) {
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]
    const b = pts[i]
    const len = Math.hypot(b.x - a.x, b.y - a.y)
    if (dist <= len || i === pts.length - 1) {
      const u = len ? Math.min(1, dist / len) : 0
      return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, a: Math.atan2(b.y - a.y, b.x - a.x) }
    }
    dist -= len
  }
  return { x: pts[0].x, y: pts[0].y, a: 0 }
}
