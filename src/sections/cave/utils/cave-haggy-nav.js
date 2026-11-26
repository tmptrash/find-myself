import { vecLen } from '../../../utils/helper.js'
import { CAVE_CFG } from '../cfg.js'
import * as Layout from './cave-layout.js'
import * as Solid from './cave-haggy-solid.js'
import * as Surface from './cave-surface.js'
//
// The climber's ways through the cave (cave-haggy.js), built once per page
// from the outline of everything solid to it (cave-haggy-solid.js: the
// cave's walls, floor and ceiling and every floating ledge, all round —
// top, underside, sides, corners — and the stones, plants and mushroom on
// them, the pad plant's crown on the lake) and shared by every climber: never
// rebuilt, never scanned whole at run time.
// - Nodes: a body place every NODE_STEP px of the outline, out in the air
//   off it, linked along the outline and through the open air to nodes
//   within LINK_MAX px; each in a group of nodes that reach one another.
//   Nodes in an opening (soil across from their edge: a shaft such as the
//   cave's entrance, a niche, a gap by a ledge) are kept by group too.
// - Holds: an outline point every GRIP_STEP px (with its outward normal),
//   where a hand may hold; looked up in GRID px cells.
// Lookups only visit the cells round a point and stop after a set number
// of holds; a way search stops after a set number of expansions.
//
const A = CAVE_CFG.haggy.anatomy
const P = CAVE_CFG.haggy.perf
//
// How far off the edge the body sits (see the anatomy in cave cfg): under
// a ceiling whose normal points down past CEIL_NY, over a top whose normal
// points up past TOP_NY, else on a side; where there is no room that far
// out, in the middle of the shares of it that have room, down to
// TIGHT_MIN (tried every TIGHT_STEP), so it gets through narrow places —
// in a shaft, right in its middle (over a top only all of it: it never
// walks crouched low — where there is no room to stand it hangs or goes
// by a side). The body needs room for its head, never smaller than it
// is (anatomy.head, HEAD_PAD_Y px taller: it bobs that much; nothing
// solid at its middle nor round the ellipse, ROOM_POINTS points about
// it): upright, or — off a top, where it climbs — turned along its way
// (it looks where it climbs: up a shaft, or slanting between two ledges,
// its head is no wider across the way than it is tall). A node is tried
// with its head turned every TURN_STEP rad; a link, with its head along
// the link. A node with no room upright, or at either end of a link
// without, is `turned`. It stays EDGE px inside the world.
//
const CEIL_NY = 0.5
const TOP_NY = 0.4
const TIGHT_MIN = 0.3
const TIGHT_STEP = 0.02
const HALF = 0.5
const HEAD = A.head
const ROOM_POINTS = 12
const HEAD_PAD_Y = 2
const ROOM = Array.from({ length: ROOM_POINTS }, (_, i) => [Math.cos(i / ROOM_POINTS * Math.PI * 2) * HEAD.rx, Math.sin(i / ROOM_POINTS * Math.PI * 2) * (HEAD.ry + HEAD_PAD_Y)])
const TURN_STEP = Math.PI / 8
const TURNS = Array.from({ length: Math.round(Math.PI / TURN_STEP) - 1 }, (_, i) => turnedRoom((i + 1) * TURN_STEP))
const EDGE = 24
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
// Spacing: nodes, holds, the link test's steps (room for the head at
// each) and the step its line is checked for soil at, the lookup cells,
// and how many rings of cells a nearest-node lookup tries before it looks
// at every node. Two nodes are linked through the air only if their edge
// points lie within LINK_SPAN px (one and a half limbs: its hands can hold
// both edges at once, with room to spare).
//
const NODE_STEP = 28
const GRIP_STEP = 8
const LINK_MAX = 200
const LINK_SPAN = A.length * 1.5
const LINK_CHECK = 8
const LINK_LINE = 4
const GRID = 64
const NEAREST_RINGS = 6
//
// An opening (a shaft, a niche, a gap between a ledge and a wall): a node
// whose edge has soil across from it, straight out along its normal,
// between NARROW_FROM px (past the edge's own bumps) and NARROW_SPAN px,
// looked for every NARROW_STEP px.
//
const NARROW_FROM = 30
const NARROW_SPAN = 170
const NARROW_STEP = 6
//
// A way search's queue holds at most this many entries per node.
//
const QUEUE_PER_NODE = 16
let nav = null
let search = null

/**
 * The ways (built on first use, once per page).
 * @returns {Object} Nav: nodes, groups, the openings' nodes by group, the lookup cells
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
  return pick(n.groups.get(group), rng)
}

/**
 * A node of a group in an opening (a shaft, a niche, a narrow gap: soil
 * across from its edge) picked at random; with no such node in the group,
 * any node of it.
 * @param {Object} n - Nav
 * @param {number} group - Group id
 * @param {() => number} rng - Random 0 … 1
 * @returns {Object|null} Node
 */
export function openingNode(n, group, rng) {
  return pick(n.openings.get(group), rng) ?? pick(n.groups.get(group), rng)
}

/**
 * The node of a group to make for to get at a spot (prey found there):
 * the nearest one within `reach` px of the spot whose place has a clear
 * line to it (so it is not the far side of a wall); with none, just the
 * nearest. Only the cells round the spot are visited.
 * @param {Object} n - Nav
 * @param {number} x - World X of the spot
 * @param {number} y - World Y of the spot
 * @param {number} group - Group id
 * @param {number} reach - How far from the spot a node may lie (px)
 * @returns {Object|null} Node
 */
export function goalNode(n, x, y, group, reach) {
  let best = null
  let bestD = reach
  const cx2 = Math.floor((x + reach) / GRID)
  const cy2 = Math.floor((y + reach) / GRID)
  for (let cy = Math.floor((y - reach) / GRID); cy <= cy2; cy++) {
    for (let cx = Math.floor((x - reach) / GRID); cx <= cx2; cx++) {
      const cell = n.cells.get(cellKey(cx, cy))
      if (!cell) continue
      for (let i = 0; i < cell.length; i++) {
        const node = cell[i]
        const d = node.group === group ? vecLen(node.ox - x, node.oy - y) : Infinity
        if (d >= bestD || !isLineClear(node.ox, node.oy, x, y)) continue
        best = node
        bestD = d
      }
    }
  }
  return best ?? nearestNode(n, x, y, group)
}

/**
 * The shortest way along the links from one node to another (A* on a
 * binary heap: the nodes' places' distance, the straight way left as its
 * guess), written into `out` (reused). It goes round whatever lies
 * between — away from the goal first, if that is the way. A node within
 * `avoidR` px of the avoided spot counts avoidCost px farther (0: none
 * avoided). Past maxExpansions expansions it gives up and goes as far as
 * the node it reached nearest the goal.
 * @param {Object} n - Nav
 * @param {Object} from - Start node
 * @param {Object} to - Goal node
 * @param {Array<Object>} out - Receives the way's nodes, start first
 * @param {{x: number, y: number, r: number, cost: number}} avoid - A spot to keep clear of (r 0: none)
 * @returns {number} The way's node count (1: just the start)
 */
export function findWay(n, from, to, out, avoid) {
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
    relax(s, node, to, avoid)
  }
  let count = 0
  for (let id = best; id >= 0; id = s.prev[id]) count++
  out.length = count
  for (let id = best, i = count - 1; id >= 0; id = s.prev[id], i--) out[i] = n.nodes[id]
  return count
}

/**
 * Whether a point lies where the lake's water is (or close over it), or in
 * a bank's hollow: no way and no hold there — but over the pad plant's
 * crown of leaves (solid ground on the water).
 * @param {number} x - World X
 * @param {number} y - World Y
 * @returns {boolean}
 */
export function inLakeZone(x, y) {
  if (Layout.inHollow(x, y, HOLLOW_PAD)) return true
  if (Solid.isOverPads(x, y)) return false
  return x > Layout.LAKE_X1 - LAKE_PAD && x < Layout.LAKE_X2 + LAKE_PAD && y > Layout.LAKE_SURFACE_Y - LAKE_OVER && y < Layout.LAKE_SURFACE_Y + LAKE_DEEP
}

/**
 * Whether a point is in the water: the lake under its surface, or a
 * bank's hollow.
 * @param {number} x - World X
 * @param {number} y - World Y
 * @returns {boolean}
 */
export function inWater(x, y) {
  if (Layout.inHollow(x, y, 0)) return true
  return x > Layout.LAKE_X1 && x < Layout.LAKE_X2 && y > Layout.LAKE_SURFACE_Y && y < Layout.LAKE_SURFACE_Y + LAKE_DEEP
}
//
// Builds the ways: holds and nodes along every crawl run, each node
// linked to the next along its run (where the body can go straight
// between them: past a node with no room, nothing links across the gap)
// and through the air, the groups, the lookup cells.
//
function build() {
  const nodes = []
  const grips = new Map()
  const p = {}
  Solid.runs().forEach(run => {
    for (let s = 0; s < run.len; s += GRIP_STEP) {
      Surface.sample(run, s, p)
      inLakeZone(p.x, p.y) || addTo(grips, p.x, p.y, { x: p.x, y: p.y, nx: p.nx, ny: p.ny })
    }
    const count = Math.max(1, Math.floor(run.len / NODE_STEP))
    const own = []
    for (let i = 0; i < count + (run.closed ? 0 : 1); i++) {
      Surface.sample(run, i * run.len / count, p)
      own.push(nodeAt(p))
    }
    own.forEach((node, i) => {
      const next = i + 1 < own.length ? own[i + 1] : run.closed ? own[0] : null
      node && nodes.push(node)
      node && next && next !== node && isAirBetween(node, next) && link(node, next)
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
  const openings = new Map()
  groups.forEach((members, id) => openings.set(id, members.filter(node => node.narrow)))
  const cells = new Map()
  nodes.forEach(node => addTo(cells, node.ox, node.oy, node))
  let biggest = -1
  groups.forEach((members, id) => { (biggest < 0 || members.length > groups.get(biggest).length) && (biggest = id) })
  return { nodes, groups, openings, grips, cells, biggest }
}
//
// A node at an outline point: where the body hangs out in the air off it
// (null without room there).
//
function nodeAt(p) {
  const top = p.ny < -TOP_NY
  const full = top ? A.walkH : p.ny > CEIL_NY ? A.hangH : A.sideH
  const ux = top ? 0 : p.nx
  const uy = top ? -1 : p.ny
  const h = roomOff(p, ux, uy, full, top ? 1 : TIGHT_MIN, top)
  if (!h) return null
  const ox = p.x + ux * h
  const oy = p.y + uy * h
  return {
    id: -1,
    x: p.x,
    y: p.y,
    nx: p.nx,
    ny: p.ny,
    h,
    top,
    ox,
    oy,
    narrow: isNarrow(p),
    turned: !hasRoom(ox, oy, true),
    links: [],
    group: -1
  }
}
//
// How far out from an outline point the body sits (along ux, uy: its
// normal, or straight up over a top — a bumpy top of plants and stones
// tilts its normals, never the way it stands): all of `full` where it
// has room there; else, in a narrow place, in the middle of the shares
// (between `least` and 1) that have room — clear of both sides, so the
// ways between such places keep clear too (0: none). Over a top only
// room for the head upright counts (`upright`: it walks there).
//
function roomOff(p, ux, uy, full, least, upright) {
  let far = 0
  for (let share = 1; share >= least - TIGHT_STEP * HALF && !far; share -= TIGHT_STEP) {
    hasRoom(p.x + ux * full * share, p.y + uy * full * share, upright) && (far = share)
  }
  if (far >= 1 - TIGHT_STEP * HALF || !far) return far * full
  let near = far
  for (let share = least; share < far; share += TIGHT_STEP) {
    if (hasRoom(p.x + ux * full * share, p.y + uy * full * share, upright)) {
      near = share
      break
    }
  }
  return (far + near) * HALF * full
}
//
// Whether an outline point lies in an opening: soil across from it.
//
function isNarrow(p) {
  for (let d = NARROW_FROM; d <= NARROW_SPAN; d += NARROW_STEP) {
    if (Solid.isSolid(Math.round(p.x + p.nx * d), Math.round(p.y + p.ny * d))) return true
  }
  return false
}
function pick(nodes, rng) {
  return nodes?.length ? nodes[Math.floor(rng() * nodes.length)] : null
}
//
// Whether the head has room at a point: upright, or (unless `upright`
// only) turned any of its turns — or, given one (`room`), just that way.
//
function hasRoom(x, y, upright = false, room = null) {
  if (x < EDGE || y < EDGE || x > Layout.WORLD_W - EDGE || y > Layout.WORLD_H - EDGE) return false
  if (inLakeZone(x, y) || Solid.isSolid(Math.round(x), Math.round(y))) return false
  if (isRoomy(x, y, ROOM) || (room && isRoomy(x, y, room))) return true
  return !upright && !room && TURNS.some(turn => isRoomy(x, y, turn))
}
//
// The head's room turned by `angle` rad.
//
function turnedRoom(angle) {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  return ROOM.map(([dx, dy]) => [dx * c - dy * s, dx * s + dy * c])
}
function isRoomy(x, y, room) {
  return room.every(([dx, dy]) => !Solid.isSolid(Math.round(x + dx), Math.round(y + dy)) && !inWater(x + dx, y + dy))
}
function link(a, b) {
  a.links.push(b)
  b.links.push(a)
}
//
// Whether the body can go straight from one node's place to another's
// (its head upright, or turned along the way where it must be: both ends
// are then `turned`):
// room for it every LINK_CHECK px, and no soil on the line itself every
// LINK_LINE px (so no ledge thinner than the room checks' spacing lies
// across the way unseen).
//
function isAirBetween(a, b) {
  const d = vecLen(b.ox - a.ox, b.oy - a.oy)
  const steps = Math.ceil(d / LINK_CHECK)
  const along = turnedRoom(Math.atan2(b.oy - a.oy, b.ox - a.ox))
  let turned = false
  for (let i = 1; i < steps; i++) {
    const u = i / steps
    const x = a.ox + (b.ox - a.ox) * u
    const y = a.oy + (b.oy - a.oy) * u
    if (hasRoom(x, y, true)) continue
    if (!hasRoom(x, y, false, along)) return false
    turned = true
  }
  const fine = Math.ceil(d / LINK_LINE)
  for (let i = 1; i < fine; i++) {
    const u = i / fine
    if (Solid.isSolid(Math.round(a.ox + (b.ox - a.ox) * u), Math.round(a.oy + (b.oy - a.oy) * u))) return false
  }
  turned && (a.turned = b.turned = true)
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
//
// A node's links tried: each linked node reached by a shorter way than it
// had is queued by that way's length plus the straight way left to the
// goal; a node by the avoided spot counts farther.
//
function relax(s, node, to, avoid) {
  const base = s.dist[node.id]
  for (let i = 0; i < node.links.length; i++) {
    const next = node.links[i]
    const shun = avoid.r > 0 && vecLen(next.ox - avoid.x, next.oy - avoid.y) < avoid.r ? avoid.cost : 0
    const d = base + vecLen(next.ox - node.ox, next.oy - node.oy) + shun
    if (d >= s.dist[next.id]) continue
    s.dist[next.id] = d
    s.prev[next.id] = node.id
    push(s, next.id, d + vecLen(next.ox - to.ox, next.oy - to.oy))
  }
}
//
// Whether the straight line between two points is clear of soil and
// water (checked every LINK_CHECK px; its last stretch, at the far point,
// is not: prey may stand right on the soil).
//
function isLineClear(ax, ay, bx, by) {
  const steps = Math.ceil(vecLen(bx - ax, by - ay) / LINK_CHECK)
  for (let i = 1; i < steps; i++) {
    const u = i / steps
    const x = ax + (bx - ax) * u
    const y = ay + (by - ay) * u
    if (Solid.isSolid(x, y) || inWater(x, y)) return false
  }
  return true
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
