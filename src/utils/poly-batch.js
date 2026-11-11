//
// Collects many flat-coloured primitives (line quads, tapered ribbons, small
// discs, indexed shapes) into ONE drawPolygon call with per-vertex colours.
// Each Kaplay draw call carries fixed JS overhead (transform push, array
// allocation, batch bookkeeping); animated decor made of dozens of tiny limbs
// and lips pays it per primitive otherwise. Triangles render in index order,
// so the painter's order of the individual primitives is preserved exactly.
//
const DISC_SEGMENTS_MIN = 12
const DISC_SEGMENTS_PER_PX = 1.6
const MITER_DOT_MIN = 0.55
const TIP_CAP_MIN_W = 1.2
const EPS = 1e-6
const discUnitCache = new Map()

/**
 * Creates an empty polygon batch (reuse one per draw layer across frames —
 * vertex objects are recycled to keep the per-frame allocation near zero).
 * @returns {Object} Batch inst
 */
export function create() {
  return { pts: [], colors: [], opacities: [], fades: false, indices: [], count: 0 }
}

/**
 * Clears the batch for a new frame.
 * @param {Object} inst - Batch inst
 */
export function reset(inst) {
  inst.count = 0
  inst.indices.length = 0
  inst.fades = false
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
  if (len < EPS) return
  const inv = (width * 0.5) / len
  const nx = -dy * inv
  const ny = dx * inv
  const base = inst.count
  setVertex(inst, base, x1 + nx, y1 + ny, color)
  setVertex(inst, base + 1, x2 + nx, y2 + ny, color)
  setVertex(inst, base + 2, x2 - nx, y2 - ny, color)
  setVertex(inst, base + 3, x1 - nx, y1 - ny, color)
  inst.indices.push(base, base + 1, base + 2, base, base + 2, base + 3)
  inst.count = base + 4
}

/**
 * Adds a single world-space triangle with zero intermediate allocations.
 * @param {Object} inst - Batch inst
 * @param {number} x1 - Vertex 1 X
 * @param {number} y1 - Vertex 1 Y
 * @param {number} x2 - Vertex 2 X
 * @param {number} y2 - Vertex 2 Y
 * @param {number} x3 - Vertex 3 X
 * @param {number} y3 - Vertex 3 Y
 * @param {Object} color - Kaplay colour
 */
export function addTriangle(inst, x1, y1, x2, y2, x3, y3, color) {
  const base = inst.count
  setVertex(inst, base, x1, y1, color)
  setVertex(inst, base + 1, x2, y2, color)
  setVertex(inst, base + 2, x3, y3, color)
  inst.indices.push(base, base + 1, base + 2)
  inst.count = base + 3
}

/**
 * Adds a quad from its top edge (left, right) to its bottom edge (right, left).
 * @param {Object} inst - Batch inst
 * @param {number} x1 - Top-left X
 * @param {number} y1 - Top-left Y
 * @param {number} x2 - Top-right X
 * @param {number} y2 - Top-right Y
 * @param {number} x3 - Bottom-right X
 * @param {number} y3 - Bottom-right Y
 * @param {number} x4 - Bottom-left X
 * @param {number} y4 - Bottom-left Y
 * @param {Object} color - Kaplay colour
 */
export function addQuad(inst, x1, y1, x2, y2, x3, y3, x4, y4, color) {
  const base = inst.count
  setVertex(inst, base, x1, y1, color)
  setVertex(inst, base + 1, x2, y2, color)
  setVertex(inst, base + 2, x3, y3, color)
  setVertex(inst, base + 3, x4, y4, color)
  inst.indices.push(base, base + 1, base + 2, base, base + 2, base + 3)
  inst.count = base + 4
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
  const len = unit.length
  for (let i = 0; i < len; i++) {
    const u = unit[i]
    setVertex(inst, base + i, x + u.x * radius, y + u.y * radius, color)
  }
  const indices = inst.indices
  for (let i = 1; i < len - 1; i++) {
    indices.push(base, base + i, base + i + 1)
  }
  inst.count = base + len
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
  const sLen = shape.length
  for (let i = 0; i < sLen; i++) {
    const pt = shape[i]
    const px = pt[0] * sx
    const py = pt[1] * sy
    setVertex(inst, base + i, ox + px * cos - py * sin, oy + px * sin + py * cos, color)
  }
  const out = inst.indices
  const iLen = indices.length
  for (let i = 0; i < iLen; i++) {
    out.push(base + indices[i])
  }
  inst.count = base + sLen
}

/**
 * Adds a polygon given in world coordinates with its own triangle indices.
 * @param {Object} inst - Batch inst
 * @param {Array<{x: number, y: number}>} pts - World vertices
 * @param {number[]} indices - Triangle indices into pts
 * @param {Object} color - Kaplay colour
 */
export function addPolygon(inst, pts, indices, color) {
  const base = inst.count
  const pLen = pts.length
  for (let i = 0; i < pLen; i++) {
    const p = pts[i]
    setVertex(inst, base + i, p.x, p.y, color)
  }
  const out = inst.indices
  const iLen = indices.length
  for (let i = 0; i < iLen; i++) {
    out.push(base + indices[i])
  }
  inst.count = base + pLen
}

/**
 * Adds a polyline with round joints (the geometry k.drawLines draws by
 * default): a quad per segment and a disc at every inner point.
 * @param {Object} inst - Batch inst
 * @param {Array<{x: number, y: number}>} pts - World points
 * @param {number} width - Line width
 * @param {Object} color - Kaplay colour
 */
export function addPolyline(inst, pts, width, color) {
  for (let i = 0; i < pts.length - 1; i++) {
    addLine(inst, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y, width, color)
    i > 0 && addDisc(inst, pts[i].x, pts[i].y, width * 0.5, color)
  }
}

/**
 * Adds a continuous mitered triangle-strip ribbon along `pts` whose width
 * tapers linearly from `wBase` to `wTip`, avoiding per-joint discs.
 * @param {Object} inst - Batch inst
 * @param {Array<{x: number, y: number}>} pts - Path points, root first
 * @param {number} wBase - Width at the root
 * @param {number} wTip - Width at the tip
 * @param {Object} color - Kaplay colour
 * @param {boolean} [capTip=true] - Round the tip when thicker than a hairline
 */
export function addTaperedRibbon(inst, pts, wBase, wTip, color, capTip = true) {
  const n = pts.length
  if (n < 2) return
  const last = n - 1
  const base = inst.count
  let prevNx = 0
  let prevNy = 0
  let hasPrev = false
  for (let i = 0; i < n; i++) {
    const cur = pts[i]
    let nx1 = prevNx
    let ny1 = prevNy
    if (i < last) {
      const next = pts[i + 1]
      const dx = next.x - cur.x
      const dy = next.y - cur.y
      const len = Math.hypot(dx, dy)
      if (len > EPS) {
        nx1 = -dy / len
        ny1 = dx / len
      }
    }
    let nx = nx1
    let ny = ny1
    if (hasPrev && i < last) {
      const sx = prevNx + nx1
      const sy = prevNy + ny1
      const sl = Math.hypot(sx, sy)
      if (sl > EPS) {
        const mx = sx / sl
        const my = sy / sl
        const scale = 1 / Math.max(MITER_DOT_MIN, mx * nx1 + my * ny1)
        nx = mx * scale
        ny = my * scale
      }
    }
    prevNx = nx1
    prevNy = ny1
    hasPrev = true
    const half = (wBase + (wTip - wBase) * (i / last)) * 0.5
    const v = base + i * 2
    setVertex(inst, v, cur.x + nx * half, cur.y + ny * half, color)
    setVertex(inst, v + 1, cur.x - nx * half, cur.y - ny * half, color)
  }
  const indices = inst.indices
  for (let i = 0; i < last; i++) {
    const a = base + i * 2
    indices.push(a, a + 2, a + 3, a, a + 3, a + 1)
  }
  inst.count = base + n * 2
  const tip = pts[last]
  capTip && wTip >= TIP_CAP_MIN_W && addDisc(inst, tip.x, tip.y, wTip * 0.5, color)
}

/**
 * Fades the vertices added since a mark by their height: clear at y0,
 * opaque from y1 down to y1End, clear again at y2 (linear in between, clear
 * outside). Opacity is linear in y across every triangle, so the fade is
 * exact for triangles that do not straddle y1 or y1End.
 * @param {Object} inst - Batch inst
 * @param {number} from - First vertex index to fade (inst.count before adding them)
 * @param {number} y0 - Fade-in start (clear)
 * @param {number} y1 - Fully opaque from here
 * @param {number} y2 - Fade-out end (clear)
 * @param {number} [y1End=y1] - Fully opaque down to here
 */
export function fadeBand(inst, from, y0, y1, y2, y1End = y1) {
  const count = inst.count
  const pts = inst.pts
  const ops = inst.opacities
  for (let i = from; i < count; i++) {
    const y = pts[i].y
    if (y < y1) ops[i] = clamp01((y - y0) / (y1 - y0))
    else ops[i] = y <= y1End ? 1 : clamp01((y2 - y) / (y2 - y1End))
  }
  inst.fades = true
}

/**
 * Draws everything collected so far in one call and clears the batch.
 * @param {Object} inst - Batch inst
 * @param {Object} k - Kaplay instance
 * @param {number} [opacity=1] - Shared opacity
 * @param {number} [shiftY=0] - Moves every vertex down by this many px
 * @param {number} [maxY=Infinity] - Vertices below this line (after the shift) are flattened onto it
 * @param {number} [minY=-Infinity] - Vertices above this line (after the shift) are flattened onto it
 */
export function flush(inst, k, opacity = 1, shiftY = 0, maxY = Infinity, minY = -Infinity) {
  if (inst.count >= 3 && inst.indices.length) {
    inst.pts.length = inst.count
    inst.colors.length = inst.count
    if (shiftY !== 0 || maxY < Infinity || minY > -Infinity) shiftVertices(inst.pts, shiftY, maxY, minY)
    k.drawPolygon({
      pts: inst.pts,
      colors: inst.colors,
      indices: inst.indices,
      ...polygonOpacity(inst, opacity)
    })
  }
  reset(inst)
}
//
// Shared opacity, or per-vertex opacities (the shared one folded in) once a
// vertex of this batch fades.
//
function polygonOpacity(inst, opacity) {
  if (!inst.fades) return opacity < 1 ? { opacity } : {}
  const count = inst.count
  const ops = inst.opacities
  ops.length = count
  if (opacity < 1) {
    for (let i = 0; i < count; i++) ops[i] *= opacity
  }
  return { opacities: ops }
}
function clamp01(v) {
  return Math.max(0, Math.min(1, v))
}
function shiftVertices(pts, shiftY, maxY, minY) {
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]
    p.y = Math.max(minY, Math.min(p.y + shiftY, maxY))
  }
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
  inst.opacities[i] = 1
}
