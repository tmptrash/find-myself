import { getRGB, vecLen } from '../../../utils/helper.js'
import { applyForestFilmGrainToCanvas } from '../../forest/utils/forest-parallax-grain.js'
import { CAVE_CFG } from '../cfg.js'
import * as Atlas from '../utils/cave-atlas.js'
//
// How the climber (cave-haggy.js) looks: one baked atlas (per page, loaded
// once per live k) of its head (the lower jaw cut off to open and shut),
// the scales of its limbs as a tile, a button, its palm and its three fingers (each
// finger with its claw one strip that bends). Every frame: each limb is
// one textured strip along a smooth curve through its chain's points (no
// joints: it bends all along), thick at the head and tapering to the
// wrist, with its buttons riding its skin; each hand a palm over three
// bent finger strips; the head over
// the limbs' roots — turning round, its face-on picture comes in over the
// side it had, then the other side's over that, each narrowing a little
// toward the turn's middle — its jaw turned about the mouth's corner
// (face on: let down); its ultrasound's waves and echoes as faint thin
// arcs.
// No game objects, no masks, no textures made at run time; the vectors
// are the creature's own, reused.
//
const SPRITE = 'cave0-haggy-v6'
const GRAIN_SEED = 9710
const C = CAVE_CFG.haggy
const A = C.anatomy
const SONAR = C.sense.ultrasound
const GIRTH = C.limb.girth
//
// Sizes: world px per sheet px of the head and of the arm (with its hand);
// the atlas is baked BAKE_OVER times finer, its pieces ATLAS_GAP px apart.
//
const HEAD_SCALE = 0.147
const ARM_SCALE = 0.093
const BAKE_OVER = 2.5
const ATLAS_GAP = 4
//
// The pieces (Atlas): the head by its middle and the tip of its upper jaw
// (head piece px); its lower jaw turning about the mouth's back corner
// (HINGE), the throat seen
// when it opens (CAVITY, painted in the mouth colour on the head under
// the jaw); the arm piece's place on the sheet (the hand's cuts below
// are in sheet px); the arm's scales: a stretch of its tube (TILE, in the
// arm piece) made into a tile that repeats along the arm, its last
// TILE_BLEND columns faded into the columns before its first.
//
const HEAD = { piece: 'haggyHead', pivot: { x: 274, y: 220 } }
//
// The head face on (its own piece, its px): by its middle (level with the
// side's, as far down from the top of its dome), its lower jaw — the lip
// with its teeth — let down JAW_REACH px per rad the side's jaw turns
// (the side's jaw is about that long from its hinge), the throat seen as
// it opens (FRONT_JAW, painted in the mouth colour under it).
//
const FRONT = { piece: 'haggyFront', pivot: { x: 247, y: 206 } }
const FRONT_JAW = [[129, 261], [155, 277], [163, 298], [195, 304], [245, 307], [295, 306], [335, 302], [360, 293], [371, 275], [389, 261], [395, 285], [385, 317], [363, 348], [335, 367], [295, 380], [245, 385], [193, 377], [161, 360], [137, 337], [125, 300]]
const JAW_REACH = 240
const UPPER_JAW_TIP = { x: 12, y: 279 }
const JAW = [[42, 310], [143, 303], [229, 299], [278, 292], [286, 317], [269, 347], [238, 374], [196, 397], [124, 400], [67, 391], [44, 368], [36, 336]]
const HINGE = { x: 278, y: 294 }
const CAVITY = [[48, 311], [143, 303], [229, 299], [278, 292], [284, 315], [229, 334], [143, 345], [56, 355]]
const ARM_PIECE = 'haggyArm'
const BUTTON_PIECE = 'haggyButton'
const ARM_AT = { x: 229, y: 418 }
const TILE = { x: 101, y: 164, w: 946, h: 131 }
const TILE_BLEND = 64
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
const WRIST = { x: 1341, y: 647 }
const PALM = { poly: [[1308, 580], [1405, 577], [1472, 549], [1515, 582], [1506, 618], [1515, 666], [1502, 691], [1519, 732], [1472, 756], [1405, 739], [1308, 741]], pivot: WRIST }
const FINGERS = [
  {
    cuts: [
      [[1439, 618], [1463, 558], [1523, 478], [1564, 448], [1590, 461], [1596, 496], [1577, 517], [1525, 610], [1489, 640]],
      [[1547, 457], [1566, 438], [1631, 425], [1665, 450], [1663, 466], [1620, 469], [1601, 498], [1573, 502], [1551, 483]]
    ],
    spine: [[1437, 644], [1486, 596], [1534, 515], [1577, 468], [1620, 448], [1672, 463]],
    widths: [52, 52, 49, 43, 37, 32],
    joint: { x: 1575, y: 474 },
    turn: 0.55,
    hook: 0.75
  },
  {
    cuts: [
      [[1464, 620], [1502, 612], [1631, 599], [1654, 610], [1659, 666], [1637, 678], [1502, 685], [1464, 678]],
      [[1637, 616], [1659, 605], [1697, 616], [1732, 655], [1736, 681], [1719, 678], [1685, 668], [1654, 674], [1637, 659]]
    ],
    spine: [[1448, 648], [1502, 647], [1588, 646], [1650, 644], [1695, 650], [1740, 689]],
    widths: [52, 52, 49, 47, 43, 32],
    joint: { x: 1650, y: 640 },
    turn: 0,
    hook: 0.55
  },
  {
    cuts: [
      [[1446, 691], [1493, 663], [1525, 708], [1575, 777], [1581, 807], [1558, 835], [1534, 829], [1478, 754], [1442, 732]],
      [[1530, 807], [1556, 788], [1581, 799], [1622, 827], [1644, 844], [1637, 855], [1588, 863], [1549, 850], [1530, 831]]
    ],
    spine: [[1448, 687], [1480, 730], [1523, 778], [1556, 814], [1593, 838], [1648, 855]],
    widths: [52, 52, 47, 43, 39, 32],
    joint: { x: 1556, y: 820 },
    turn: -0.55,
    hook: -0.75
  }
]
const FINGER_SUBS = 4
//
// The buttons on the limbs' skin: world px per sheet px; each sits up to
// BUTTON_SIDE of the limb's half width off its middle and is drawn out
// with the limb — its length times the limb's own over BUTTON_REST of a
// full one, within BUTTON_LONG.
//
const BUTTON_SCALE = 0.07
const BUTTON_SIDE = 0.45
const BUTTON_REST = 0.6
const BUTTON_LONG = [0.75, 1.3]
const KNUCKLE_BEND = 43
const JOINT_BEND = 39
//
// A limb's curve: a Catmull-Rom spline through its chain's points,
// `subdivide` pieces per chain piece; its strip is HALF_W px wide each
// side at the art's width (times the anatomy's thickness and taper).
//
const SPINE_POINTS = A.segments * A.subdivide + 1
const HALF_W = TILE.h * ARM_SCALE * 0.5 * A.thickness
//
// The head turning round (0: the side it had, 1: the side it turns to):
// its face-on picture comes in over the old side from FRONT_IN[0] to
// FRONT_IN[1] of the turn, the new side over the face from FRONT_OUT[0]
// to FRONT_OUT[1] (what is under stays whole till then: never
// see-through, never a flat line). Each is drawn at its full size: the
// head never shrinks.
//
const FRONT_IN = [0.26, 0.42]
const FRONT_OUT = [0.58, 0.74]
//
// Ultrasound's look: a wave is drawn as WAVE_ARCS short chords per ray
// gap across its cone wherever both rays about it are still out, fading
// toward its full distance; an echo as a short arc ECHO_SPAN rad wide (ECHO_ARCS chords),
// ECHO_R px round its point at the start and shrinking as it flies home.
//
const WAVE_ARCS = 3
const ECHO_SPAN = 0.5
const ECHO_ARCS = 3
const ECHO_R = 26
const HALF = 0.5
const DEG = 180 / Math.PI
const BYTE_MAX = 255
const HEX_RADIX = 16
const atlasFor = new WeakMap()
const indicesFor = new Map()
let atlas = null
let rigs = null

/**
 * The tip of its upper jaw from the head's middle (world px): `x` ahead
 * the way it faces, `y` down. Where its ultrasound leaves.
 */
export const JAW_TIP = { x: (HEAD.pivot.x - UPPER_JAW_TIP.x) * HEAD_SCALE, y: (UPPER_JAW_TIP.y - HEAD.pivot.y) * HEAD_SCALE }

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
 * Measures a limb's curve again after its points were moved: their length
 * from the shoulder.
 * @param {Object} arm - Limb (its spine)
 */
export function measureArm(arm) {
  let len = 0
  for (let i = 1; i < SPINE_POINTS; i++) {
    len += vecLen(arm.spine[i].x - arm.spine[i - 1].x, arm.spine[i].y - arm.spine[i - 1].y)
    arm.spine[i].s = len
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
    const half = halfWidth(arm, p.s / (arm.len || 1))
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
  drawPart(inst, parts.palm, arm.d.wx, arm.d.wy, Math.atan2(arm.d.ay, arm.d.ax), false, 1, 1)
}

/**
 * Draws the head over the limbs' roots (its drawn pose: inst.pose), its
 * jaw opened by the mouth's share. Facing a side (pose.face -1 left … 1
 * right) it is drawn whole; turning round (to pose.want) its face-on
 * picture comes in over the side it had, then the new side over the face,
 * each narrowing a little toward the turn's middle.
 * @param {Object} inst - Climber instance
 */
export function drawHead(inst) {
  const parts = atlasFor.get(inst.k)
  if (!parts) return
  const p = inst.pose
  const turn = (p.face * p.want + 1) * HALF
  const front = phase(turn, FRONT_IN)
  const back = phase(turn, FRONT_OUT)
  front < 1 && drawHeadSide(inst, parts, p.want < 0, 1)
  front > 0 && back < 1 && drawHeadFront(inst, parts, front)
  back > 0 && drawHeadSide(inst, parts, p.want > 0, back)
}

/**
 * Draws its ultrasound: each wave in the air as a faint thin arc across
 * the cone it was sent in (the way the head faced then), cut where soil
 * or water ended its rays, fading out toward its full distance (where it
 * is gone); each echo as a small arc flying home from the point that sent
 * it.
 * @param {Object} inst - Climber instance
 */
export function drawWaves(inst) {
  const k = inst.k
  const sonar = inst.sonar
  const color = getRGB(k, C.wave)
  for (let i = 0; i < sonar.pulses.length; i++) sonar.pulses[i].live && drawWave(inst, sonar.pulses[i], color)
  for (let i = 0; i < sonar.echoes.length; i++) sonar.echoes[i].live && drawEcho(inst, sonar.echoes[i], color)
}

/**
 * Draws a limb's buttons on its skin: each at its share of the limb's
 * length (so they move apart as it stretches), off its middle to its
 * side, turned along it, drawn out with it and thicker as it swells.
 * @param {Object} inst - Climber instance
 * @param {Object} arm - Limb (its curve laid and measured, its buttons)
 */
export function drawButtons(inst, arm) {
  const part = atlasFor.get(inst.k)?.button
  if (!part) return
  const spine = arm.spine
  const long = Math.max(BUTTON_LONG[0], Math.min(BUTTON_LONG[1], arm.len / (A.length * BUTTON_REST)))
  for (let n = 0; n < arm.buttons.length; n++) {
    const b = arm.buttons[n]
    const at = b.u * arm.len
    let i = 1
    while (i < SPINE_POINTS - 1 && spine[i].s < at) i++
    const p = spine[i - 1]
    const q = spine[i]
    const span = q.s - p.s || 1
    const t = (at - p.s) / span
    const tx = (q.x - p.x) / span
    const ty = (q.y - p.y) / span
    const off = b.side * BUTTON_SIDE * halfWidth(arm, b.u)
    drawPart(inst, part, p.x + (q.x - p.x) * t - ty * off, p.y + (q.y - p.y) * t + tx * off, Math.atan2(ty, tx), false, long, 1, arm.swell)
  }
}

//
// A limb's half width `u` of the way along it (0 the shoulder, 1 the
// wrist): the art's, tapered, times how thick its flesh is now
// (arm.swell: thinner drawn out, thicker drawn in) — toward the wrist
// only girth.wrist of that change, so it always fits the hand.
//
function halfWidth(arm, u) {
  const girth = 1 + (arm.swell - 1) * (1 - (1 - GIRTH.wrist) * u)
  return HALF_W * girth * (A.taper[0] + (A.taper[1] - A.taper[0]) * u)
}
//
// One side's picture of the head (mirrored or not), with its jaw.
//
function drawHeadSide(inst, parts, mirrored, opacity) {
  const p = inst.pose
  drawPart(inst, parts.head, p.x, p.y, p.tilt, mirrored, 1, opacity)
  const hx = (HINGE.x - HEAD.pivot.x) * HEAD_SCALE * (mirrored ? -1 : 1)
  const hy = (HINGE.y - HEAD.pivot.y) * HEAD_SCALE
  const c = Math.cos(p.tilt)
  const s = Math.sin(p.tilt)
  drawPart(inst, parts.jaw, p.x + hx * c - hy * s, p.y + hx * s + hy * c, p.tilt + p.jaw * (mirrored ? 1 : -1), mirrored, 1, opacity)
}
//
// The face-on head: its jaw let down by the side's jaw angle.
//
function drawHeadFront(inst, parts, opacity) {
  const p = inst.pose
  const drop = p.jaw * JAW_REACH * HEAD_SCALE
  drawPart(inst, parts.front, p.x, p.y, p.tilt, false, 1, opacity)
  drawPart(inst, parts.frontJaw, p.x - Math.sin(p.tilt) * drop, p.y + Math.cos(p.tilt) * drop, p.tilt, false, 1, opacity)
}
//
// How far on (0 … 1) a turn is through one of its stretches [from, to].
//
function phase(turn, span) {
  return Math.max(0, Math.min(1, (turn - span[0]) / (span[1] - span[0])))
}
//
// A wave: chords along its arc — only across the cone it was sent in —
// between every two neighbouring rays that are both still out.
//
function drawWave(inst, p, color) {
  const k = inst.k
  const opacity = SONAR.waveOpacity * (1 - p.r / SONAR.maxDistance)
  const gap = SONAR.coneAngle / (SONAR.rays - 1)
  const step = gap / WAVE_ARCS
  for (let i = 0; i + 1 < SONAR.rays; i++) {
    if (p.ends[i] > 0 || p.ends[i + 1] > 0) continue
    const from = p.dir - SONAR.coneAngle * HALF + i * gap
    for (let n = 0; n < WAVE_ARCS; n++) {
      const a = from + n * step
      inst.v.set(p.x + Math.cos(a) * p.r, p.y + Math.sin(a) * p.r)
      inst.v2.set(p.x + Math.cos(a + step) * p.r, p.y + Math.sin(a + step) * p.r)
      k.drawLine({ p1: inst.v, p2: inst.v2, width: SONAR.waveWidth, color, opacity })
    }
  }
}
//
// An echo: a small arc facing the head, between the point that sent it
// and the head as far as it has flown, fainter the farther it came.
//
function drawEcho(inst, echo, color) {
  const k = inst.k
  const u = echo.t / echo.dur
  const x = echo.x + (inst.pose.x - echo.x) * u
  const y = echo.y + (inst.pose.y - echo.y) * u
  const home = Math.atan2(inst.pose.y - echo.y, inst.pose.x - echo.x)
  const r = ECHO_R * (1 - u * HALF)
  const cx = x - Math.cos(home) * r
  const cy = y - Math.sin(home) * r
  const opacity = SONAR.waveOpacity * (HALF + echo.confidence * HALF)
  const step = ECHO_SPAN / ECHO_ARCS
  for (let n = 0; n < ECHO_ARCS; n++) {
    const a = home - ECHO_SPAN * HALF + n * step
    inst.v.set(cx + Math.cos(a) * r, cy + Math.sin(a) * r)
    inst.v2.set(cx + Math.cos(a + step) * r, cy + Math.sin(a + step) * r)
    k.drawLine({ p1: inst.v, p2: inst.v2, width: SONAR.waveWidth, color, opacity })
  }
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
// maybe mirrored, `wide` of its width and `tall` of its height, as
// see-through as `opacity`.
//
function drawPart(inst, part, x, y, angle, mirrored, wide, opacity, tall = 1) {
  inst.k.drawSprite({
    sprite: SPRITE,
    quad: part.quad,
    opacity,
    width: part.w * wide,
    height: part.h * tall,
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
// head side on and face on, each without its jaw, and the jaws; the arm's scales as one seamless
// tile, the hand cut apart), grained; per piece its quad, drawn size and
// pivot.
//
function buildAtlas() {
  const head = Atlas.piece(HEAD.piece)
  const front = Atlas.piece(FRONT.piece)
  const arm = Atlas.piece(ARM_PIECE)
  const button = Atlas.piece(BUTTON_PIECE)
  if (!head || !front || !arm || !button) return null
  const origin = { x: 0, y: 0 }
  const items = [
    { name: 'head', src: withoutJaw(head, JAW, CAVITY), pivot: HEAD.pivot, scale: HEAD_SCALE },
    cutOut('jaw', head, origin, [JAW], boxOf(JAW), HINGE, HEAD_SCALE),
    { name: 'front', src: withoutJaw(front, FRONT_JAW, FRONT_JAW), pivot: FRONT.pivot, scale: HEAD_SCALE },
    cutOut('frontJaw', front, origin, [FRONT_JAW], boxOf(FRONT_JAW), FRONT.pivot, HEAD_SCALE),
    { name: 'band', src: armTile(arm), pivot: origin, scale: ARM_SCALE },
    cutOut('palm', arm, ARM_AT, [PALM.poly], boxOf(PALM.poly), PALM.pivot, ARM_SCALE),
    { name: 'button', src: button, pivot: { x: button.width * HALF, y: button.height * HALF }, scale: BUTTON_SCALE }
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
// A head picture with its lower jaw taken out and the throat painted where
// the mouth opens (the jaw is drawn over it, turned or let down).
//
function withoutJaw(head, jaw, cavity) {
  const canvas = document.createElement('canvas')
  canvas.width = head.width
  canvas.height = head.height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(head, 0, 0)
  ctx.globalCompositeOperation = 'destination-out'
  fillPoly(ctx, jaw, 0, 0)
  ctx.globalCompositeOperation = 'source-over'
  ctx.fillStyle = C.mouth
  fillPoly(ctx, cavity, 0, 0)
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
