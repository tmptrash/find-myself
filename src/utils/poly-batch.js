//
// Collects many flat-coloured primitives (line quads, small discs, indexed
// shapes) into ONE drawPolygon call with per-vertex colours. Each Kaplay draw
// call carries fixed JS overhead (transform push, array allocation, batch
// bookkeeping); animated decor made of dozens of tiny limbs and lips pays it
// per primitive otherwise. Triangles render in index order, so the painter's
// order of the individual primitives is preserved exactly.
//
//
// Disc tessellation scales with radius (sub-0.2px facet error up to ~20px
// radius) — far fewer vertices than Kaplay's drawCircle, which emits ~30-70
// even for small dots.
//
const DISC_SEGMENTS_MIN = 12
const DISC_SEGMENTS_PER_PX = 1.6
const discUnitCache = new Map()
const QUAD_INDICES = [0, 1, 2, 0, 2, 3]

/**
 * Creates an empty polygon batch (reuse one per draw layer across frames —
 * vertex objects are recycled to keep the per-frame allocation near zero).
 * @returns {Object} Batch inst
 */
export function create() {
  return { pts: [], colors: [], indices: [], count: 0 }
}

/**
 * Clears the batch for a new frame.
 * @param {Object} inst - Batch inst
 */
export function reset(inst) {
  inst.count = 0
  inst.indices.length = 0
}

/**
 * Adds a butt-capped line as a quad (same geometry as k.drawLine).
 * @param {Object} inst - Batch inst
 * @param {number} x1 - Start X
 * @param {number} y1 - Start Y
 * @param {number} x2 - End X
 * @param {number} y2 - End Y
 * @param {number} width - Line width
 * @param {Object} color - Kaplay colour
 */
export function addLine(inst, x1, y1, x2, y2, width, color) {
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.hypot(dx, dy)
  if (len < 1e-6) return
  const nx = (-dy / len) * width * 0.5
  const ny = (dx / len) * width * 0.5
  const base = inst.count
  setVertex(inst, base, x1 + nx, y1 + ny, color)
  setVertex(inst, base + 1, x2 + nx, y2 + ny, color)
  setVertex(inst, base + 2, x2 - nx, y2 - ny, color)
  setVertex(inst, base + 3, x1 - nx, y1 - ny, color)
  QUAD_INDICES.forEach(i => inst.indices.push(base + i))
  inst.count += 4
}

/**
 * Adds a filled disc as a polygon fan (segment count grows with radius).
 * @param {Object} inst - Batch inst
 * @param {number} x - Centre X
 * @param {number} y - Centre Y
 * @param {number} radius - Radius in px
 * @param {Object} color - Kaplay colour
 */
export function addDisc(inst, x, y, radius, color) {
  if (radius <= 0) return
  const unit = discUnit(discSegmentCount(radius))
  const base = inst.count
  unit.forEach((u, i) => setVertex(inst, base + i, x + u.x * radius, y + u.y * radius, color))
  for (let i = 1; i < unit.length - 1; i++) inst.indices.push(base, base + i, base + i + 1)
  inst.count += unit.length
}

/**
 * Adds a pre-triangulated local shape, scaled per axis, rotated and moved
 * to a world origin.
 * @param {Object} inst - Batch inst
 * @param {Array<[number, number]>} shape - Local vertices
 * @param {number[]} indices - Triangle indices into shape
 * @param {number} ox - World origin X
 * @param {number} oy - World origin Y
 * @param {number} sx - Local X scale
 * @param {number} sy - Local Y scale
 * @param {number} cos - Cosine of the rotation
 * @param {number} sin - Sine of the rotation
 * @param {Object} color - Kaplay colour
 */
export function addShape(inst, shape, indices, ox, oy, sx, sy, cos, sin, color) {
  const base = inst.count
  shape.forEach(([lx, ly], i) => {
    const px = lx * sx
    const py = ly * sy
    setVertex(inst, base + i, ox + px * cos - py * sin, oy + px * sin + py * cos, color)
  })
  indices.forEach(i => inst.indices.push(base + i))
  inst.count += shape.length
}

/**
 * Draws everything collected so far in one call and clears the batch.
 * @param {Object} inst - Batch inst
 * @param {Object} k - Kaplay instance
 * @param {number} [opacity=1] - Shared opacity
 */
export function flush(inst, k, opacity = 1) {
  if (inst.count >= 3 && inst.indices.length) {
    inst.pts.length = inst.count
    inst.colors.length = inst.count
    k.drawPolygon({
      pts: inst.pts,
      colors: inst.colors,
      indices: inst.indices,
      ...(opacity < 1 ? { opacity } : {})
    })
  }
  reset(inst)
}
function discSegmentCount(radius) {
  if (radius < 3.5) return 6
  if (radius < 8) return 8
  return Math.max(DISC_SEGMENTS_MIN, Math.round(radius * DISC_SEGMENTS_PER_PX))
}
function discUnit(segments) {
  let unit = discUnitCache.get(segments)
  if (unit) return unit
  unit = Array.from({ length: segments }, (_, i) => {
    const a = (i / segments) * Math.PI * 2
    return { x: Math.cos(a), y: Math.sin(a) }
  })
  discUnitCache.set(segments, unit)
  return unit
}
function setVertex(inst, i, x, y, color) {
  const p = inst.pts[i] ?? (inst.pts[i] = { x: 0, y: 0 })
  p.x = x
  p.y = y
  inst.colors[i] = color
}
