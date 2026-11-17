import * as Layout from './cave-layout.js'
import * as Platform from './cave-platform.js'
//
// The line the hero walks: for every platform the top of its own art as
// drawn — the soil's lumpy top with the stones half sunk in it, the top of
// a small soil platform (cave-platform.js) with its pebbles — scanned once
// off its layer into one continuous line, a world Y per world column. No
// invisible platforms stand on it: the hero's feet are raycast onto this
// line (raycast()), and his body rests on its walking version
// (walkUnder()): under each column the highest point his feet span
// (WALK_HALF_W either side, so he stands on the bumps under his soles, not
// in the cracks between them), lightly evened and never steeper than
// WALK_MAX_SLOPE, so a step up a stone's edge is a quick climb, not a
// jolt. It reaches only EDGE_REACH px past the art's ends: off a
// platform's edge with his inner foot no longer over it, he falls.
//
const WALK_HALF_W = 9
const WALK_SMOOTH = 5
const EDGE_REACH = 6
//
// The walking line never climbs or drops steeper than this (px per px):
// a stone's tall edge becomes a short ramp up to it (the feet still land
// on the edge itself).
//
const WALK_MAX_SLOPE = 0.6
const WALK_SINK_MAX = 1
//
// A falling hero is caught only with at least this much of him over the
// platform: his centre at most CATCH_OVERHANG px past a line's end.
//
const CATCH_OVERHANG = EDGE_REACH
//
// A foot lands on the highest point under its sole (this many px either
// side), like the forest's ground line.
//
const FOOT_SUPPORT_HALF = 3
//
// Holes in the scan narrower than this (px) are bridged; a pixel this
// opaque is solid.
//
const GAP_FILL = 3
const TRIM_LOOK = 30
const TRIM_DROP = 12
const SOLID_ALPHA = 128
const RGBA = 4
const ALPHA_OFFSET = 3
//
// A respawn keeps the hero this far from the ends of the line.
//
const STAND_EDGE_PAD = 28
const lines = new Map()

/**
 * A ray straight down onto the platforms: the highest point of any platform's
 * line under a foot's sole round x, between fromY and fromY + depth; null
 * when there is none (Hero.setSurfaceRay).
 * @param {number} x - World X
 * @param {number} fromY - Ray start Y
 * @param {number} depth - Ray length (px, downwards)
 * @returns {number|null} Surface Y
 */
export function raycast(x, fromY, depth) {
  let best = null
  Layout.PLATFORMS.forEach(p => {
    const line = lineOf(p)
    for (let c = Math.round(x) - FOOT_SUPPORT_HALF; c <= Math.round(x) + FOOT_SUPPORT_HALF; c++) {
      const y = line.raw[c - line.x0]
      if (y === undefined || Number.isNaN(y) || y < fromY || y > fromY + depth) continue
      best = best === null ? y : Math.min(best, y)
    }
  })
  return best
}

/**
 * Where a falling hero's body comes to rest at X: the highest walking line
 * point of any platform between fromY and toY (his centre no farther than
 * CATCH_OVERHANG past its ends), with that line's ends.
 * @param {number} x - Hero X
 * @param {number} fromY - Highest Y that counts
 * @param {number} toY - Lowest Y that counts
 * @returns {{platform: Object, y: number, x1: number, x2: number}|null}
 */
export function walkUnder(x, fromY, toY) {
  let best = null
  Layout.PLATFORMS.forEach(p => {
    const line = lineOf(p)
    const y = line.walk[Math.round(x) - line.walkX0]
    if (x < line.x1 - CATCH_OVERHANG || x > line.x2 + CATCH_OVERHANG) return
    if (y === undefined || Number.isNaN(y) || y < fromY || y > toY || (best && y >= best.y)) return
    best = { platform: p, y, x1: line.x1, x2: line.x2 }
  })
  return best
}

/**
 * The walking line of a platform at X (null past its ends).
 * @param {Object} p - PLATFORMS entry
 * @param {number} x - Hero X
 * @returns {number|null}
 */
export function walkOn(p, x) {
  const line = lineOf(p)
  const y = line.walk[Math.round(x) - line.walkX0]
  return y === undefined || Number.isNaN(y) ? null : y
}

/**
 * The art's top of a platform at X (its line; the knots off its ends).
 * @param {Object} p - PLATFORMS entry
 * @param {number} x - World X
 * @returns {number}
 */
export function topAt(p, x) {
  const line = lineOf(p)
  const y = line.raw[Math.round(x) - line.x0]
  return y === undefined || Number.isNaN(y) ? Layout.topAt(p, x) : y
}

/**
 * Respawn pose standing on a platform, kept clear of its ends and the
 * walls, his body on its walking line.
 * @param {Object} p - PLATFORMS entry
 * @param {number} x - Preferred X
 * @returns {{x: number, y: number}}
 */
export function standPoseOn(p, x) {
  const line = lineOf(p)
  const minX = Math.max(line.x1, p.x1, Layout.WALL_COLLIDE_W) + STAND_EDGE_PAD
  const maxX = Math.min(line.x2, p.x2, Layout.WORLD_W - Layout.WALL_COLLIDE_W) - STAND_EDGE_PAD
  const sx = Math.round(Math.max(minX, Math.min(maxX, x)))
  const y = line.walk[sx - line.walkX0]
  return { x: sx, y: (Number.isNaN(y) ? topAt(p, sx) : y) - Layout.HERO_FEET_DY }
}
//
// A platform's line, scanned once per page: the raw top, then its
// walking version.
//
function lineOf(p) {
  if (lines.has(p.id)) return lines.get(p.id)
  const raw = scanLayer(Platform.layerOf(p))
  clipToSpan(raw, p)
  trimEnds(raw.tops)
  bridgeGaps(raw.tops)
  const walk = walkLine(raw.tops)
  const first = raw.tops.findIndex(y => !Number.isNaN(y))
  const last = raw.tops.findLastIndex(y => !Number.isNaN(y))
  const line = { x0: raw.x0, raw: raw.tops, x1: raw.x0 + first, x2: raw.x0 + last, walkX0: raw.x0 - WALK_HALF_W, walk }
  lines.set(p.id, line)
  return line
}
//
// The platform's top as drawn: the first solid pixel down each column of
// its layer (one read of a canvas made for reading back).
//
function scanLayer(layer) {
  const { width: w, height: h } = layer.canvas
  const data = layer.ctx.getImageData(0, 0, w, h).data
  const tops = new Float32Array(w).fill(NaN)
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      if (data[(y * w + x) * RGBA + ALPHA_OFFSET] < SOLID_ALPHA) continue
      tops[x] = layer.y + y
      break
    }
  }
  return { x0: layer.x, tops }
}
//
// Only the platform's own span is walked: art past its ends (a ledge's
// soil running on under the mass beside it) is not.
//
function clipToSpan(raw, p) {
  raw.tops.forEach((_, c) => (raw.x0 + c < p.x1 || raw.x0 + c > p.x2) && (raw.tops[c] = NaN))
}
//
// A line's ends where its side drops away (a free end's rounded corner,
// the sides of a stone platform): columns more than TRIM_DROP under the
// top TRIM_LOOK px further in are cut off, from each end inward.
//
function trimEnds(tops) {
  const first = tops.findIndex(y => !Number.isNaN(y))
  const last = tops.findLastIndex(y => !Number.isNaN(y))
  for (let c = first; c <= last && tops[c] > (tops[c + TRIM_LOOK] ?? Infinity) + TRIM_DROP; c++) tops[c] = NaN
  for (let c = last; c >= first && tops[c] > (tops[c - TRIM_LOOK] ?? Infinity) + TRIM_DROP; c--) tops[c] = NaN
}
//
// Narrow holes in a scanned line take the higher of their two sides.
//
function bridgeGaps(tops) {
  for (let c = 1; c < tops.length; c++) {
    if (!Number.isNaN(tops[c]) || Number.isNaN(tops[c - 1])) continue
    let end = c
    while (end < tops.length && Number.isNaN(tops[end])) end++
    if (end < tops.length && end - c <= GAP_FILL) tops.fill(Math.min(tops[c - 1], tops[end]), c, end)
    c = end
  }
}
//
// The walking line over the raw one: the highest point within WALK_HALF_W
// either side, then evened over WALK_SMOOTH either side and its slope
// limited — but never more than WALK_SINK_MAX px under the highest point
// under his feet (so it never sinks into the ground before a drop, the
// lake's bank); nothing farther than EDGE_REACH past the art's ends.
//
function walkLine(tops) {
  const n = tops.length + WALK_HALF_W * 2
  const high = new Float32Array(n).fill(NaN)
  for (let c = 0; c < n; c++) {
    for (let d = -WALK_HALF_W; d <= WALK_HALF_W; d++) {
      const y = tops[c - WALK_HALF_W + d]
      if (y === undefined || Number.isNaN(y)) continue
      high[c] = Number.isNaN(high[c]) ? y : Math.min(high[c], y)
    }
  }
  const walk = new Float32Array(n).fill(NaN)
  for (let c = 0; c < n; c++) {
    if (Number.isNaN(high[c])) continue
    let sum = 0
    let count = 0
    for (let d = -WALK_SMOOTH; d <= WALK_SMOOTH; d++) {
      const y = high[c + d]
      if (y === undefined || Number.isNaN(y)) continue
      sum += y
      count++
    }
    walk[c] = sum / count
  }
  limitSlope(walk)
  walk.forEach((y, c) => Number.isNaN(y) || (walk[c] = Math.min(y, high[c] + WALK_SINK_MAX)))
  clipToReach(walk, tops)
  return walk
}
//
// The walking line only over the art and EDGE_REACH px past it (walk
// column c lies over raw column c - WALK_HALF_W).
//
function clipToReach(walk, tops) {
  for (let c = 0; c < walk.length; c++) {
    let near = false
    for (let d = -EDGE_REACH; d <= EDGE_REACH && !near; d++) {
      const y = tops[c - WALK_HALF_W + d]
      near = y !== undefined && !Number.isNaN(y)
    }
    near || (walk[c] = NaN)
  }
}
//
// Lowers the walking line where it climbs steeper than WALK_MAX_SLOPE,
// coming from either side.
//
function limitSlope(walk) {
  for (let c = 1; c < walk.length; c++) {
    Number.isNaN(walk[c]) || Number.isNaN(walk[c - 1]) || (walk[c] = Math.max(walk[c], walk[c - 1] - WALK_MAX_SLOPE))
  }
  for (let c = walk.length - 2; c >= 0; c--) {
    Number.isNaN(walk[c]) || Number.isNaN(walk[c + 1]) || (walk[c] = Math.max(walk[c], walk[c + 1] - WALK_MAX_SLOPE))
  }
}
