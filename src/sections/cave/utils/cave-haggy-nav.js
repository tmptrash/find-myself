import { vecLen } from '../../../utils/helper.js'
import { CAVE_CFG } from '../cfg.js'
import * as Layout from './cave-layout.js'
import * as Surface from './cave-surface.js'
//
// The climber's ways through the cave (cave-haggy.js), built once per page
// from the platforms' outline (cave-surface.js's crawl runs) and shared by
// every climber: never rebuilt, never scanned whole at run time.
// - Nodes: a body place every NODE_STEP px of the outline, out in the air
//   off it, linked along the outline and through the open air to nodes
//   within LINK_MAX px; each in a group of nodes that reach one another.
// - Holds: an outline point every GRIP_STEP px (with its outward normal),
//   where a hand may hold; looked up in GRID px cells. The stretches of
//   outline they make up are kept as short polylines (`lines`, each with
//   its box) for showing them.
// Lookups only visit the cells round a point and stop after a set number
// of holds; a way search stops after a set number of expansions.
//
const A = CAVE_CFG.haggy.anatomy
const P = CAVE_CFG.haggy.perf
//
// How far off the edge the body sits (see the anatomy in cave cfg): under
// a ceiling whose normal points down past CEIL_NY, over a top whose normal
// points up past TOP_NY, else on a side; where there is no room that far
// out, TIGHT_SHARES of it, so it gets through narrow places closer in.
// Behind the soil the body sits BEHIND_OUT px out from the edge (only
// where the soil is BEHIND_PROBE px deep, and never on a top: there it
// would sink into the ground); on the face, FACE_IN px inside
// the outline (only where soil lies FACE_ROOM px all round there). Out in
// the air the body needs BODY_R px of room and stays EDGE px inside the
// world.
//
const CEIL_NY = 0.5
const TOP_NY = 0.75
const TIGHT_SHARES = [1, 0.75, 0.55, 0.4]
const BODY_R = 26
const EDGE = 24
const BEHIND_PROBE = 14
const FACE_ROOM = 30
//
// The lake it keeps out of: its water's span LAKE_PAD px wider, from
// LAKE_OVER px over its surface down to LAKE_DEEP px under it, and the
// banks' hollows HOLLOW_PAD px wider.
//
const LAKE_PAD = 40
const LAKE_OVER = 80
const LAKE_DEEP = 320
const HOLLOW_PAD = 40
//
// Spacing: nodes, holds, the link test's steps and room, the lookup cells,
// and how many rings of cells a nearest-node lookup tries before it looks
// at every node. Two nodes are linked through the air only if their edge
// points lie within LINK_SPAN px (one and a half limbs: its hands can hold
// both edges at once, with room to spare).
//
const NODE_STEP = 28
const GRIP_STEP = 8
const LINK_MAX = 200
const LINK_SPAN = A.length * 1.5
const LINK_CHECK = 20
const LINK_ROOM = 18
const GRID = 64
const NEAREST_RINGS = 6
//
// A shown stretch of holds is cut into polylines of LINE_POINTS points.
//
const LINE_POINTS = 24
//
// A way search's queue holds at most this many entries per node.
//
const QUEUE_PER_NODE = 16

/**
 * Behind the soil, the body's distance out from the edge (px).
 */
export const BEHIND_OUT = 8

/**
 * On the soil's face, the body's distance in from the outline (px).
 */
export const FACE_IN = 55

let nav = null
let search = null

/**
 * The ways (built on first use, once per page).
 * @returns {Object} Nav: nodes, groups, the lookup cells, the holds' polylines (lines)
 */
export function get() {
  nav ??= build()
  return nav
}

/**
 * Collects the holds within r px of a point into `out` (reused), at most
 * `max` of them; only the cells round the point are visited.
 * @param {Object} n - Nav
 * @param {number} x - World X
 * @param {number} y - World Y
 * @param {number} r - Radius (px)
 * @param {Array<Object>} out - Receives the holds {x, y, nx, ny}
 * @param {number} max - Most holds collected
 * @returns {number} How many were collected
 */
export function gripsNear(n, x, y, r, out, max) {
  let count = 0
  const r2 = r * r
  const cx2 = Math.floor((x + r) / GRID)
  const cy2 = Math.floor((y + r) / GRID)
  for (let cy = Math.floor((y - r) / GRID); cy <= cy2; cy++) {
    for (let cx = Math.floor((x - r) / GRID); cx <= cx2; cx++) {
      const cell = n.grips.get(cellKey(cx, cy))
      if (!cell) continue
      for (let i = 0; i < cell.length; i++) {
        const g = cell[i]
        const dx = g.x - x
        const dy = g.y - y
        if (dx * dx + dy * dy > r2) continue
        out[count++] = g
        if (count >= max) return count
      }
    }
  }
  return count
}

/**
 * The node of a group nearest a point: the cells round it first, ring by
 * ring; every node of the group only if none is near.
 * @param {Object} n - Nav
 * @param {number} x - World X
 * @param {number} y - World Y
 * @param {number} group - Group id (-1: the biggest group)
 * @returns {Object|null} Node
 */
export function nearestNode(n, x, y, group) {
  const want = group < 0 ? n.biggest : group
  const cx = Math.floor(x / GRID)
  const cy = Math.floor(y / GRID)
  for (let ring = 0; ring <= NEAREST_RINGS; ring++) {
    const best = nearestInRing(n, x, y, want, cx, cy, ring)
    if (best) return best
  }
  return nearestOf(n.groups.get(want) ?? [], x, y)
}

/**
 * A node of a group picked at random.
 * @param {Object} n - Nav
 * @param {number} group - Group id
 * @param {() => number} rng - Random 0 … 1
 * @returns {Object|null} Node
 */
export function randomNode(n, group, rng) {
  const nodes = n.groups.get(group)
  return nodes?.length ? nodes[Math.floor(rng() * nodes.length)] : null
}

/**
 * The shortest way along the links from one node to another (Dijkstra on
 * a binary heap, the nodes' places' distance), written into `out`
 * (reused). Past maxExpansions expansions it gives up and goes as far as
 * the node it reached nearest the goal.
 * @param {Object} n - Nav
 * @param {Object} from - Start node
 * @param {Object} to - Goal node
 * @param {Array<Object>} out - Receives the way's nodes, start first
 * @returns {number} The way's node count (1: just the start)
 */
export function findWay(n, from, to, out) {
  const s = scratchFor(n)
  s.dist.fill(Infinity)
  s.prev.fill(-1)
  s.done.fill(0)
  s.dist[from.id] = 0
  s.size = 0
  push(s, from.id, 0)
  let best = from.id
  let bestD = vecLen(from.ox - to.ox, from.oy - to.oy)
  let expanded = 0
  while (s.size && expanded < P.maxExpansions) {
    const id = pop(s)
    if (s.done[id]) continue
    s.done[id] = 1
    expanded++
    const node = n.nodes[id]
    const left = vecLen(node.ox - to.ox, node.oy - to.oy)
    if (left < bestD) {
      best = id
      bestD = left
    }
    if (id === to.id) break
    relax(n, s, node)
  }
  let count = 0
  for (let id = best; id >= 0; id = s.prev[id]) count++
  out.length = count
  for (let id = best, i = count - 1; id >= 0; id = s.prev[id], i--) out[i] = n.nodes[id]
  return count
}

/**
 * Whether a point lies where the lake's water is (or close over it), or in
 * a bank's hollow: no way and no hold there.
 * @param {number} x - World X
 * @param {number} y - World Y
 * @returns {boolean}
 */
export function inLakeZone(x, y) {
  if (Layout.inHollow(x, y, HOLLOW_PAD)) return true
  return x > Layout.LAKE_X1 - LAKE_PAD && x < Layout.LAKE_X2 + LAKE_PAD && y > Layout.LAKE_SURFACE_Y - LAKE_OVER && y < Layout.LAKE_SURFACE_Y + LAKE_DEEP
}
//
// Builds the ways: holds and nodes along every crawl run, the links
// through the air, the groups, the lookup cells.
//
function build() {
  const nodes = []
  const grips = new Map()
  const lines = []
  const p = {}
  Surface.crawlRuns().forEach(run => {
    let stretch = []
    for (let s = 0; s < run.len; s += GRIP_STEP) {
      Surface.sample(run, s, p)
      if (inLakeZone(p.x, p.y)) {
        addLines(lines, stretch)
        stretch = []
        continue
      }
      addTo(grips, p.x, p.y, { x: p.x, y: p.y, nx: p.nx, ny: p.ny })
      stretch.push({ x: p.x, y: p.y })
    }
    addLines(lines, stretch)
    const count = Math.max(1, Math.floor(run.len / NODE_STEP))
    const own = []
    for (let i = 0; i < count + (run.closed ? 0 : 1); i++) {
      Surface.sample(run, i * run.len / count, p)
      own.push(nodeAt(p))
    }
    own.forEach((node, i) => {
      const next = own[i + 1] ?? (run.closed ? own[0] : null)
      node && nodes.push(node)
      node && next && next !== node && link(node, next)
    })
  })
  nodes.forEach((node, i) => { node.id = i })
  nodes.forEach((a, i) => {
    for (let j = i + 1; j < nodes.length; j++) {
      const b = nodes[j]
      const near = vecLen(a.ox - b.ox, a.oy - b.oy) <= LINK_MAX && vecLen(a.x - b.x, a.y - b.y) <= LINK_SPAN
      near && !a.links.includes(b) && isAirBetween(a, b) && link(a, b)
    }
  })
  const groups = markGroups(nodes)
  const cells = new Map()
  nodes.forEach(node => addTo(cells, node.ox, node.oy, node))
  let biggest = -1
  groups.forEach((members, id) => { (biggest < 0 || members.length > groups.get(biggest).length) && (biggest = id) })
  return { nodes, groups, grips, cells, biggest, lines }
}
//
// A stretch of holds as polylines of LINE_POINTS points (each starting on
// the last point of the one before), each with its box.
//
function addLines(lines, stretch) {
  for (let i = 0; i + 1 < stretch.length; i += LINE_POINTS - 1) {
    const pts = stretch.slice(i, i + LINE_POINTS)
    const xs = pts.map(pt => pt.x)
    const ys = pts.map(pt => pt.y)
    lines.push({ pts, x1: Math.min(...xs), y1: Math.min(...ys), x2: Math.max(...xs), y2: Math.max(...ys) })
  }
}
//
// A node at an outline point: where the body hangs out in the air off it
// (null without room there), and whether it may also go behind the edge
// or onto the face there.
//
function nodeAt(p) {
  const top = p.ny < -TOP_NY
  const full = top ? A.walkH : p.ny > CEIL_NY ? A.hangH : A.sideH
  const h = TIGHT_SHARES.map(share => full * share).find(off => hasRoom(p.x + p.nx * off, p.y + p.ny * off, BODY_R))
  if (!h) return null
  const bx = p.x + p.nx * BEHIND_OUT
  const by = p.y + p.ny * BEHIND_OUT
  return {
    id: -1,
    x: p.x,
    y: p.y,
    nx: p.nx,
    ny: p.ny,
    h,
    top,
    ox: p.x + p.nx * h,
    oy: p.y + p.ny * h,
    behind: !top && Surface.isSoil(p.x - p.nx * BEHIND_PROBE, p.y - p.ny * BEHIND_PROBE) && !inLakeZone(bx, by),
    face: isOnFace(p.x - p.nx * FACE_IN, p.y - p.ny * FACE_IN),
    links: [],
    group: -1
  }
}
//
// Whether the body has a face of soil to lie on at a point: soil there
// and FACE_ROOM px round it, inside the world, away from the lake.
//
function isOnFace(x, y) {
  if (x < FACE_ROOM || y < FACE_ROOM || x > Layout.WORLD_W - FACE_ROOM || y > Layout.WORLD_H - FACE_ROOM * 2 || inLakeZone(x, y)) return false
  return Surface.isSoil(x, y) && Surface.isSoil(x - FACE_ROOM, y) && Surface.isSoil(x + FACE_ROOM, y) && Surface.isSoil(x, y - FACE_ROOM) && Surface.isSoil(x, y + FACE_ROOM)
}
function hasRoom(x, y, r) {
  if (x < EDGE || y < EDGE || x > Layout.WORLD_W - EDGE || y > Layout.WORLD_H - EDGE) return false
  return !inLakeZone(x, y) && Surface.isOpenAir(x, y, r)
}
function link(a, b) {
  a.links.push(b)
  b.links.push(a)
}
function isAirBetween(a, b) {
  const steps = Math.ceil(vecLen(b.ox - a.ox, b.oy - a.oy) / LINK_CHECK)
  for (let i = 1; i < steps; i++) {
    const u = i / steps
    if (!hasRoom(a.ox + (b.ox - a.ox) * u, a.oy + (b.oy - a.oy) * u, LINK_ROOM)) return false
  }
  return true
}
//
// Gives every node its group (nodes that reach one another) and returns
// the groups' members by id.
//
function markGroups(nodes) {
  const groups = new Map()
  nodes.forEach(start => {
    if (start.group >= 0) return
    const id = groups.size
    const members = [start]
    start.group = id
    for (let i = 0; i < members.length; i++) {
      members[i].links.forEach(next => {
        if (next.group >= 0) return
        next.group = id
        members.push(next)
      })
    }
    groups.set(id, members)
  })
  return groups
}
function addTo(cells, x, y, item) {
  const key = cellKey(Math.floor(x / GRID), Math.floor(y / GRID))
  cells.has(key) || cells.set(key, [])
  cells.get(key).push(item)
}
function cellKey(cx, cy) {
  return cy * Layout.WORLD_W + cx
}
//
// The nearest node of a group in one square ring of cells round a cell.
//
function nearestInRing(n, x, y, group, cx, cy, ring) {
  let best = null
  let bestD = Infinity
  for (let gy = cy - ring; gy <= cy + ring; gy++) {
    for (let gx = cx - ring; gx <= cx + ring; gx++) {
      if (Math.max(Math.abs(gx - cx), Math.abs(gy - cy)) !== ring) continue
      const cell = n.cells.get(cellKey(gx, gy))
      if (!cell) continue
      for (let i = 0; i < cell.length; i++) {
        const node = cell[i]
        const d = node.group === group ? vecLen(node.ox - x, node.oy - y) : Infinity
        d < bestD && (best = node) && (bestD = d)
      }
    }
  }
  return best
}
function nearestOf(nodes, x, y) {
  let best = null
  let bestD = Infinity
  for (let i = 0; i < nodes.length; i++) {
    const d = vecLen(nodes[i].ox - x, nodes[i].oy - y)
    d < bestD && (best = nodes[i]) && (bestD = d)
  }
  return best
}
//
// The way search's buffers, made once for the nav's node count: each
// node's distance, previous node and done flag; the heap of (node,
// distance) entries.
//
function scratchFor(n) {
  if (search?.count === n.nodes.length) return search
  const cap = n.nodes.length * QUEUE_PER_NODE
  search = {
    count: n.nodes.length,
    dist: new Float64Array(n.nodes.length),
    prev: new Int32Array(n.nodes.length),
    done: new Uint8Array(n.nodes.length),
    heapId: new Int32Array(cap),
    heapD: new Float64Array(cap),
    size: 0
  }
  return search
}
function relax(n, s, node) {
  const base = s.dist[node.id]
  for (let i = 0; i < node.links.length; i++) {
    const next = node.links[i]
    const d = base + vecLen(next.ox - node.ox, next.oy - node.oy)
    if (d >= s.dist[next.id]) continue
    s.dist[next.id] = d
    s.prev[next.id] = node.id
    push(s, next.id, d)
  }
}
function push(s, id, d) {
  if (s.size >= s.heapId.length) return
  let i = s.size++
  while (i > 0) {
    const up = (i - 1) >> 1
    if (s.heapD[up] <= d) break
    s.heapId[i] = s.heapId[up]
    s.heapD[i] = s.heapD[up]
    i = up
  }
  s.heapId[i] = id
  s.heapD[i] = d
}
function pop(s) {
  const top = s.heapId[0]
  const lastId = s.heapId[--s.size]
  const lastD = s.heapD[s.size]
  let i = 0
  for (;;) {
    let c = i * 2 + 1
    if (c >= s.size) break
    c + 1 < s.size && s.heapD[c + 1] < s.heapD[c] && c++
    if (s.heapD[c] >= lastD) break
    s.heapId[i] = s.heapId[c]
    s.heapD[i] = s.heapD[c]
    i = c
  }
  s.heapId[i] = lastId
  s.heapD[i] = lastD
  return top
}
