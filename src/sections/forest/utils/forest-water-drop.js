import { forestRgb } from './forest-palette.js'
//
// The water flower's drop, drawn with Kaplay primitives only (no sprite):
// a soft, see-through light-turquoise teardrop — a round belly under a
// tapering top that ends in a point — with no outline, a gentle gradient
// from a pale top to a deeper turquoise belly (per-vertex colours across
// one fan) and a small white glint high on its left. The top points at the
// flower while it hangs and back up the way it came while it falls.
//
const OUTLINE_SEGMENTS = 36
//
// Shape of the top half: it narrows by TOP_PINCH of the radius as it rises
// (more as the tip grows), and the tip's length is pulled up with
// TIP_POW so the belly stays round and only the very top runs into a point.
//
const TOP_PINCH = 0.35
const TIP_POW = 3
//
// Gradient: the fan's centre sits CORE_X/CORE_Y (radius shares) up and to
// the left in the light colour; the rim runs from light at the top through
// the body colour to the deep colour under the belly.
//
const CORE_X = -0.22
const CORE_Y = -0.25
const BODY_AT = 0.45
//
// Glassy see-through water: the core lets most of what is behind show
// through, the rim is denser (a light edge round a clear middle).
//
const CORE_OPACITY = 0.35
const RIM_OPACITY = 0.65
//
// Glint: a small white oval on the upper left of the belly and a tiny
// spark lower on the right (offsets and radii as radius shares).
//
const GLINT_X = -0.38
const GLINT_Y = -0.3
const GLINT_RX = 0.2
const GLINT_RY = 0.11
const GLINT_ANGLE = -0.7
const GLINT_OPACITY = 0.85
const SPARK_X = 0.32
const SPARK_Y = 0.42
const SPARK_R = 0.07
const SPARK_OPACITY = 0.55
const GLINT_SEGMENTS = 12
const MIN_RADIUS = 0.6

/**
 * Creates the drop's drawing state (reused point buffers, colours).
 * @param {Object} k - Kaplay instance
 * @param {Object} colors - Palette hex group (palette.waterFlower)
 * @returns {Object} Drop inst
 */
export function create(k, colors) {
  return {
    k,
    light: forestRgb(colors.dropLight),
    body: forestRgb(colors.drop),
    deep: forestRgb(colors.dropDeep),
    core: kColor(k, colors.dropLight),
    glint: kColor(k, colors.dropGlint),
    outline: Array.from({ length: OUTLINE_SEGMENTS }, newPoint),
    shade: Array.from({ length: OUTLINE_SEGMENTS }, () => k.rgb(0, 0, 0)),
    poly: { pts: [], pool: [], colors: [], indices: [], count: 0 },
    opacities: []
  }
}

/**
 * Draws the drop.
 * @param {Object} inst - Drop inst
 * @param {number} cx - World X of its belly's centre
 * @param {number} cy - World Y of its belly's centre
 * @param {number} r - Belly radius
 * @param {number} stretch - Belly height share (1 round, more is taller and narrower)
 * @param {number} tip - How far the tip reaches over the belly's top (world px)
 * @param {number} angle - Turn of the drop round its centre (radians; 0: tip straight up)
 */
export function draw(inst, cx, cy, r, stretch, tip, angle) {
  if (r < MIN_RADIUS) return
  buildOutline(inst, r, stretch, tip)
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  drawBody(inst, cx, cy, r, cos, sin)
  drawOval(inst, cx, cy, GLINT_X * r, GLINT_Y * r * stretch, GLINT_RX * r, GLINT_RY * r, GLINT_ANGLE, cos, sin, GLINT_OPACITY)
  drawOval(inst, cx, cy, SPARK_X * r, SPARK_Y * r * stretch, SPARK_R * r, SPARK_R * r, 0, cos, sin, SPARK_OPACITY)
}
//
// Outline round the centre (local px, tip up) from the top clockwise: the
// lower half an ellipse of the stretch, the upper half narrowing into the
// tip. Each point keeps its colour along the light → body → deep ramp.
//
function buildOutline(inst, r, stretch, tip) {
  const rx = r / Math.sqrt(stretch)
  const ry = r * stretch
  const top = -ry - tip
  const pinch = TOP_PINCH * Math.min(1, tip / r + 0.5)
  for (let i = 0; i < OUTLINE_SEGMENTS; i++) {
    const th = -Math.PI / 2 + 2 * Math.PI * i / OUTLINE_SEGMENTS
    const s = Math.sin(th)
    const p = inst.outline[i]
    const up = s < 0 ? -s : 0
    p.x = rx * Math.cos(th) * (1 - pinch * up)
    p.y = ry * s - tip * Math.pow(up, TIP_POW)
    rampColor(inst, (p.y - top) / (ry - top), inst.shade[i])
  }
}
//
// The belly and tip as one fan round a pale core up on the left.
//
function drawBody(inst, cx, cy, r, cos, sin) {
  const poly = resetPoly(inst)
  pushPoint(poly, inst, cx, cy, CORE_X * r, CORE_Y * r, cos, sin, inst.core)
  for (let i = 0; i < OUTLINE_SEGMENTS; i++) pushPoint(poly, inst, cx, cy, inst.outline[i].x, inst.outline[i].y, cos, sin, inst.shade[i])
  for (let i = 1; i <= OUTLINE_SEGMENTS; i++) poly.indices.push(0, i, i === OUTLINE_SEGMENTS ? 1 : i + 1)
  const opacities = inst.opacities
  opacities.length = poly.count
  opacities.fill(RIM_OPACITY)
  opacities[0] = CORE_OPACITY
  poly.pts.length = poly.count
  poly.colors.length = poly.count
  inst.k.drawPolygon({ pts: poly.pts, colors: poly.colors, opacities, indices: poly.indices })
}
function drawOval(inst, cx, cy, ox, oy, rx, ry, tilt, cos, sin, opacity) {
  const poly = resetPoly(inst)
  const tc = Math.cos(tilt)
  const ts = Math.sin(tilt)
  pushPoint(poly, inst, cx, cy, ox, oy, cos, sin, inst.glint)
  for (let i = 0; i < GLINT_SEGMENTS; i++) {
    const th = 2 * Math.PI * i / GLINT_SEGMENTS
    const x = rx * Math.cos(th)
    const y = ry * Math.sin(th)
    pushPoint(poly, inst, cx, cy, ox + x * tc - y * ts, oy + x * ts + y * tc, cos, sin, inst.glint)
  }
  for (let i = 1; i <= GLINT_SEGMENTS; i++) poly.indices.push(0, i, i === GLINT_SEGMENTS ? 1 : i + 1)
  flush(inst, poly, opacity)
}
//
// Light at the very top, the body colour BODY_AT down, the deep colour at
// the bottom (u: 0 top, 1 bottom), written into a reused Kaplay colour.
//
function rampColor(inst, u, out) {
  const t = Math.max(0, Math.min(1, u))
  const a = t < BODY_AT ? inst.light : inst.body
  const b = t < BODY_AT ? inst.body : inst.deep
  const f = t < BODY_AT ? t / BODY_AT : (t - BODY_AT) / (1 - BODY_AT)
  out.r = a.r + (b.r - a.r) * f
  out.g = a.g + (b.g - a.g) * f
  out.b = a.b + (b.b - a.b) * f
}
function flush(inst, poly, opacity) {
  poly.pts.length = poly.count
  poly.colors.length = poly.count
  inst.k.drawPolygon({ pts: poly.pts, colors: poly.colors, indices: poly.indices, opacity })
}
function resetPoly(inst) {
  const poly = inst.poly
  poly.count = 0
  poly.indices.length = 0
  return poly
}
//
// A local point (tip up) turned by the drop's angle and moved to its
// centre. Points live in a pool so nothing is allocated per frame.
//
function pushPoint(poly, inst, cx, cy, x, y, cos, sin, color) {
  const p = poly.pool[poly.count] ?? (poly.pool[poly.count] = newPoint())
  p.x = cx + x * cos - y * sin
  p.y = cy + x * sin + y * cos
  poly.pts[poly.count] = p
  poly.colors[poly.count] = color
  poly.count++
}
function kColor(k, hex) {
  const c = forestRgb(hex)
  return k.rgb(c.r, c.g, c.b)
}
function newPoint() {
  return { x: 0, y: 0 }
}
