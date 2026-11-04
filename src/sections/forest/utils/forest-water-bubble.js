import { forestRgb } from './forest-palette.js'

//
// The water flower's bubble, drawn as flat palette polygons: a milky,
// cloudy skin (so it reads against the dark trunks behind it), the water
// standing in its lower part under one pale surface line that ripples a
// little and stays level while the bubble swings, a light rim and two
// glints. While it hangs, its top is pulled up into a short neck that ends
// inside the flower. Once the skin has popped only the water is drawn.
//
const OUTLINE_SEGMENTS = 28
const NECK_POW = 6                // Higher: the neck is a narrower point
const RIM_WIDTH = 1               // World px
const SURFACE_WIDTH = 0.8
//
// Ripples on the water's surface: two travelling waves under an envelope
// that keeps the surface's ends on the skin (amplitude as a share of the
// radius, wave counts across the surface, the second wave's speed share).
//
const SURFACE_POINTS = 10
const WAVE_AMP = 0.06
const WAVE_A_COUNT = 1.5
const WAVE_B_COUNT = 2.5
const WAVE_B_WEIGHT = 0.4
const WAVE_B_SPEED = -1.3
//
// Glints: an oval of light on the upper left of the skin and a small spark
// on the water's lower right (offsets and radii as shares of the radius).
//
const GLINT_X = -0.4
const GLINT_Y = -0.42
const GLINT_RX = 0.24
const GLINT_RY = 0.13
const GLINT_ANGLE = -0.6
const SPARK_X = 0.38
const SPARK_Y = 0.36
const SPARK_R = 0.08
const GLINT_SEGMENTS = 10
const SKIN_OPACITY = 0.34
const WATER_OPACITY = 0.82
const SURFACE_OPACITY = 0.8
const RIM_OPACITY = 0.75
const GLINT_OPACITY = 0.9
const SPARK_OPACITY = 0.7
//
// Pop: the skin's ring flies apart and fades.
//
const POP_GROWTH = 0.9
const POP_WIDTH = 1.4
const POP_OPACITY = 0.8
const MIN_RADIUS = 0.6
//
// Flash: the highlight colour over the whole bubble at its peak.
//
const FLASH_OPACITY = 0.75

/**
 * Creates the bubble's drawing state (reused point buffers, colours).
 * @param {Object} k - Kaplay instance
 * @param {Object} colors - Palette hex group (palette.waterFlower)
 * @returns {Object} Bubble inst
 */
export function create(k, colors) {
  return {
    k,
    colors: {
      skin: kColor(k, colors.skin),
      skinRim: kColor(k, colors.skinRim),
      highlight: kColor(k, colors.highlight),
      water: kColor(k, colors.water),
      waterSurface: kColor(k, colors.waterSurface)
    },
    outline: Array.from({ length: OUTLINE_SEGMENTS }, newPoint),
    clipped: [],
    crossings: 0,
    surface: [],
    poly: { pts: [], pool: [], indices: [], count: 0 }
  }
}

/**
 * Draws the bubble.
 * @param {Object} inst - Bubble inst
 * @param {number} cx - World X of its centre
 * @param {number} cy - World Y of its centre
 * @param {number} r - Radius
 * @param {number} stretch - Height share (1 round, more is taller and narrower)
 * @param {number} neck - Share of the radius the top is pulled up
 * @param {number} fill - Share of its height the water stands at
 * @param {number} slope - Tilt of the water's surface (dy per dx)
 * @param {number} wave - Phase of the surface ripples (radians, grows with time)
 * @param {number} [skin=1] - Share of the skin (its fill, rim and glint) still there; 0 is bare water
 */
export function draw(inst, cx, cy, r, stretch, neck, fill, slope, wave, skin = 1) {
  if (r < MIN_RADIUS) return
  buildOutline(inst, cx, cy, r, stretch, neck)
  const ry = r * stretch
  skin > 0 && drawFan(inst, inst.outline, inst.outline.length, inst.colors.skin, SKIN_OPACITY * skin)
  const level = cy + ry - 2 * ry * fill
  const n = clipBelow(inst, level, cx, slope)
  if (inst.crossings === 2) {
    buildSurface(inst, n, r, wave)
    drawWater(inst, n, cx, (level + cy + ry) / 2)
    drawSurface(inst)
  } else {
    drawFan(inst, inst.clipped, n, inst.colors.water, WATER_OPACITY)
  }
  drawRim(inst, cx, cy, RIM_WIDTH, inst.colors.skinRim, RIM_OPACITY * skin)
  skin > 0 && drawOval(inst, cx + GLINT_X * r, cy + GLINT_Y * ry, GLINT_RX * r, GLINT_RY * r, GLINT_ANGLE,
    inst.colors.highlight, GLINT_OPACITY * skin)
  drawOval(inst, cx + SPARK_X * r, cy + SPARK_Y * ry, SPARK_R * r, SPARK_R * r, 0,
    inst.colors.highlight, SPARK_OPACITY)
}

/**
 * Brightens the whole bubble last drawn by draw() (same outline), for a
 * flash.
 * @param {Object} inst - Bubble inst
 * @param {number} amount - Flash strength 0..1
 */
export function drawFlash(inst, amount) {
  amount > 0 && drawFan(inst, inst.outline, inst.outline.length, inst.colors.highlight, FLASH_OPACITY * amount)
}

/**
 * Draws the popped skin's ring flying apart.
 * @param {Object} inst - Bubble inst
 * @param {number} cx - World X of the pop
 * @param {number} cy - World Y of the pop
 * @param {number} r - Bubble radius at the pop
 * @param {number} t - Progress 0..1
 */
export function drawPop(inst, cx, cy, r, t) {
  if (t >= 1 || r < MIN_RADIUS) return
  buildOutline(inst, cx, cy, r * (1 + POP_GROWTH * t), 1, 0)
  drawRim(inst, cx, cy, POP_WIDTH * (1 - t), inst.colors.skinRim, POP_OPACITY * (1 - t))
}
//
// Outline from the top round clockwise: an ellipse of the stretch, its top
// drawn up into the neck.
//
function buildOutline(inst, cx, cy, r, stretch, neck) {
  const rx = r / Math.sqrt(stretch)
  const ry = r * stretch
  for (let i = 0; i < OUTLINE_SEGMENTS; i++) {
    const th = -Math.PI / 2 + 2 * Math.PI * i / OUTLINE_SEGMENTS
    const s = Math.sin(th)
    const p = inst.outline[i]
    p.x = cx + rx * Math.cos(th)
    p.y = cy + ry * s - (s < 0 ? neck * r * Math.pow(-s, NECK_POW) : 0)
  }
}
//
// The outline's part below the water line (one half-plane clip of a convex
// outline whose top is always dry): it runs from the surface's right end
// down round the bottom to its left end. Returns its point count.
//
function clipBelow(inst, level, cx, slope) {
  const out = inst.clipped
  const src = inst.outline
  let n = 0
  inst.crossings = 0
  for (let i = 0; i < src.length; i++) {
    const a = src[i]
    const b = src[(i + 1) % src.length]
    const da = a.y - (level + slope * (a.x - cx))
    const db = b.y - (level + slope * (b.x - cx))
    da >= 0 && setAt(out, n++, a.x, a.y)
    if ((da >= 0) === (db >= 0)) continue
    const t = da / (da - db)
    setAt(out, n++, a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)
    inst.crossings++
  }
  return n
}
//
// The rippled surface from its left end to its right end.
//
function buildSurface(inst, n, r, wave) {
  const left = inst.clipped[n - 1]
  const right = inst.clipped[0]
  for (let j = 0; j <= SURFACE_POINTS; j++) {
    const u = j / SURFACE_POINTS
    const ripple = Math.sin(2 * Math.PI * WAVE_A_COUNT * u + wave) +
      WAVE_B_WEIGHT * Math.sin(2 * Math.PI * WAVE_B_COUNT * u + wave * WAVE_B_SPEED)
    setAt(inst.surface, j, left.x + (right.x - left.x) * u,
      left.y + (right.y - left.y) * u + WAVE_AMP * r * Math.sin(Math.PI * u) * ripple)
  }
}
//
// The water under the rippled surface, as a fan round a point low in it.
//
function drawWater(inst, n, x, y) {
  const poly = resetPoly(inst)
  pushPoint(poly, x, y)
  for (let i = 0; i < n - 1; i++) pushPoint(poly, inst.clipped[i].x, inst.clipped[i].y)
  for (let j = 0; j < SURFACE_POINTS; j++) pushPoint(poly, inst.surface[j].x, inst.surface[j].y)
  const ring = poly.count - 1
  for (let i = 1; i <= ring; i++) poly.indices.push(0, i, i === ring ? 1 : i + 1)
  flush(inst, poly, inst.colors.water, WATER_OPACITY)
}
function drawSurface(inst) {
  const poly = resetPoly(inst)
  const half = SURFACE_WIDTH / 2
  for (let j = 0; j <= SURFACE_POINTS; j++) {
    const p = inst.surface[j]
    pushPoint(poly, p.x, p.y - half)
    pushPoint(poly, p.x, p.y + half)
  }
  for (let j = 0; j < SURFACE_POINTS; j++) {
    const a = j * 2
    poly.indices.push(a, a + 1, a + 3, a, a + 3, a + 2)
  }
  flush(inst, poly, inst.colors.waterSurface, SURFACE_OPACITY)
}
//
// A band along the outline, `width` inside it.
//
function drawRim(inst, cx, cy, width, color, opacity) {
  if (width <= 0 || opacity <= 0) return
  const poly = resetPoly(inst)
  const src = inst.outline
  for (let i = 0; i < src.length; i++) {
    const p = src[i]
    const d = Math.hypot(p.x - cx, p.y - cy) || 1
    const inset = Math.min(1, width / d)
    pushPoint(poly, p.x, p.y)
    pushPoint(poly, p.x + (cx - p.x) * inset, p.y + (cy - p.y) * inset)
  }
  for (let i = 0; i < src.length; i++) {
    const a = i * 2
    const b = ((i + 1) % src.length) * 2
    poly.indices.push(a, a + 1, b + 1, a, b + 1, b)
  }
  flush(inst, poly, color, opacity)
}
function drawOval(inst, cx, cy, rx, ry, angle, color, opacity) {
  const poly = resetPoly(inst)
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  pushPoint(poly, cx, cy)
  for (let i = 0; i < GLINT_SEGMENTS; i++) {
    const th = 2 * Math.PI * i / GLINT_SEGMENTS
    const x = rx * Math.cos(th)
    const y = ry * Math.sin(th)
    pushPoint(poly, cx + x * c - y * s, cy + x * s + y * c)
  }
  for (let i = 1; i <= GLINT_SEGMENTS; i++) poly.indices.push(0, i, i === GLINT_SEGMENTS ? 1 : i + 1)
  flush(inst, poly, color, opacity)
}
//
// A convex outline filled as a fan round its first point.
//
function drawFan(inst, pts, count, color, opacity) {
  if (count < 3) return
  const poly = resetPoly(inst)
  for (let i = 0; i < count; i++) pushPoint(poly, pts[i].x, pts[i].y)
  for (let i = 1; i < count - 1; i++) poly.indices.push(0, i, i + 1)
  flush(inst, poly, color, opacity)
}
function flush(inst, poly, color, opacity) {
  poly.pts.length = poly.count
  inst.k.drawPolygon({ pts: poly.pts, indices: poly.indices, color, opacity })
}
function resetPoly(inst) {
  const poly = inst.poly
  poly.count = 0
  poly.indices.length = 0
  return poly
}
//
// Points live in a pool: the drawn list is cut to the shape's count each
// call, the pool keeps them all so nothing is allocated per frame.
//
function pushPoint(poly, x, y) {
  setAt(poly.pool, poly.count, x, y)
  poly.pts[poly.count] = poly.pool[poly.count]
  poly.count++
}
function setAt(list, i, x, y) {
  const p = list[i] ?? (list[i] = newPoint())
  p.x = x
  p.y = y
}
function kColor(k, hex) {
  const c = forestRgb(hex)
  return k.rgb(c.r, c.g, c.b)
}
function newPoint() {
  return { x: 0, y: 0 }
}
