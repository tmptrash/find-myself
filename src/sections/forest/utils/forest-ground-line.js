import * as HeroLegs from '../../../utils/hero-legs.js'
//
// The forest level's ground line for the hero's feet. By default it follows
// the ground's own uneven surface (the soil lip and lumps painted along the
// ground's top edge, see addGround). A piece lying on the ground that is no
// taller than the top of the hero's leg (HeroLegs.LEG_TOP_HEIGHT, measured
// from the ground line floorY) bulges the line up with its own contour —
// moss and litter cushions, small stones. A taller piece has no say in the
// line at all — not even over the low pieces it stands next to or in front
// of — so without low pieces under it the line stays on the ground's own
// surface.
//
// Everything is worked out in advance: each picture is scanned once into a
// profile (the top of its solid silhouette per world column, SOLID_ALPHA and
// up counting as solid), only lightly evened out (each column with its
// SMOOTH_R neighbours). raycast() lands a foot on the highest point of the
// line under its sole (FOOT_SUPPORT_HALF px either side). A piece tied to a
// game object counts only while the object is shown (stones hidden until
// their ground strip opens).
//
// Profiles are bucketed by BUCKET_W world px so a ray only looks at the
// pieces near it.
//
const SOLID_ALPHA = 128
const BUCKET_W = 64
const RGBA = 4
const MAX_HEIGHT = HeroLegs.LEG_TOP_HEIGHT
const SMOOTH_R = 1
const FOOT_SUPPORT_HALF = 3
const KIND = { GROUND: 'ground', PIECE: 'piece' }

/**
 * Creates an empty ground line.
 * @param {number} floorY - World Y of the ground's top edge (pieces' heights are measured from it)
 * @returns {Object} Ground line inst
 */
export function create(floorY) {
  return { floorY, buckets: new Map() }
}

/**
 * Lays in a stretch of the ground's own surface (always part of the line).
 * @param {Object} inst - Ground line inst
 * @param {HTMLCanvasElement} canvas - The surface's picture
 * @param {number} left - World X of the picture's left edge
 * @param {number} top - World Y of the picture's top edge
 */
export function addGround(inst, canvas, left, top) {
  const scan = scanPicture(inst, canvas, top)
  scan && addEntry(inst, { kind: KIND.GROUND, x1: Math.round(left), tops: evened(scan.tops), obj: null })
}

/**
 * Lays in a piece lying on the ground: a low one bulges the line up with its
 * contour, a taller one (over a hero's leg) is left out.
 * @param {Object} inst - Ground line inst
 * @param {HTMLCanvasElement} canvas - The piece's picture
 * @param {number} left - World X of the picture's left edge
 * @param {number} top - World Y of the picture's top edge
 * @param {Object} [obj=null] - Game object the piece belongs to (counts only while shown)
 * @returns {boolean} Whether it bulges the line (is low enough)
 */
export function addPiece(inst, canvas, left, top, obj = null) {
  const scan = scanPicture(inst, canvas, top)
  if (!scan || inst.floorY - scan.highest > MAX_HEIGHT) return false
  addEntry(inst, { kind: KIND.PIECE, x1: Math.round(left), tops: evened(scan.tops), obj })
  return true
}

/**
 * Whether a piece's picture is low enough to bulge the line (no taller than
 * a hero's leg over the ground).
 * @param {Object} inst - Ground line inst
 * @param {HTMLCanvasElement} canvas - The piece's picture
 * @param {number} top - World Y of the picture's top edge
 * @returns {boolean}
 */
export function isLowPiece(inst, canvas, top) {
  const scan = scanPicture(inst, canvas, top)
  return Boolean(scan) && inst.floorY - scan.highest <= MAX_HEIGHT
}

/**
 * Casts a ray straight down onto the ground line: the highest point of the
 * line under a foot's sole round x, between fromY and fromY + depth; null
 * when none (the level's flat platform is under it all).
 * @param {Object} inst - Ground line inst
 * @param {number} x - World X
 * @param {number} fromY - Ray start Y
 * @param {number} depth - Ray length (px, downwards)
 * @returns {number|null} Surface Y
 */
export function raycast(inst, x, fromY, depth) {
  let best = null
  for (let col = Math.round(x) - FOOT_SUPPORT_HALF; col <= Math.round(x) + FOOT_SUPPORT_HALF; col++) {
    const y = surfaceAt(inst, col)
    if (y === null || y < fromY || y > fromY + depth) continue
    best = best === null ? y : Math.min(best, y)
  }
  return best
}

//
// The line over one world column: the highest of the ground's surface and
// the shown low pieces there.
//
function surfaceAt(inst, col) {
  const entries = inst.buckets.get(Math.floor(col / BUCKET_W))
  if (!entries) return null
  let best = null
  for (const e of entries) {
    if (!isShown(e)) continue
    const y = e.tops[col - e.x1]
    if (y === undefined || y === Infinity) continue
    best = best === null ? y : Math.min(best, y)
  }
  return best
}
function isShown(entry) {
  return !entry.obj || (!entry.obj.hidden && entry.obj.exists?.())
}
function addEntry(inst, entry) {
  const first = Math.floor(entry.x1 / BUCKET_W)
  const last = Math.floor((entry.x1 + entry.tops.length - 1) / BUCKET_W)
  for (let b = first; b <= last; b++) {
    inst.buckets.has(b) ? inst.buckets.get(b).push(entry) : inst.buckets.set(b, [entry])
  }
}
//
// One picture read once: per column the top of its solid silhouette above
// the ground line (Infinity where none) and its highest point. Null when
// nothing solid rises above the ground line.
//
function scanPicture(inst, canvas, top) {
  const w = canvas.width
  const h = canvas.height
  if (!w || !h) return null
  const px = canvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data
  const tops = new Float32Array(w).fill(Infinity)
  let highest = Infinity
  for (let x = 0; x < w; x++) {
    let first = 0
    while (first < h && px[(first * w + x) * RGBA + 3] < SOLID_ALPHA) first++
    if (first === h || top + first >= inst.floorY) continue
    tops[x] = top + first
    highest = Math.min(highest, top + first)
  }
  return highest === Infinity ? null : { tops, highest }
}
//
// Each solid column's top averaged with its solid neighbours within
// SMOOTH_R — only the pixel steps soften, the contour stays.
//
function evened(raw) {
  const out = new Float32Array(raw.length).fill(Infinity)
  raw.forEach((y, x) => {
    if (y === Infinity) return
    let sum = 0
    let n = 0
    for (let d = -SMOOTH_R; d <= SMOOTH_R; d++) {
      const v = raw[x + d]
      if (v === undefined || v === Infinity) continue
      sum += v
      n++
    }
    out[x] = sum / n
  })
  return out
}
