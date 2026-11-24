import * as Layout from './cave-layout.js'
import * as Platform from './cave-platform.js'
import * as Ground from './cave-ground.js'
import * as Scene from './cave-scene.js'
//
// Every side of the platforms — and the room's side walls and its ceiling
// — as a surface a small creature clings to (cave-runner.js): one solid
// mask of all that soil's art (the platforms' layers and the room's;
// a pixel this opaque is solid), read once per page. A ledge running into
// a wall carries on up the wall's face onto the ceiling. Rays cross it
// in any direction (raycast), and its outline — tops, sides and undersides
// alike — is traced (marching squares over a grid of CELL px) into crawl
// runs: lines of points with their outward normal and the tangent along
// the run, smoothed (SMOOTH points either side, SMOOTH_PASSES times; the
// tangent over TANGENT_SPAN points either side).
//
// A run stops where the outline leaves the world (WALL_MARGIN px inside
// its edges: the walls' and the ceiling's far sides, the roots' hole up
// through the ceiling), under the lake's water
// (WATER_MARGIN px round it), and where there is no room off the surface:
// solid again within CLEAR px along the normal (checked every CLEAR_STEP
// px) — a tight gap between two platforms, or a hole inside the soil.
// That room is measured from each point along the normal of a coarser
// outline (COARSE_SMOOTH points either side), which leans over the notches
// between the stones of a heap and the lumps of a ragged edge instead of
// into their sides, and a tight stretch of fewer than TIGHT_BRIDGE points
// does not cut it — nor one whose ends lie within TIGHT_BRIDGE_PX of each
// other (the outline round a small lump or ledge: a runner climbs over
// it). A run shorter than MIN_RUN px is dropped.
//
const SOLID_ALPHA = 128
const RGBA = 4
const ALPHA_OFFSET = 3
const PAD = 64
const CELL = 2
const SMOOTH = 7
const COARSE_SMOOTH = 18
const SMOOTH_PASSES = 2
const TANGENT_SPAN = 4
const NORMAL_PROBE = 5
const WALL_MARGIN = 6
const WATER_MARGIN = 8
//
// Nothing crawls into the banks' hollows under the water: they count as
// the lake's, HOLLOW_MARGIN px round them.
//
const HOLLOW_MARGIN = 12
//
// The lake's water reaches LAKE_BELOW px under its surface at most (no
// open air there: isOpenAir).
//
const LAKE_BELOW = 300
const CLEAR = 30
const CLEAR_STEP = 6
const TIGHT_BRIDGE = 24
const TIGHT_BRIDGE_PX = 40
const MIN_RUN = 120
//
// Marching squares: the outline's segments per cell case (corner bits:
// top-left 8, top-right 4, bottom-right 2, bottom-left 1), as pairs of the
// cell's edges; the two saddles keep their solid corners apart.
//
const EDGE = { T: 0, R: 1, B: 2, L: 3 }
const CASES = [
  [],
  [[EDGE.L, EDGE.B]],
  [[EDGE.B, EDGE.R]],
  [[EDGE.L, EDGE.R]],
  [[EDGE.T, EDGE.R]],
  [[EDGE.L, EDGE.T], [EDGE.B, EDGE.R]],
  [[EDGE.T, EDGE.B]],
  [[EDGE.L, EDGE.T]],
  [[EDGE.L, EDGE.T]],
  [[EDGE.T, EDGE.B]],
  [[EDGE.T, EDGE.R], [EDGE.L, EDGE.B]],
  [[EDGE.T, EDGE.R]],
  [[EDGE.L, EDGE.R]],
  [[EDGE.B, EDGE.R]],
  [[EDGE.L, EDGE.B]],
  []
]
const CORNER_TL = 8
const CORNER_TR = 4
const CORNER_BR = 2
const CORNER_BL = 1
const HALF = 0.5
let mask = null
let runs = null

/**
 * A ray across the platforms' solid mask: the first solid point from
 * x / y along dx / dy (a unit direction) within maxDist px, or null.
 * @param {number} x - Start X (world)
 * @param {number} y - Start Y (world)
 * @param {number} dx - Direction X
 * @param {number} dy - Direction Y
 * @param {number} maxDist - Ray length (px)
 * @returns {{x: number, y: number, dist: number}|null}
 */
export function raycast(x, y, dx, dy, maxDist) {
  const m = solidMask()
  for (let t = 0; t <= maxDist; t++) {
    const px = x + dx * t
    const py = y + dy * t
    if (isSolidIn(m, px, py)) return { x: px, y: py, dist: t }
  }
  return null
}

/**
 * Whether a world point lies in the soil (the platforms' solid mask).
 * @param {number} x - World X
 * @param {number} y - World Y
 * @returns {boolean}
 */
export function isSoil(x, y) {
  return isSolidIn(solidMask(), x, y)
}

/**
 * Whether a world point is in the open air of the cave: neither in the
 * soil nor within `pad` px of it, nor over the lake's water within `pad`
 * px of its surface, nor in the water of a bank's hollow (which reaches in
 * under the bank past the lake's ends: a light there would show in front
 * of the soil or the water, not in the room between them).
 * @param {number} x - World X
 * @param {number} y - World Y
 * @param {number} pad - Clearance (px)
 * @returns {boolean}
 */
export function isOpenAir(x, y, pad) {
  if (x > Layout.LAKE_X1 - pad && x < Layout.LAKE_X2 + pad && y > Layout.LAKE_SURFACE_Y - pad && y < Layout.LAKE_SURFACE_Y + LAKE_BELOW) return false
  if (Layout.inHollow(x, y, pad)) return false
  const m = solidMask()
  return !isSolidIn(m, x, y) && !isSolidIn(m, x - pad, y) && !isSolidIn(m, x + pad, y) && !isSolidIn(m, x, y - pad) && !isSolidIn(m, x, y + pad)
}

/**
 * The crawl runs over every side of the platforms (traced once per page).
 * @returns {Array<{pts: Array<{x: number, y: number, nx: number, ny: number, tx: number, ty: number}>, s: Float32Array, len: number, closed: boolean}>}
 */
export function crawlRuns() {
  runs ??= traceRuns(solidMask())
  return runs
}

/**
 * A run's point at arc length s (clamped on an open run, wrapped round a
 * closed one), its normal and tangent eased between the points round it.
 * @param {Object} run - Crawl run
 * @param {number} s - Arc length along the run (px)
 * @param {Object} out - Filled with x, y, nx, ny, tx, ty
 * @returns {Object} out
 */
export function sample(run, s, out) {
  const len = run.len
  const at = run.closed ? ((s % len) + len) % len : Math.max(0, Math.min(len, s))
  let lo = 0
  let hi = run.s.length - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    run.s[mid] <= at ? (lo = mid) : (hi = mid)
  }
  const a = run.pts[lo]
  const b = run.pts[hi === lo ? lo : hi]
  const span = run.s[hi] - run.s[lo]
  const u = span > 0 ? (at - run.s[lo]) / span : 0
  out.x = a.x + (b.x - a.x) * u
  out.y = a.y + (b.y - a.y) * u
  setUnit(out, 'nx', 'ny', a.nx + (b.nx - a.nx) * u, a.ny + (b.ny - a.ny) * u)
  setUnit(out, 'tx', 'ty', a.tx + (b.tx - a.tx) * u, a.ty + (b.ty - a.ty) * u)
  return out
}
//
// The solid mask of every platform's art, built once per page: a byte a
// world px, PAD px past the world on every side.
//
function solidMask() {
  if (mask) return mask
  const w = Layout.WORLD_W + PAD * 2
  const h = Layout.WORLD_H + PAD * 2
  const data = new Uint8Array(w * h)
  Layout.PLATFORMS.forEach(p => stampLayer(data, w, h, Platform.layerOf(p)))
  Scene.roomLayers().forEach(layer => stampLayer(data, w, h, layer))
  mask = { data, w, h }
  return mask
}
//
// Marks a layer's solid pixels in the mask.
//
function stampLayer(data, w, h, layer) {
  const { width: lw, height: lh } = layer.canvas
  const pixels = layer.ctx.getImageData(0, 0, lw, lh).data
  const ox = Math.round(layer.x) + PAD
  const oy = Math.round(layer.y) + PAD
  for (let y = 0; y < lh; y++) {
    const my = oy + y
    if (my < 0 || my >= h) continue
    for (let x = 0; x < lw; x++) {
      const mx = ox + x
      if (mx < 0 || mx >= w || pixels[(y * lw + x) * RGBA + ALPHA_OFFSET] < SOLID_ALPHA) continue
      data[my * w + mx] = 1
    }
  }
}
function isSolidIn(m, x, y) {
  const mx = Math.round(x) + PAD
  const my = Math.round(y) + PAD
  return mx >= 0 && my >= 0 && mx < m.w && my < m.h && m.data[my * m.w + mx] === 1
}
//
// The mask's outline as crawl runs: traced loops, smoothed, given their
// normals, cut where a creature may not go.
//
function traceRuns(m) {
  const out = []
  outlineLoops(m).forEach(loop => {
    const pts = smoothLoop(loop, SMOOTH)
    const coarse = smoothLoop(loop, COARSE_SMOOTH)
    const flip = orientLoop(m, pts)
    setNormals(coarse, flip)
    splitLoop(m, pts, coarse).forEach(run => run.len >= MIN_RUN && out.push(run))
  })
  return out
}
//
// Marching squares over a grid of mask samples CELL px apart (one empty
// cell all round, so every outline closes): each cell's segments join the
// midpoints of its edges; linked edge to edge they make closed loops of
// world points.
//
function outlineLoops(m) {
  const gw = Math.ceil(m.w / CELL) + 2
  const gh = Math.ceil(m.h / CELL) + 2
  const grid = new Uint8Array(gw * gh)
  for (let j = 1; j < gh - 1; j++) {
    for (let i = 1; i < gw - 1; i++) grid[j * gw + i] = m.data[Math.min(m.h - 1, (j - 1) * CELL) * m.w + Math.min(m.w - 1, (i - 1) * CELL)]
  }
  const links = new Map()
  for (let j = 0; j < gh - 1; j++) {
    for (let i = 0; i < gw - 1; i++) {
      const cell = j * gw + i
      const kind = (grid[cell] ? CORNER_TL : 0) | (grid[cell + 1] ? CORNER_TR : 0) | (grid[cell + gw + 1] ? CORNER_BR : 0) | (grid[cell + gw] ? CORNER_BL : 0)
      CASES[kind].forEach(([a, b]) => link(links, edgeKey(gw, i, j, a), edgeKey(gw, i, j, b)))
    }
  }
  return walkLoops(links).map(keys => keys.map(key => edgePoint(gw, key)))
}
//
// A cell edge's key: horizontal edges even, vertical ones odd.
//
function edgeKey(gw, i, j, edge) {
  if (edge === EDGE.T) return (j * gw + i) * 2
  if (edge === EDGE.B) return ((j + 1) * gw + i) * 2
  if (edge === EDGE.L) return (j * gw + i) * 2 + 1
  return (j * gw + i + 1) * 2 + 1
}
//
// The world point at an edge's midpoint.
//
function edgePoint(gw, key) {
  const idx = key >> 1
  const i = idx % gw
  const j = Math.floor(idx / gw)
  const vertical = key & 1
  return { x: (i + (vertical ? 0 : HALF) - 1) * CELL - PAD, y: (j + (vertical ? HALF : 0) - 1) * CELL - PAD }
}
function link(links, a, b) {
  links.has(a) ? links.get(a).push(b) : links.set(a, [b])
  links.has(b) ? links.get(b).push(a) : links.set(b, [a])
}
//
// Follows the links from every edge not yet walked round to where it
// started.
//
function walkLoops(links) {
  const seen = new Set()
  const loops = []
  links.forEach((_, start) => {
    if (seen.has(start)) return
    const keys = []
    let prev = -1
    let cur = start
    while (cur !== undefined && !seen.has(cur)) {
      seen.add(cur)
      keys.push(cur)
      const next = links.get(cur).find(key => key !== prev && !seen.has(key))
      prev = cur
      cur = next
    }
    keys.length * CELL >= MIN_RUN && loops.push(keys)
  })
  return loops
}
//
// A closed loop's points evened out (a moving mean over `reach` points
// either side, wrapping round).
//
function smoothLoop(loop, reach) {
  let pts = loop
  const n = pts.length
  for (let pass = 0; pass < SMOOTH_PASSES; pass++) {
    pts = pts.map((_, i) => {
      let x = 0
      let y = 0
      for (let d = -reach; d <= reach; d++) {
        const q = pts[(i + d + n) % n]
        x += q.x
        y += q.y
      }
      return { x: x / (reach * 2 + 1), y: y / (reach * 2 + 1) }
    })
  }
  return pts
}
//
// Tangents along the loop and normals at right angles to them, turned so
// they point out of the solid (by a vote of probes either side); returns
// whether they had to be turned.
//
function orientLoop(m, pts) {
  setNormals(pts, false)
  let votes = 0
  pts.forEach(p => {
    const outside = !isSolidIn(m, p.x + p.nx * NORMAL_PROBE, p.y + p.ny * NORMAL_PROBE)
    const inside = isSolidIn(m, p.x - p.nx * NORMAL_PROBE, p.y - p.ny * NORMAL_PROBE)
    votes += (outside && inside ? 1 : 0) - (!outside && !inside ? 1 : 0)
  })
  if (votes >= 0) return false
  pts.forEach(p => {
    p.nx = -p.nx
    p.ny = -p.ny
  })
  return true
}
//
// Tangents along a loop and its normals at right angles to them (turned
// the other way round when flip).
//
function setNormals(pts, flip) {
  const n = pts.length
  const side = flip ? -1 : 1
  pts.forEach((p, i) => {
    const a = pts[(i - TANGENT_SPAN + n) % n]
    const b = pts[(i + TANGENT_SPAN) % n]
    setUnit(p, 'tx', 'ty', b.x - a.x, b.y - a.y)
    p.nx = p.ty * side
    p.ny = -p.tx * side
  })
}
//
// The loop cut into the stretches a creature may walk; a loop walkable
// all round stays one closed run.
//
function splitLoop(m, pts, coarse) {
  const n = pts.length
  const tight = pts.map((p, i) => isTight(m, p.x, p.y, coarse[i].nx, coarse[i].ny))
  bridgeTight(tight, pts)
  const ok = pts.map((p, i) => !tight[i] && isInRoom(p))
  const firstBad = ok.indexOf(false)
  if (firstBad < 0) return [runOf(pts, true)]
  const out = []
  let cur = []
  for (let k = 1; k <= n; k++) {
    const i = (firstBad + k) % n
    if (ok[i]) {
      cur.push(pts[i])
      continue
    }
    cur.length > 1 && out.push(runOf(cur, false))
    cur = []
  }
  return out
}
//
// Whether a point lies inside the world (WALL_MARGIN px in from its edges)
// and not in the lake's water.
//
function isInRoom(p) {
  if (p.x < WALL_MARGIN || p.x > Layout.WORLD_W - WALL_MARGIN) return false
  if (p.y < WALL_MARGIN || p.y > Layout.WORLD_H - WALL_MARGIN) return false
  return !isUnderWater(p)
}
//
// No room off the surface here: solid again along the normal.
//
function isTight(m, x, y, nx, ny) {
  for (let d = CLEAR_STEP; d <= CLEAR; d += CLEAR_STEP) {
    if (isSolidIn(m, x + nx * d, y + ny * d)) return true
  }
  return false
}
//
// Tight stretches shorter than TIGHT_BRIDGE points round the loop, or
// with their ends close together, are let through.
//
function bridgeTight(tight, pts) {
  const n = tight.length
  const start = tight.indexOf(false)
  if (start < 0) return
  for (let k = 1; k <= n; k++) {
    const i = (start + k) % n
    if (!tight[i] || tight[(i - 1 + n) % n]) continue
    let len = 0
    while (len < n && tight[(i + len) % n]) len++
    const a = pts[(i - 1 + n) % n]
    const b = pts[(i + len) % n]
    if (len >= TIGHT_BRIDGE && Math.hypot(a.x - b.x, a.y - b.y) >= TIGHT_BRIDGE_PX) continue
    for (let d = 0; d < len; d++) tight[(i + d) % n] = false
  }
}
function isUnderWater(p) {
  if (Layout.inHollow(p.x, p.y, HOLLOW_MARGIN)) return true
  const { x0, tops, beds } = Ground.waterColumns()
  for (let c = Math.round(p.x) - WATER_MARGIN; c <= Math.round(p.x) + WATER_MARGIN; c++) {
    const i = c - x0
    if (!Number.isNaN(tops[i] ?? NaN) && p.y > Math.min(tops[i], Layout.LAKE_SURFACE_Y) - WATER_MARGIN && p.y < beds[i] + WATER_MARGIN) return true
  }
  return false
}
//
// A run over a stretch of points: arc length to each point, the whole
// length (round a closed one back to its start).
//
function runOf(pts, closed) {
  const s = new Float32Array(pts.length + (closed ? 1 : 0))
  for (let i = 1; i < s.length; i++) {
    const a = pts[i - 1]
    const b = pts[i % pts.length]
    s[i] = s[i - 1] + Math.hypot(b.x - a.x, b.y - a.y)
  }
  return { pts: closed ? [...pts, pts[0]] : pts, s, len: s[s.length - 1], closed }
}
function setUnit(o, kx, ky, x, y) {
  const len = Math.hypot(x, y) || 1
  o[kx] = x / len
  o[ky] = y / len
}
