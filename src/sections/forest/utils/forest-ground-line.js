import { CFG } from '../../../cfg.js'
import * as HeroLegs from '../../../utils/hero-legs.js'
import { getRGB } from '../../../utils/helper.js'
//
// The forest level's ground line for the hero's feet. By default it follows
// the ground's own uneven surface (the soil lip and lumps painted along the
// ground's top edge, see addGround). A piece lying on the ground that is no
// taller than the top of the hero's leg (HeroLegs.LEG_TOP_HEIGHT, measured
// from the ground line floorY) bulges the line up with its own contour —
// moss and litter cushions, small stones. A taller piece never shapes the
// line itself.
//
// Only what shows counts: every picture laid in (the ground's surface, low
// and tall pieces alike) keeps its solid mask, draw z and the order it was
// laid in (seq — pictures at one z draw in that order), and a low piece or
// the ground's surface shapes the line over a column only where its top
// pixel there is not covered by a shown picture drawn over it (a moss
// cushion behind a big stone does not lift the line). Where nothing that
// shapes the line shows, the line drops to the ground line (the level's flat
// platform).
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
const WALKER_RAY_PAD = 4
const KIND = { GROUND: 'ground', PIECE: 'piece', COVER: 'cover' }
//
// TEMPORARY debug: with DEBUG_DRAW on, the level draws the line in red
// (DEBUG_LINE_W px) over everything. Set it to false to hide the line;
// remove this block, drawDebug() and the pass in level0.js (search
// "TEMPORARY") with CFG.visual.colors.debugGroundLine when no longer needed.
//
export const DEBUG_DRAW = false
const DEBUG_LINE_W = 1

/**
 * Creates an empty ground line.
 * @param {number} floorY - World Y of the ground's top edge (pieces' heights are measured from it)
 * @returns {Object} Ground line inst
 */
export function create(floorY) {
  return { floorY, buckets: new Map(), seq: 0 }
}

/**
 * Lays in a stretch of the ground's own surface (part of the line wherever
 * it shows).
 * @param {Object} inst - Ground line inst
 * @param {HTMLCanvasElement} canvas - The surface's picture
 * @param {number} left - World X of the picture's left edge
 * @param {number} top - World Y of the picture's top edge
 * @param {number} z - Its draw z
 */
export function addGround(inst, canvas, left, top, z) {
  const scan = scanPicture(inst, canvas, top)
  scan && addEntry(inst, scan, left, top, { kind: KIND.GROUND, tops: evened(scan.tops), z, obj: null })
}

/**
 * Lays in a piece lying on the ground: a low one bulges the line up with its
 * contour where it shows, a taller one (over a hero's leg) only hides what
 * it is drawn over.
 * @param {Object} inst - Ground line inst
 * @param {HTMLCanvasElement} canvas - The piece's picture
 * @param {number} left - World X of the picture's left edge
 * @param {number} top - World Y of the picture's top edge
 * @param {number} z - Its draw z
 * @param {Object} [obj=null] - Game object the piece belongs to (counts only while shown)
 * @returns {boolean} Whether it bulges the line (is low enough)
 */
export function addPiece(inst, canvas, left, top, z, obj = null) {
  const scan = scanPicture(inst, canvas, top)
  if (!scan) return false
  const low = inst.floorY - scan.highest <= MAX_HEIGHT
  addEntry(inst, scan, left, top, { kind: low ? KIND.PIECE : KIND.COVER, tops: low ? evened(scan.tops) : null, z, obj })
  return low
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

/**
 * Surface Y under a world X for a walker other than the hero (the apple
 * bug, the crawler): a ray cast with raycast() from above the tallest thing
 * that bulges the line down to a little under the ground line.
 * @param {Object} inst - Ground line inst
 * @param {number} x - World X
 * @param {number} flatY - Surface Y where the line has nothing (the walker's flat ground)
 * @returns {number} Surface Y
 */
export function surfaceY(inst, x, flatY) {
  const fromY = inst.floorY - MAX_HEIGHT - WALKER_RAY_PAD
  return raycast(inst, x, fromY, MAX_HEIGHT + WALKER_RAY_PAD * 2) ?? flatY
}

/**
 * TEMPORARY debug: draws the ground line across [x1, x2] in red.
 * @param {Object} inst - Ground line inst
 * @param {Object} k - Kaplay instance
 * @param {number} x1 - Left world X to draw from
 * @param {number} x2 - Right world X to draw to
 */
export function drawDebug(inst, k, x1, x2) {
  const color = getRGB(k, CFG.visual.colors.debugGroundLine)
  const pts = []
  for (let x = Math.floor(x1); x <= x2; x++) pts.push(k.vec2(x, surfaceAt(inst, x) ?? inst.floorY))
  pts.length > 1 && k.drawLines({ pts, width: DEBUG_LINE_W, color })
}
//
// The line over one world column: the highest of the ground's surface and
// the low pieces there that show (shown, their top not covered).
//
function surfaceAt(inst, col) {
  const entries = inst.buckets.get(Math.floor(col / BUCKET_W))
  if (!entries) return null
  let best = null
  for (const e of entries) {
    if (!e.tops || !isShown(e)) continue
    const y = e.tops[col - e.x1]
    if (y === undefined || y === Infinity || (best !== null && y >= best) || isCovered(entries, e, col, y)) continue
    best = y
  }
  return best
}
//
// Whether a shown picture drawn over e is solid at e's top pixel in col.
//
function isCovered(entries, e, col, y) {
  const row = Math.round(y)
  return entries.some(o => {
    if (o === e || !drawsOver(o, e) || !isShown(o)) return false
    const lx = col - o.x1
    const ly = row - o.y1
    return lx >= 0 && lx < o.w && ly >= 0 && ly < o.h && o.mask[ly * o.w + lx] === 1
  })
}
function drawsOver(o, e) {
  return o.z > e.z || (o.z === e.z && o.seq > e.seq)
}
function isShown(entry) {
  return !entry.obj || (!entry.obj.hidden && entry.obj.exists?.())
}
function addEntry(inst, scan, left, top, fields) {
  const entry = { ...fields, x1: Math.round(left), y1: Math.round(top), w: scan.w, h: scan.h, mask: scan.mask, seq: inst.seq++ }
  const first = Math.floor(entry.x1 / BUCKET_W)
  const last = Math.floor((entry.x1 + entry.w - 1) / BUCKET_W)
  for (let b = first; b <= last; b++) {
    inst.buckets.has(b) ? inst.buckets.get(b).push(entry) : inst.buckets.set(b, [entry])
  }
}
//
// One picture read once: its solid mask, per column the top of its solid
// silhouette above the ground line (Infinity where none) and its highest
// point. Null when nothing solid rises above the ground line.
//
function scanPicture(inst, canvas, top) {
  const w = canvas.width
  const h = canvas.height
  if (!w || !h) return null
  const px = canvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data
  const mask = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) mask[i] = px[i * RGBA + 3] >= SOLID_ALPHA ? 1 : 0
  const tops = new Float32Array(w).fill(Infinity)
  let highest = Infinity
  for (let x = 0; x < w; x++) {
    let first = 0
    while (first < h && px[(first * w + x) * RGBA + 3] < SOLID_ALPHA) first++
    if (first === h || top + first >= inst.floorY) continue
    tops[x] = top + first
    highest = Math.min(highest, top + first)
  }
  return highest === Infinity ? null : { tops, highest, mask, w, h }
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
