import { getRGB, vecLen } from '../../../utils/helper.js'
import { applyForestFilmGrainToCanvas } from '../../forest/utils/forest-parallax-grain.js'
import { CAVE_CFG } from '../cfg.js'
import * as Atlas from '../utils/cave-atlas.js'
//
// How the climber (cave-haggy.js) looks: one baked atlas (per page, loaded
// once per live k) of its head (the lower jaw cut off to open and shut),
// the scales of its limbs as a tile, its palm and its three fingers (each
// finger with its claw one strip that bends). Every frame: each limb is
// one textured strip along a smooth curve through its chain's points (no
// joints: it bends all along), tapering to the wrist; each hand a palm
// over three bent finger strips; the head over the limbs' roots, turning
// round by narrowing and widening again, its jaw turned about the mouth's
// corner. No game objects, no masks, no textures made at run time; the
// vectors are the creature's own, reused.
//
const SPRITE = 'cave0-haggy-v4'
const GRAIN_SEED = 9710
const C = CAVE_CFG.haggy
const A = C.anatomy
//
// Sizes: world px per sheet px of the head and of the arm (with its hand);
// the atlas is baked BAKE_OVER times finer, its pieces ATLAS_GAP px apart.
//
const HEAD_SCALE = 0.14
const ARM_SCALE = 0.1
const BAKE_OVER = 2.5
const ATLAS_GAP = 4
//
// The pieces (Atlas): the head by its middle; its lower jaw (head piece
// px) turning about the mouth's back corner (HINGE), the throat seen
// when it opens (CAVITY, painted in the mouth colour on the head under
// the jaw); the arm piece's place on the sheet (the hand's cuts below
// are in sheet px); the arm's scales: a stretch of its tube (TILE, in the
// arm piece) made into a tile that repeats along the arm, its last
// TILE_BLEND columns faded into the columns before its first.
//
const HEAD = { piece: 'haggyHead', pivot: { x: 287, y: 231 } }
const JAW = [[44, 325], [150, 318], [240, 314], [292, 306], [300, 332], [282, 364], [250, 392], [205, 416], [130, 420], [70, 410], [46, 386], [38, 352]]
const HINGE = { x: 292, y: 308 }
const CAVITY = [[50, 326], [150, 318], [240, 314], [292, 306], [298, 330], [240, 350], [150, 362], [58, 372]]
const ARM_PIECE = 'haggyArm'
const ARM_AT = { x: 236, y: 410 }
const TILE = { x: 94, y: 152, w: 880, h: 122 }
const TILE_BLEND = 60
const TILE_INSET = 0.01
//
// The hand (sheet px): the palm cut out (drawn over the fingers' roots,
// its pivot the wrist) and three fingers, each with its claw one strip of
// its own along its spine (root to claw tip, `widths` px each side at its
// points, smoothed into FINGER_SUBS pieces per span; cut out by its
// `cuts`). A finger bends smoothly, no rigid pieces and no notch at a
// joint: `turn` rad at a full curl (1) spread over KNUCKLE_BEND px from
// where it leaves the palm, its claw `hook` rad more over JOINT_BEND px
// round its joint; open wide they bend the other way (curl below 0).
//
const WRIST = { x: 1270, y: 623 }
const PALM = { poly: [[1240, 560], [1330, 558], [1392, 532], [1432, 562], [1424, 596], [1432, 640], [1420, 664], [1436, 702], [1392, 724], [1330, 708], [1240, 710]], pivot: WRIST }
const FINGERS = [
  {
    cuts: [
      [[1362, 596], [1384, 540], [1440, 466], [1478, 438], [1502, 450], [1508, 482], [1490, 502], [1442, 588], [1408, 616]],
      [[1462, 446], [1480, 428], [1540, 416], [1572, 440], [1570, 454], [1530, 457], [1512, 484], [1486, 488], [1466, 470]]
    ],
    spine: [[1360, 620], [1405, 575], [1450, 500], [1490, 456], [1530, 438], [1578, 452]],
    widths: [48, 48, 46, 40, 34, 30],
    joint: { x: 1488, y: 462 },
    turn: 0.55,
    hook: 0.75
  },
  {
    cuts: [
      [[1385, 598], [1420, 590], [1540, 578], [1562, 588], [1566, 640], [1546, 652], [1420, 658], [1385, 652]],
      [[1546, 594], [1566, 584], [1602, 594], [1634, 630], [1638, 654], [1622, 652], [1590, 642], [1562, 648], [1546, 634]]
    ],
    spine: [[1370, 624], [1420, 623], [1500, 622], [1558, 620], [1600, 626], [1642, 662]],
    widths: [48, 48, 46, 44, 40, 30],
    joint: { x: 1558, y: 616 },
    turn: 0,
    hook: 0.55
  },
  {
    cuts: [
      [[1368, 664], [1412, 638], [1442, 680], [1488, 744], [1494, 772], [1472, 798], [1450, 792], [1398, 722], [1364, 702]],
      [[1446, 772], [1470, 754], [1494, 764], [1532, 790], [1552, 806], [1546, 816], [1500, 824], [1464, 812], [1446, 794]]
    ],
    spine: [[1370, 660], [1400, 700], [1440, 745], [1470, 778], [1505, 800], [1556, 816]],
    widths: [48, 48, 44, 40, 36, 30],
    joint: { x: 1470, y: 784 },
    turn: -0.55,
    hook: -0.75
  }
]
const FINGER_SUBS = 4
const KNUCKLE_BEND = 40
const JOINT_BEND = 36
//
// A limb's curve: a Catmull-Rom spline through its chain's points,
// `subdivide` pieces per chain piece; its strip is HALF_W px wide each
// side at the art's width (times the anatomy's thickness and taper). The
// head never gets narrower than MIN_FACE of its width as it turns round.
// The holds are shown as lines HOLDS_W px wide.
//
const SPINE_POINTS = A.segments * A.subdivide + 1
const HALF_W = TILE.h * ARM_SCALE * 0.5 * A.thickness
const MIN_FACE = 0.14
const HOLDS_W = 2
//
// Debug drawing: marks' sizes, the line width, the label's size and
// offsets, its colours.
//
const DEBUG_DOT = 3
const DEBUG_LINE = 1
const DEBUG_NORMAL = 14
const DEBUG_TEXT = 10
const DEBUG_TEXT_DY = -70
const DEBUG_LINE_H = 12
const DEBUG_COLORS = { body: '#ffffff', want: '#ffd060', anchor: '#5fe07a', reach: '#f0c040', probe: '#60c0ff', free: '#c08080', normal: '#ff7050', depth: '#ff40ff', candidate: '#a070ff', path: '#7090ff', sound: '#ff4040' }
const DEBUG_STATE_COLOR = { anchor: 'anchor', reach: 'reach', probe: 'probe' }
const HALF = 0.5
const DEG = 180 / Math.PI
const BYTE_MAX = 255
const HEX_RADIX = 16
const atlasFor = new WeakMap()
const holdLinesFor = new WeakMap()
const indicesFor = new Map()
let atlas = null
let rigs = null

/**
 * Bakes the atlas (once per page) and loads it on this live k (once).
 * @param {Object} k - Kaplay instance
 */
export function bake(k) {
  if (atlasFor.has(k)) return
  atlas ??= buildAtlas()
  if (!atlas) return
  k.loadSprite(SPRITE, atlas.canvas, { singular: true, filter: 'linear' })
  atlasFor.set(k, Object.fromEntries(Object.entries(atlas.parts).map(([name, part]) => [name, withAnchor(k, part)])))
}

/**
 * The hand's measures, taken from the art (world px): `palm` from the
 * wrist to where the fingers leave the palm; `finger`, a finger's length
 * from there to its claw's tip; `depth`, how far past the palm's front the
 * fingers reach along the hand at a curl — how deep they sit in the soil
 * once the palm's front lies on its surface (never more than `finger`).
 * @param {number} curl - The gripping curl
 * @returns {{palm: number, finger: number, depth: number}}
 */
export function handMeasures(curl) {
  rigs ??= FINGERS.map(fingerRig)
  const mid = rigs[Math.floor(rigs.length * HALF)]
  const root = mid.points.find(p => p.knee > 0) ?? mid.points[0]
  const palm = root.x - WRIST.x
  const last = mid.points[mid.points.length - 1]
  const depth = Math.max(...rigs.map((rig, i) => curledReach(rig, FINGERS[i], curl))) - palm
  return { palm: palm * ARM_SCALE, finger: (last.s - root.s) * ARM_SCALE, depth: Math.min(depth, last.s - root.s) * ARM_SCALE }
}

/**
 * Lays a limb's curve through its chain's drawn points (arm.nx, arm.ny):
 * a Catmull-Rom spline, `subdivide` pieces per chain piece; its points
 * and their length from the shoulder.
 * @param {Object} arm - Limb (its drawn chain points and spine)
 */
export function layArm(arm) {
  const xs = arm.nx
  const ys = arm.ny
  const last = xs.length - 1
  let len = 0
  for (let i = 0; i < SPINE_POINTS; i++) {
    const at = Math.min(last - 1, Math.floor(i / A.subdivide))
    const t = i / A.subdivide - at
    const a = Math.max(0, at - 1)
    const d = Math.min(last, at + 2)
    const p = arm.spine[i]
    p.x = catmull(xs[a], xs[at], xs[at + 1], xs[d], t)
    p.y = catmull(ys[a], ys[at], ys[at + 1], ys[d], t)
    if (i) {
      const dx = p.x - arm.spine[i - 1].x
      const dy = p.y - arm.spine[i - 1].y
      len += Math.sqrt(dx * dx + dy * dy)
    }
    p.s = len
  }
  arm.len = len
}

/**
 * A new limb's curve points.
 * @returns {Array<{x: number, y: number, s: number}>}
 */
export function newSpine() {
  return Array.from({ length: SPINE_POINTS }, () => ({ x: 0, y: 0, s: 0 }))
}

/**
 * Draws an arm: one strip along its curve, its scales tiled along it from
 * the wrist back (each tile split off where it ends, so the texture never
 * wraps inside a quad).
 * @param {Object} inst - Climber instance
 * @param {Object} arm - Arm
 */
export function drawArm(inst, arm) {
  const parts = atlasFor.get(inst.k)
  const frame = inst.k.getSprite(SPRITE)?.data?.frames?.[0]
  if (!parts || !frame) return
  const tile = TILE.w * ARM_SCALE
  const spine = arm.spine
  arm.pts.length = 0
  arm.uv.length = 0
  const strip = inst.strip
  strip.arm = arm
  strip.q = frame.q
  strip.band = parts.band.quad
  const end = SPINE_POINTS - 1
  for (let i = 0; i <= end; i++) {
    const p = spine[i]
    const a = spine[Math.max(0, i - 1)]
    const b = spine[Math.min(end, i + 1)]
    const tl = vecLen(b.x - a.x, b.y - a.y) || 1
    const half = HALF_W * arm.swell * (A.taper[0] + (A.taper[1] - A.taper[0]) * (p.s / (arm.len || 1)))
    const nx = (b.y - a.y) / tl * half
    const ny = -(b.x - a.x) / tl * half
    const back = arm.len - p.s
    const cell = Math.floor(back / tile)
    if (i > 0) {
      const prev = arm.len - spine[i - 1].s
      const edge = Math.floor(prev / tile)
      edge !== cell && pushEdge(inst, spine[i - 1], p, nx, ny, edge * tile, prev, back)
    }
    pushPair(inst, p.x, p.y, nx, ny, back / tile - cell)
  }
  inst.k.drawPolygon({ pts: arm.pts, uv: arm.uv, indices: stripIndices(arm.pts.length), tex: frame.tex, color: inst.color })
}

/**
 * Draws a hand at its wrist, pointing its way: the fingers (each one
 * strip, bent smoothly by the curl) under the palm.
 * @param {Object} inst - Climber instance
 * @param {Object} arm - Arm
 */
export function drawHand(inst, arm) {
  const parts = atlasFor.get(inst.k)
  const frame = inst.k.getSprite(SPRITE)?.data?.frames?.[0]
  if (!parts || !frame) return
  for (let i = 0; i < FINGERS.length; i++) drawFinger(inst, arm, i, parts[`finger${i}`], frame)
  drawPart(inst, parts.palm, arm.d.wx, arm.d.wy, Math.atan2(arm.d.ay, arm.d.ax), false, 1)
}

/**
 * Draws the head over the limbs' roots (its drawn pose: inst.pose): as
 * wide as it faces sideways (pose.face -1 left … 1 right, narrowing as it
 * turns round), its jaw opened by the mouth's share.
 * @param {Object} inst - Climber instance
 */
export function drawHead(inst) {
  const parts = atlasFor.get(inst.k)
  if (!parts) return
  const p = inst.pose
  const mirrored = p.face > 0
  const wide = Math.max(MIN_FACE, Math.abs(p.face))
  drawPart(inst, parts.head, p.x, p.y, p.tilt, mirrored, wide)
  const hx = (HINGE.x - HEAD.pivot.x) * HEAD_SCALE * wide * (mirrored ? -1 : 1)
  const hy = (HINGE.y - HEAD.pivot.y) * HEAD_SCALE
  const c = Math.cos(p.tilt)
  const s = Math.sin(p.tilt)
  drawPart(inst, parts.jaw, p.x + hx * c - hy * s, p.y + hx * s + hy * c, p.tilt + p.jaw * (mirrored ? 1 : -1), mirrored, wide)
}

/**
 * Draws, in the holds colour, the stretches of the platforms' outline its
 * claws may hold that are in view (the nav's polylines; their vectors
 * made once per live k).
 * @param {Object} inst - Climber instance
 * @param {{left: number, right: number, top: number, bottom: number}} view - Visible world rect
 */
export function drawHolds(inst, view) {
  const k = inst.k
  const lines = inst.nav.lines
  holdLinesFor.has(k) || holdLinesFor.set(k, lines.map(line => line.pts.map(pt => k.vec2(pt.x, pt.y))))
  const vecs = holdLinesFor.get(k)
  const color = getRGB(k, C.holds)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.x2 < view.left || line.x1 > view.right || line.y2 < view.top || line.y1 > view.bottom) continue
    k.drawLines({ pts: vecs[i], width: HOLDS_W, color })
  }
}

/**
 * Draws its workings (debug only): the planned way, the body with its
 * tilt and the tilt it turns to, each limb's chain (its points coloured
 * by its state) and shoulder, the holds with their normals and how deep
 * the claws sit, the hold a hand reaches for, the last plan's candidate
 * holds, the last sound heard, its mood, support and timings.
 * @param {Object} inst - Climber instance
 */
export function drawDebug(inst) {
  const k = inst.k
  for (let i = 1; i < inst.path.length; i++) {
    k.drawLine({ p1: k.vec2(inst.path[i - 1].ox, inst.path[i - 1].oy), p2: k.vec2(inst.path[i].ox, inst.path[i].oy), width: DEBUG_LINE, color: debugColor(k, 'path') })
  }
  for (let i = 0; i < inst.candCount; i++) k.drawCircle({ pos: k.vec2(inst.cand[i].x, inst.cand[i].y), radius: DEBUG_DOT * HALF, color: debugColor(k, 'candidate') })
  inst.arms.forEach(arm => drawDebugArm(inst, arm))
  const b = inst.pose
  k.drawCircle({ pos: k.vec2(b.x, b.y), radius: DEBUG_DOT, color: debugColor(k, 'body') })
  drawDebugRay(k, b.x, b.y, b.tilt, 'body')
  drawDebugRay(k, b.x, b.y, inst.tiltWant, 'want')
  inst.heard.at > 0 && k.drawCircle({ pos: k.vec2(inst.heard.x, inst.heard.y), radius: DEBUG_DOT * 2, color: debugColor(k, 'sound') })
  const st = inst.stats
  const lines = [
    `${inst.mood} ${inst.frame.mode}${inst.frame.walk ? ' walk' : ''} ${inst.layer} holds ${inst.anchored} face ${inst.face.toFixed(2)}`,
    `update ${st.update.toFixed(3)} ms  limbs ${st.limbs.toFixed(3)} ms  plan ${st.plan.toFixed(3)} ms  draw ${st.draw.toFixed(3)} ms`,
    `way ${st.way.toFixed(3)} ms  queries ${st.queries}  candidates ${st.candidates}  heard ${st.heard}`
  ]
  lines.forEach((text, i) => k.drawText({ text, pos: k.vec2(b.x, b.y + DEBUG_TEXT_DY + i * DEBUG_LINE_H), size: DEBUG_TEXT, anchor: 'center', color: debugColor(k, 'body') }))
}
function drawDebugArm(inst, arm) {
  const k = inst.k
  const tint = debugColor(k, DEBUG_STATE_COLOR[arm.state] ?? 'free')
  for (let j = 0; j < arm.nx.length; j++) k.drawCircle({ pos: k.vec2(arm.nx[j], arm.ny[j]), radius: j ? DEBUG_DOT * HALF : DEBUG_DOT, color: tint })
  const h = arm.state === 'anchor' ? arm.hold : arm.state === 'reach' ? arm.to : null
  if (!h) return
  k.drawCircle({ pos: k.vec2(h.gx, h.gy), radius: DEBUG_DOT, color: tint })
  k.drawLine({ p1: k.vec2(h.gx, h.gy), p2: k.vec2(h.gx + h.nx * DEBUG_NORMAL, h.gy + h.ny * DEBUG_NORMAL), width: DEBUG_LINE, color: debugColor(k, 'normal') })
  k.drawLine({ p1: k.vec2(h.gx, h.gy), p2: k.vec2(h.gx + h.ax * inst.hand.depth, h.gy + h.ay * inst.hand.depth), width: DEBUG_LINE * 2, color: debugColor(k, 'depth') })
}
function drawDebugRay(k, x, y, angle, name) {
  k.drawLine({ p1: k.vec2(x, y), p2: k.vec2(x + Math.cos(angle) * DEBUG_NORMAL, y + Math.sin(angle) * DEBUG_NORMAL), width: DEBUG_LINE, color: debugColor(k, name) })
}
function debugColor(k, name) {
  return getRGB(k, DEBUG_COLORS[name])
}
//
// A pair of the strip's vertices across the limb at a point, (nx, ny)
// each side of it (its texture `u` of the way along a tile); the vectors
// are the limb's own, reused.
//
function pushPair(inst, x, y, nx, ny, u) {
  const { arm, q, band } = inst.strip
  const i = arm.pts.length
  arm.pool[i] ??= inst.k.vec2(0, 0)
  arm.pool[i + 1] ??= inst.k.vec2(0, 0)
  arm.uvPool[i] ??= inst.k.vec2(0, 0)
  arm.uvPool[i + 1] ??= inst.k.vec2(0, 0)
  arm.pts.push(arm.pool[i].set(x + nx, y + ny), arm.pool[i + 1].set(x - nx, y - ny))
  const share = Math.max(TILE_INSET, Math.min(1 - TILE_INSET, u))
  const ux = q.x + (band.x + (1 - share) * band.w) * q.w
  arm.uv.push(arm.uvPool[i].set(ux, q.y + band.y * q.h), arm.uvPool[i + 1].set(ux, q.y + (band.y + band.h) * q.h))
}
//
// Where a tile ends between two points: the end of one tile and the start
// of the next at the same place.
//
function pushEdge(inst, a, b, nx, ny, edgeBack, backA, backB) {
  const u = (edgeBack - backA) / ((backB - backA) || 1)
  const x = a.x + (b.x - a.x) * u
  const y = a.y + (b.y - a.y) * u
  pushPair(inst, x, y, nx, ny, 0)
  pushPair(inst, x, y, nx, ny, 1)
}
//
// The strip's triangles for a count of vertices (kept per count: a strip
// has the same few counts every frame).
//
function stripIndices(count) {
  const cached = indicesFor.get(count)
  if (cached) return cached
  const out = []
  for (let i = 0; i + 3 < count; i += 2) out.push(i, i + 1, i + 2, i + 1, i + 3, i + 2)
  indicesFor.set(count, out)
  return out
}
//
// A finger with its claw: its spine laid out again from its root, each
// piece turned by the bend there (the mean of its ends' bends), the strip
// across it turned with it; then from the hand's frame (sheet px from the
// wrist) into the world.
//
function drawFinger(inst, arm, i, part, frame) {
  const k = inst.k
  const spec = FINGERS[i]
  const rig = rigs[i]
  const q = frame.q
  arm.fingers[i] ??= { pts: [], uv: [] }
  const out = arm.fingers[i]
  let x = rig.points[0].x - WRIST.x
  let y = rig.points[0].y - WRIST.y
  let before = 0
  for (let j = 0; j < rig.points.length; j++) {
    const p = rig.points[j]
    const bend = arm.curl * (spec.turn * p.knee + spec.hook * p.hook)
    if (j) {
      const mid = (bend + before) * HALF
      const dx = p.x - rig.points[j - 1].x
      const dy = p.y - rig.points[j - 1].y
      x += dx * Math.cos(mid) - dy * Math.sin(mid)
      y += dx * Math.sin(mid) + dy * Math.cos(mid)
    }
    before = bend
    const nx = (p.nx * Math.cos(bend) - p.ny * Math.sin(bend)) * p.w
    const ny = (p.nx * Math.sin(bend) + p.ny * Math.cos(bend)) * p.w
    const at = j * 2
    out.pts[at] = toWorld(arm, x + nx, y + ny, out.pts[at] ?? k.vec2(0, 0))
    out.pts[at + 1] = toWorld(arm, x - nx, y - ny, out.pts[at + 1] ?? k.vec2(0, 0))
    out.uv[at] = (out.uv[at] ?? k.vec2(0, 0)).set(q.x + (part.quad.x + p.u1 * part.quad.w) * q.w, q.y + (part.quad.y + p.v1 * part.quad.h) * q.h)
    out.uv[at + 1] = (out.uv[at + 1] ?? k.vec2(0, 0)).set(q.x + (part.quad.x + p.u2 * part.quad.w) * q.w, q.y + (part.quad.y + p.v2 * part.quad.h) * q.h)
  }
  k.drawPolygon({ pts: out.pts, uv: out.uv, indices: stripIndices(out.pts.length), tex: frame.tex, color: inst.color })
}
//
// A point of the hand's frame (sheet px from the wrist) in the world.
//
function toWorld(arm, lx, ly, v) {
  const d = arm.d
  return v.set(d.wx + (lx * d.ax - ly * d.ay) * ARM_SCALE, d.wy + (lx * d.ay + ly * d.ax) * ARM_SCALE)
}
//
// One piece of the atlas at a world point (its pivot there), turned (rad),
// maybe mirrored, `wide` of its width.
//
function drawPart(inst, part, x, y, angle, mirrored, wide) {
  inst.k.drawSprite({
    sprite: SPRITE,
    quad: part.quad,
    width: part.w * wide,
    height: part.h,
    pos: inst.v.set(x, y),
    anchor: mirrored ? part.anchorMirrored : part.anchor,
    angle: angle * DEG,
    flipX: mirrored,
    color: inst.color
  })
}
function withAnchor(k, part) {
  const ax = part.pivot.x / part.sw * 2 - 1
  const ay = part.pivot.y / part.sh * 2 - 1
  return { ...part, anchor: k.vec2(ax, ay), anchorMirrored: k.vec2(-ax, ay) }
}
//
// The atlas: the pieces baked at BAKE_OVER times their drawn size (the
// head without its jaw and the jaw, the arm's scales as one seamless
// tile, the hand cut apart), grained; per piece its quad, drawn size and
// pivot.
//
function buildAtlas() {
  const head = Atlas.piece(HEAD.piece)
  const arm = Atlas.piece(ARM_PIECE)
  if (!head || !arm) return null
  const origin = { x: 0, y: 0 }
  const items = [
    { name: 'head', src: headWithoutJaw(head), pivot: HEAD.pivot, scale: HEAD_SCALE },
    cutOut('jaw', head, origin, [JAW], boxOf(JAW), HINGE, HEAD_SCALE),
    { name: 'band', src: armTile(arm), pivot: origin, scale: ARM_SCALE },
    cutOut('palm', arm, ARM_AT, [PALM.poly], boxOf(PALM.poly), PALM.pivot, ARM_SCALE)
  ]
  rigs ??= FINGERS.map(fingerRig)
  FINGERS.forEach((spec, i) => items.push(cutOut(`finger${i}`, arm, ARM_AT, spec.cuts, rigs[i].box, WRIST, ARM_SCALE)))
  const sizes = items.map(it => ({ w: Math.ceil(it.src.width * it.scale * BAKE_OVER), h: Math.ceil(it.src.height * it.scale * BAKE_OVER) }))
  const w = Math.max(...sizes.map(size => size.w)) + ATLAS_GAP * 2
  const h = sizes.reduce((sum, size) => sum + size.h + ATLAS_GAP, ATLAS_GAP)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  const parts = {}
  let y = ATLAS_GAP
  items.forEach((it, i) => {
    const size = sizes[i]
    ctx.drawImage(it.src, ATLAS_GAP, y, size.w, size.h)
    parts[it.name] = { quad: { x: ATLAS_GAP / w, y: y / h, w: size.w / w, h: size.h / h }, w: it.src.width * it.scale, h: it.src.height * it.scale, sw: it.src.width, sh: it.src.height, pivot: it.pivot }
    y += size.h + ATLAS_GAP
  })
  applyForestFilmGrainToCanvas(canvas, GRAIN_SEED)
  return { canvas, parts }
}
//
// The head with its lower jaw taken out and the throat painted where the
// mouth opens (the jaw is drawn over it, turned).
//
function headWithoutJaw(head) {
  const canvas = document.createElement('canvas')
  canvas.width = head.width
  canvas.height = head.height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(head, 0, 0)
  ctx.globalCompositeOperation = 'destination-out'
  fillPoly(ctx, JAW, 0, 0)
  ctx.globalCompositeOperation = 'source-over'
  ctx.fillStyle = C.mouth
  fillPoly(ctx, CAVITY, 0, 0)
  return canvas
}
//
// A piece cut out of a source canvas (its top left at `at`, in the
// outlines' px) by its outlines together, on a canvas the size of its box;
// its pivot in that canvas.
//
function cutOut(name, src, at, polys, box, pivot, scale) {
  const canvas = document.createElement('canvas')
  canvas.width = box.w
  canvas.height = box.h
  const ctx = canvas.getContext('2d')
  polys.forEach(poly => fillPoly(ctx, poly, box.x, box.y))
  ctx.globalCompositeOperation = 'source-in'
  ctx.drawImage(src, at.x - box.x, at.y - box.y)
  return { name, src: canvas, pivot: { x: pivot.x - box.x, y: pivot.y - box.y }, scale }
}
function fillPoly(ctx, poly, ox, oy) {
  ctx.beginPath()
  poly.forEach(([x, y]) => ctx.lineTo(x - ox, y - oy))
  ctx.closePath()
  ctx.fill()
}
//
// The box (whole px) round some points.
//
function boxOf(points) {
  const xs = points.map(pt => pt[0])
  const ys = points.map(pt => pt[1])
  const x = Math.floor(Math.min(...xs))
  const y = Math.floor(Math.min(...ys))
  return { x, y, w: Math.ceil(Math.max(...xs)) - x, h: Math.ceil(Math.max(...ys)) - y }
}
//
// A finger's strip at rest (sheet px), once per page: its spine smoothed
// (Catmull-Rom, FINGER_SUBS pieces per span), at each point its width, the
// normal across it, how far along the knuckle's bend (from where the spine
// leaves the palm) and the claw's (round its joint) have got, and where
// its two edge vertices sit in its box (0 … 1) — the box round them all.
//
function fingerRig(spec) {
  const sp = spec.spine
  const points = []
  for (let j = 0; j < sp.length - 1; j++) {
    for (let n = 0; n < FINGER_SUBS; n++) {
      const t = n / FINGER_SUBS
      const at = catmullRom(sp[Math.max(0, j - 1)], sp[j], sp[j + 1], sp[Math.min(sp.length - 1, j + 2)], t)
      points.push({ x: at[0], y: at[1], w: spec.widths[j] + (spec.widths[j + 1] - spec.widths[j]) * t })
    }
  }
  const last = sp[sp.length - 1]
  points.push({ x: last[0], y: last[1], w: spec.widths[spec.widths.length - 1] })
  let s = 0
  points.forEach((p, j) => {
    const a = points[Math.max(0, j - 1)]
    const b = points[Math.min(points.length - 1, j + 1)]
    const len = vecLen(b.x - a.x, b.y - a.y) || 1
    p.nx = (b.y - a.y) / len
    p.ny = -(b.x - a.x) / len
    j && (s += vecLen(p.x - a.x, p.y - a.y))
    p.s = s
  })
  const inPalm = points.findLastIndex(p => isInPoly(PALM.poly, p.x, p.y))
  const exitS = points[Math.min(points.length - 1, inPalm + 1)].s
  const jointS = points.reduce((a, b) => (vecLen(b.x - spec.joint.x, b.y - spec.joint.y) < vecLen(a.x - spec.joint.x, a.y - spec.joint.y) ? b : a)).s
  const edges = points.flatMap(p => [[p.x + p.nx * p.w, p.y + p.ny * p.w], [p.x - p.nx * p.w, p.y - p.ny * p.w]])
  const box = boxOf(edges)
  points.forEach((p, j) => {
    p.knee = smoothStep((p.s - exitS) / KNUCKLE_BEND)
    p.hook = smoothStep((p.s - jointS) / JOINT_BEND + HALF)
    p.u1 = (edges[j * 2][0] - box.x) / box.w
    p.v1 = (edges[j * 2][1] - box.y) / box.h
    p.u2 = (edges[j * 2 + 1][0] - box.x) / box.w
    p.v2 = (edges[j * 2 + 1][1] - box.y) / box.h
  })
  return { points, box }
}
function catmullRom(p0, p1, p2, p3, t) {
  return [0, 1].map(i => HALF * (2 * p1[i] + (p2[i] - p0[i]) * t + (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * t * t + (3 * p1[i] - p0[i] - 3 * p2[i] + p3[i]) * t * t * t))
}
//
// How far along the hand (sheet px from the wrist) a finger reaches at a
// curl: its spine laid out bent as it is drawn, its farthest point.
//
function curledReach(rig, spec, curl) {
  let x = rig.points[0].x - WRIST.x
  let far = x
  let before = 0
  for (let j = 1; j < rig.points.length; j++) {
    const p = rig.points[j]
    const bend = curl * (spec.turn * p.knee + spec.hook * p.hook)
    const mid = (bend + before) * HALF
    x += (p.x - rig.points[j - 1].x) * Math.cos(mid) - (p.y - rig.points[j - 1].y) * Math.sin(mid)
    before = bend
    far = Math.max(far, x)
  }
  return far
}
function catmull(p0, p1, p2, p3, t) {
  return HALF * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (3 * p1 - p0 - 3 * p2 + p3) * t * t * t)
}
function smoothStep(t) {
  const c = Math.max(0, Math.min(1, t))
  return c * c * (3 - 2 * c)
}
function isInPoly(poly, x, y) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    yi > y !== yj > y && x < (xj - xi) * (y - yi) / (yj - yi) + xi && (inside = !inside)
  }
  return inside
}
//
// The arm's scales as a tile that repeats along it without a seam: TILE
// of the arm piece, its last TILE_BLEND columns faded into the columns
// just before its first (so its end runs on into its start).
//
function armTile(arm) {
  const canvas = document.createElement('canvas')
  canvas.width = TILE.w
  canvas.height = TILE.h
  const ctx = canvas.getContext('2d')
  ctx.drawImage(arm, TILE.x, TILE.y, TILE.w, TILE.h, 0, 0, TILE.w, TILE.h)
  const over = document.createElement('canvas')
  over.width = TILE_BLEND
  over.height = TILE.h
  const octx = over.getContext('2d')
  octx.drawImage(arm, TILE.x - TILE_BLEND, TILE.y, TILE_BLEND, TILE.h, 0, 0, TILE_BLEND, TILE.h)
  const fade = octx.createLinearGradient(0, 0, TILE_BLEND, 0)
  fade.addColorStop(0, hexAlpha(C.tint, 0))
  fade.addColorStop(1, C.tint)
  octx.globalCompositeOperation = 'destination-in'
  octx.fillStyle = fade
  octx.fillRect(0, 0, TILE_BLEND, TILE.h)
  ctx.drawImage(over, TILE.w - TILE_BLEND, 0)
  return canvas
}
function hexAlpha(hex, alpha) {
  return hex + Math.round(alpha * BYTE_MAX).toString(HEX_RADIX).padStart(2, '0')
}
