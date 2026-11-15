import { createSeededRandom } from '../../../utils/seeded-random.js'
import * as Atlas from './cave-atlas.js'
import * as Layout from './cave-layout.js'
//
// Walkable tops of the cave built from the platforms sheet. A ledge's or a
// ground's top (Layout.topSegments) is walked segment by segment, every
// piece at its own size or a little smaller (never enlarged): a flat run
// is a row of flat platforms joined rim to rim (each overlapping the last
// a little), its last piece set back to end exactly where the run ends —
// and a free end is a platform's own rounded edge; a rise or a fall is a
// chain of sloped platforms (only ones at least as steep, eased to its
// slope) from knot to knot, reaching a little onto both neighbours (drawn
// over the flat runs, so the joint is the slope's own worn end, not a
// cut). A lake pillar is one block platform fitted to its width. Under ledges and the ceiling hang
// the sheet's dripping platforms, their tops hidden in the earth mass, so
// only their stone drips show.
//
// Platform scale (world px per sheet px): at most 1, shrunk by up to
// SCALE_JITTER per piece; the shortest tail worth a piece.
//
const SCALE_JITTER = 0.15
const MIN_TAIL = 24
//
// Neighbours overlap by this share of the rim; a slope reaches JOINT px
// onto each neighbour.
//
const OVERLAP_SHARE = 0.12
const JOINT = 10
//
// A sloped piece may be eased steeper than itself by at most this share.
//
const STEEPER_MAX = 1.1
//
// The walkable line sits this far under a piece's mossy top.
//
const TOP_SINK = 3
//
// Rows use the mid and big flat platforms (the smallest read as crumbs).
//
const ROW_FROM = 2
//
// Drips: spacing (with its spread), scale, how much of a dripping
// platform hides in the mass above.
//
const DRIP_GAP = 130
const DRIP_GAP_JITTER = 0.5
const DRIP_SCALE = 0.7
const DRIP_JITTER = 0.2
const DRIP_HIDE = 0.55

/**
 * Paints a platform's whole top over its art span (the ends that run into
 * a wall or past the world's side are carried on there).
 * @param {CanvasRenderingContext2D} ctx - World-translated context
 * @param {Object} p - PLATFORMS entry
 * @param {number} artX1 - Left end of the art
 * @param {number} artX2 - Right end of the art
 */
export function paintTop(ctx, p, artX1, artX2) {
  const rng = createSeededRandom(p.seed + 7)
  const segs = Layout.topSegments(p).map(seg => ({ ...seg }))
  const last = segs.length - 1
  segs[0].x1 = Math.min(segs[0].x1, artX1)
  segs[last].x2 = Math.max(segs[last].x2, artX2)
  const fromRight = p.x2 < Layout.WORLD_W
  const flats = []
  const slopes = []
  segs.forEach((seg, i) => {
    seg.y1 === seg.y2 ? placeFlat(rng, seg, fromRight && i === last, flats) : slopes.push(placeSlope(rng, seg))
  })
  flats.forEach(piece => Atlas.drawScaled(ctx, piece.name, piece.left, piece.top, piece.scale, piece.flip))
  slopes.flat().forEach(piece => Atlas.drawStretched(ctx, piece.name, piece.left, piece.top, piece.sx, piece.sy))
}

/**
 * Paints a block platform fitted to a pillar's span x1…x2 at y.
 * @param {CanvasRenderingContext2D} ctx - World-translated context
 * @param {number} x1 - Left end of the span
 * @param {number} x2 - Right end of the span
 * @param {number} y - Walkable top Y
 * @param {number} seed - Element seed
 */
export function paintPillar(ctx, x1, x2, y, seed) {
  const pick = pillarPick(seed)
  const rimW = pick.rim.rimR - pick.rim.rimL
  const scale = Math.min(1, (x2 - x1) / rimW)
  const left = (x1 + x2) / 2 - (pick.rim.rimL + rimW / 2) * scale
  Atlas.drawScaled(ctx, pick.name, left, y + TOP_SINK - pick.rim.top * scale, scale, pick.flip)
}

/**
 * Depth a pillar's block reaches under its top (where stones may start).
 * @param {number} x1 - Left end of the span
 * @param {number} x2 - Right end of the span
 * @param {number} seed - Element seed
 * @returns {number}
 */
export function pillarDepth(x1, x2, seed) {
  const rim = pillarPick(seed).rim
  return (rim.h - rim.top) * Math.min(1, (x2 - x1) / (rim.rimR - rim.rimL))
}

/**
 * Dripping platforms hanging along an underside (paint before the mass that
 * hides their tops).
 * @param {CanvasRenderingContext2D} ctx - World-translated context
 * @param {number} x1 - Left end
 * @param {number} x2 - Right end
 * @param {function(number): number} bottomAt - Underside Y at X
 * @param {number} seed - Element seed
 */
export function paintDrips(ctx, x1, x2, bottomAt, seed) {
  const rng = createSeededRandom(seed + 9)
  for (let x = x1 + rng() * DRIP_GAP; x < x2; x += DRIP_GAP * (1 + (rng() - 0.5) * DRIP_GAP_JITTER)) {
    const name = Atlas.CONES[Math.floor(rng() * Atlas.CONES.length)]
    const scale = DRIP_SCALE * (1 + (rng() - 0.5) * DRIP_JITTER)
    const rim = Atlas.platformRim(name)
    Atlas.drawScaled(ctx, name, x - rim.w * scale / 2, bottomAt(x) - rim.h * scale * DRIP_HIDE, scale, rng() < 0.5)
  }
}
//
// A flat run: pieces from its free right end (else from its left end), each
// joined to the last; one that would run past the run's other end is set
// back to end exactly there.
//
function placeFlat(rng, seg, fromRight, out) {
  const names = Atlas.FLATS.slice(ROW_FROM)
  const dir = fromRight ? -1 : 1
  const end = fromRight ? seg.x1 : seg.x2
  let cursor = fromRight ? seg.x2 : seg.x1
  while ((end - cursor) * dir > MIN_TAIL) {
    const name = names[Math.floor(rng() * names.length)]
    const flip = rng() < 0.5
    const rim = flippedRim(name, flip)
    const scale = 1 - rng() * SCALE_JITTER
    const rimW = (rim.rimR - rim.rimL) * scale
    const last = Math.abs(end - cursor) < rimW
    const from = last ? end - dir * rimW : cursor
    const x = dir < 0 ? from - rim.rimR * scale : from - rim.rimL * scale
    out.push({ name, flip, scale, left: x, top: seg.y1 + TOP_SINK - rim.top * scale })
    cursor = last ? end : from + dir * rimW * (1 - OVERLAP_SHARE)
  }
}
//
// A rise or a fall: a chain of sloped platforms (the matching sheet row,
// only pieces at least as steep as it) from a little before its first knot
// to a little past its last, each eased to the slope; the last one set
// back to end exactly there.
//
function placeSlope(rng, seg) {
  const m = (seg.y2 - seg.y1) / (seg.x2 - seg.x1)
  const list = m < 0 ? Atlas.RISES : Atlas.FALLS
  const steep = list.filter(name => naturalSlope(name) * STEEPER_MAX >= Math.abs(m))
  const names = steep.length ? steep : [list.reduce((a, b) => (naturalSlope(b) > naturalSlope(a) ? b : a))]
  const end = seg.x2 + JOINT
  const out = []
  let cursor = seg.x1 - JOINT
  while (end - cursor > MIN_TAIL) {
    const name = names[Math.floor(rng() * names.length)]
    const rim = Atlas.platformRim(name)
    const sx = 1 - rng() * SCALE_JITTER
    const rimW = (rim.rimR - rim.rimL) * sx
    const last = end - cursor < rimW
    const from = last ? end - rimW : cursor
    const sy = Math.abs(m) * rimW / Math.abs(rim.topR - rim.top)
    const lineY = seg.y1 + m * (from - seg.x1)
    out.push({ name, sx, sy, left: from - rim.rimL * sx, top: lineY + TOP_SINK - rim.top * sy })
    cursor = last ? end : from + rimW * (1 - OVERLAP_SHARE)
  }
  return out
}
//
// Rise over run of a sloped piece's own rim.
//
function naturalSlope(name) {
  const rim = Atlas.platformRim(name)
  return Math.abs(rim.topR - rim.top) / (rim.rimR - rim.rimL)
}
function pillarPick(seed) {
  const rng = createSeededRandom(seed + 7)
  const name = Atlas.BLOCKS[Math.floor(rng() * Atlas.BLOCKS.length)]
  const flip = rng() < 0.5
  return { name, flip, rim: flippedRim(name, flip) }
}
//
// A flat piece's rim, mirrored with it.
//
function flippedRim(name, flip) {
  const rim = Atlas.platformRim(name)
  return flip ? { ...rim, rimL: rim.w - rim.rimR, rimR: rim.w - rim.rimL } : rim
}
