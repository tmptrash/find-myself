import { createSeededRandom } from '../../../utils/seeded-random.js'
import { CAVE_CFG } from '../cfg.js'
import * as Atlas from './cave-atlas.js'
//
// Canvas2D painters for the cave's ground (reference: floating rock
// islands): every ledge, pillar, ground, wall and the ceiling is a mass of
// blue-grey faceted boulders from the stones sheet packed row by row over
// dark gaps — the boulders break the outline, so the silhouette is lumpy,
// not cut — with brown roots crawling over them and depth shade away from
// the light. Walkable tops get a flat stone cap with a thick yellow-green
// moss rim whose strands hang down the face; overhangs drip stone spikes.
// A mass is painted once per page into its own layer (keyed by element)
// and reused by every tile, the menu and the forest's glimpse.
//
const COLORS = CAVE_CFG.earth
const CONTOUR = CAVE_CFG.colors.contour
//
// Stones packed into a mass: plain boulders mostly, now and then a mossy
// one; row height, stone height over the row, a few big ones, overlap.
//
const PACK_STONES = ['boulder', 'rockSharp', 'rockSmall', 'wetSlab', 'flatRocks', 'slabs', 'rockSlant', 'flatSlab']
const MOSSY_STONES = ['crackedRock', 'mossCobble', 'smallMossRock', 'mossHump']
const MOSSY_CHANCE = 0.12
const ROW_H_MIN = 34
const ROW_H_RANGE = 20
const STONE_OVER_ROW_MIN = 1.2
const STONE_OVER_ROW_RANGE = 0.4
const BIG_CHANCE = 0.2
const BIG_SCALE = 1.5
const STEP_SHARE = 0.74
const ROW_JITTER = 0.35
const LAYER_PAD = 40
//
// The dark gap fill stops this far inside the outline (boulders cover it).
//
const GAP_INSET = 6
//
// Depth shade over the whole mass, from its lit side to the far side.
//
const SHADE_FROM = 0.05
const SHADE_ALPHA = 0.7
//
// Brown roots crawling over the stones: count per 1000 px of width, walk.
//
const ROOTS_PER_1000 = 2.4
const ROOT_SEGMENTS_MIN = 6
const ROOT_SEGMENTS_RANGE = 6
const ROOT_SEG_MIN = 12
const ROOT_SEG_RANGE = 14
const ROOT_W_MIN = 2.6
const ROOT_W_RANGE = 2.4
const ROOT_TURN = 0.55
const ROOT_TAPER = 0.86
const ROOT_CONTOUR_PAD = 1.6
const ROOT_LIT_FRAC = 0.35
const ROOT_BRANCH_CHANCE = 0.35
const ROOT_BRANCH_W = 0.6
const ROOT_ANGLE_MARGIN = 0.25
//
// Flat stone cap on a walkable top: its depth under the top line, lit
// edge, dark lower edge, cracks, rounded free ends.
//
const CAP_H = 12
const CAP_LIGHT_H = 2
const CAP_EDGE_H = 2
const CRACK_GAP_MIN = 18
const CRACK_GAP_RANGE = 40
const CRACK_W = 1
const CAP_END_ROUND = 6
//
// Moss: the thick rim along the cap's lower edge (it reaches up over the
// cap by RIM_UP of its height; mid and lit bands), patches on the cap
// where the clump knots run high, bright specks, grass tufts.
//
const MOSS_KNOT_STEP = 9
const RIM_Y = CAP_H - 3
const RIM_H_MIN = 6
const RIM_H_RANGE = 7
const RIM_UP = 0.4
const RIM_MID = 0.5
const RIM_LIT = 0.1
const RIM_STEP = 2
const PATCH_FROM = 0.45
const PATCH_H_MIN = 2
const PATCH_H_RANGE = 5
const PATCH_CORE_W = 0.38
const PATCH_CORE_H = 0.6
const SPECKS_PER_PX = 0.3
const SPECK_R_MIN = 0.8
const SPECK_R_RANGE = 1.2
const SPECK_LIT_CHANCE = 0.6
const GRASS_STEP = 7
const GRASS_CHANCE = 0.3
const GRASS_H_MIN = 4
const GRASS_H_RANGE = 7
const GRASS_W = 1.4
const GRASS_LEAN = 0.4
const GRASS_SPREAD = 2
const GRASS_SIDE_SHORT = 0.3
const GRASS_LIT_CHANCE = 0.5
//
// Moss strands hanging from the rim down the face, and over a ledge's end.
//
const DRAPE_CHANCE = 0.32
const DRAPE_STEP = 9
const DRAPE_LEN_MIN = 10
const DRAPE_LEN_RANGE = 46
const DRAPE_W_MIN = 3
const DRAPE_W_RANGE = 3
const DRAPE_LEAF_EVERY = 4
const DRAPE_LEAF_R = 2.2
const DRAPE_LEAF_LIT_CHANCE = 0.4
const DRAPE_LEAF_SHRINK = 0.5
const DRAPE_CORE_LEN = 0.8
const DRAPE_CORE_W = 0.45
const END_DRAPES = 5
const END_DRAPE_IN_MIN = 2
const END_DRAPE_IN_RANGE = 10
const END_DRAPE_STEP = 4
const END_DRAPE_SWAY = 6
const END_DRAPE_LEN_MIN = 20
const END_DRAPE_LEN_RANGE = 40
//
// Under an overhang: stone spikes (spaced, length range, width share,
// lumps, lit share) and a few dangling roots.
//
const SPIKE_STEP = 60
const SPIKE_CHANCE = 0.5
const SPIKE_LEN_MIN = 24
const SPIKE_LEN_RANGE = 46
const SPIKE_W_SHARE = 0.3
const SPIKE_SIDES = 6
const SPIKE_LUMP = 0.18
const SPIKE_SINK = 4
const SPIKE_LIT_SHARE = 0.25
const SPIKE_CONTOUR_W = 1.5
const HANG_ROOT_CHANCE = 0.08
const HANG_LEN_MIN = 14
const HANG_LEN_RANGE = 40
const HANG_SWAY = 6
const HANG_ROOT_W = 2
const HANG_SINK = 2
const TAPER_STEPS = 6
const TAPER_MIN_W = 0.6
const TAU = Math.PI * 2
const layers = new Map()

/**
 * Paints a mass of packed boulders over a closed outline (its layer is
 * built once per page under `opts.key` and reused).
 * @param {CanvasRenderingContext2D} ctx - World-translated context
 * @param {Array<{x: number, y: number}>} poly - Outline
 * @param {Object} opts
 * @param {string} opts.key - Cache key of the element
 * @param {number} opts.seed - Element seed
 * @param {number} opts.topY - Highest Y stones may reach (a walkable top)
 * @param {boolean} [opts.litFromBelow=false] - Shade gathers at the top (the ceiling)
 * @param {number} [opts.roots=1] - Share of the usual root count
 */
export function paintMass(ctx, poly, opts) {
  const layer = layers.get(opts.key) ?? buildLayer(poly, opts)
  layers.set(opts.key, layer)
  ctx.drawImage(layer.canvas, layer.x, layer.y)
}

/**
 * Flat stone cap over a walkable top from x1 to x2 at y, its moss patches,
 * grass and the thick moss rim with strands hanging down the face.
 * @param {CanvasRenderingContext2D} ctx - World-translated context
 * @param {number} x1 - Left end
 * @param {number} x2 - Right end
 * @param {number} y - Walkable top Y
 * @param {Object} opts
 * @param {number} opts.seed - Element seed
 * @param {boolean} [opts.roundLeft=false] - Left end is free (rounded, moss rolls over it)
 * @param {boolean} [opts.roundRight=false] - Right end is free
 */
export function paintTop(ctx, x1, x2, y, opts) {
  const rng = createSeededRandom(opts.seed + 1)
  const knots = Array.from({ length: Math.ceil((x2 - x1) / MOSS_KNOT_STEP) + 2 }, () => rng())
  paintCap(ctx, rng, x1, x2, y, opts)
  paintDrapes(ctx, rng, x1, x2, y + RIM_Y)
  opts.roundLeft && paintEndDrapes(ctx, rng, x1, y + RIM_Y, -1)
  opts.roundRight && paintEndDrapes(ctx, rng, x2, y + RIM_Y, 1)
  paintRim(ctx, knots, x1, x2, y + RIM_Y)
  paintPatches(ctx, knots, x1, x2, y)
  paintGrass(ctx, rng, x1, x2, y)
  const specks = Math.floor((x2 - x1) * SPECKS_PER_PX)
  for (let i = 0; i < specks; i++) {
    ctx.fillStyle = rng() < SPECK_LIT_CHANCE ? COLORS.moss[4] : COLORS.moss[0]
    ctx.beginPath()
    ctx.arc(x1 + rng() * (x2 - x1), y + RIM_Y + rng() * RIM_H_MIN, SPECK_R_MIN + rng() * SPECK_R_RANGE, 0, TAU)
    ctx.fill()
  }
}

/**
 * Stone spikes and a few roots hanging from an underside.
 * @param {CanvasRenderingContext2D} ctx - World-translated context
 * @param {number} x1 - Left end
 * @param {number} x2 - Right end
 * @param {function(number): number} bottomAt - Underside Y at X
 * @param {number} seed - Element seed
 */
export function paintUnderside(ctx, x1, x2, bottomAt, seed) {
  const rng = createSeededRandom(seed + 2)
  for (let x = x1; x < x2; x += SPIKE_STEP) {
    const sx = x + rng() * SPIKE_STEP
    const len = SPIKE_LEN_MIN + rng() * SPIKE_LEN_RANGE
    rng() < SPIKE_CHANCE && paintSpike(ctx, rng, sx, bottomAt(sx) - SPIKE_SINK, len)
    if (rng() >= HANG_ROOT_CHANCE) continue
    const hx = x + rng() * SPIKE_STEP
    const top = bottomAt(hx) - HANG_SINK
    const end = top + HANG_LEN_MIN + rng() * HANG_LEN_RANGE
    const sway = (rng() * 2 - 1) * HANG_SWAY
    strokeTaper(ctx, hx, top, hx + sway, end, HANG_ROOT_W + ROOT_CONTOUR_PAD, CONTOUR)
    strokeTaper(ctx, hx, top, hx + sway, end, HANG_ROOT_W, COLORS.root[2])
  }
}

/**
 * One stone spike hanging from x / y: a lumpy cone, lit on its left.
 * @param {CanvasRenderingContext2D} ctx - World-translated context
 * @param {function(): number} rng - Seeded random
 * @param {number} x - Base centre X
 * @param {number} y - Base Y
 * @param {number} len - Length
 */
export function paintSpike(ctx, rng, x, y, len) {
  const lumps = Array.from({ length: SPIKE_SIDES + 1 }, () => 1 + (rng() * 2 - 1) * SPIKE_LUMP)
  const left = spikeSide(x, y, len, -1, lumps)
  const outline = [...left, ...spikeSide(x, y, len, 1, lumps).reverse()]
  const lit = left.map(p => ({ x: x + (p.x - x) * (1 - SPIKE_LIT_SHARE * 2), y: p.y })).reverse()
  fillPoly(ctx, outline, COLORS.spike[1])
  fillPoly(ctx, [...left, ...lit], COLORS.spike[2])
  tracePoly(ctx, outline)
  ctx.strokeStyle = CONTOUR
  ctx.lineWidth = SPIKE_CONTOUR_W
  ctx.stroke()
}

/**
 * Bounding box of a point list.
 * @param {Array<{x: number, y: number}>} poly
 * @returns {{x1: number, y1: number, x2: number, y2: number, w: number, h: number}}
 */
export function bounds(poly) {
  let x1 = Infinity
  let y1 = Infinity
  let x2 = -Infinity
  let y2 = -Infinity
  poly.forEach(p => {
    x1 = Math.min(x1, p.x)
    y1 = Math.min(y1, p.y)
    x2 = Math.max(x2, p.x)
    y2 = Math.max(y2, p.y)
  })
  return { x1, y1, x2, y2, w: x2 - x1, h: y2 - y1 }
}
//
// The mass on its own canvas: dark gaps, boulders row by row (their centres
// inside the outline, never above the top), roots, then depth shade.
//
function buildLayer(poly, opts) {
  const rng = createSeededRandom(opts.seed)
  const box = bounds(poly)
  const x = Math.floor(box.x1 - LAYER_PAD)
  const y = Math.floor(Math.max(opts.topY, box.y1) - LAYER_PAD)
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(box.w + LAYER_PAD * 2)
  canvas.height = Math.ceil(box.y2 - y + LAYER_PAD)
  const ctx = canvas.getContext('2d')
  ctx.translate(-x, -y)
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, opts.topY, canvas.width, canvas.height)
  ctx.clip()
  paintGaps(ctx, poly)
  packStones(ctx, rng, poly, box, opts.topY)
  paintRoots(ctx, rng, box, opts.topY, opts.roots ?? 1)
  ctx.restore()
  paintShade(ctx, x, y, canvas.width, canvas.height, opts.litFromBelow)
  return { canvas, x, y }
}
function paintGaps(ctx, poly) {
  ctx.save()
  tracePoly(ctx, poly)
  ctx.fillStyle = COLORS.gap
  ctx.fill()
  ctx.globalCompositeOperation = 'destination-out'
  ctx.lineWidth = GAP_INSET * 2
  ctx.stroke()
  ctx.restore()
}
//
// Boulders packed in rows from the top down, overlapping, each row offset.
//
function packStones(ctx, rng, poly, box, topY) {
  for (let rowY = Math.max(box.y1, topY); rowY < box.y2;) {
    const rowH = ROW_H_MIN + rng() * ROW_H_RANGE
    for (let x = box.x1 - rowH * rng(); x < box.x2;) {
      const list = rng() < MOSSY_CHANCE ? MOSSY_STONES : PACK_STONES
      const name = list[Math.floor(rng() * list.length)]
      const h = rowH * (STONE_OVER_ROW_MIN + rng() * STONE_OVER_ROW_RANGE) * (rng() < BIG_CHANCE ? BIG_SCALE : 1)
      const w = Atlas.widthAt(name, h)
      const cx = x + w / 2
      const cy = rowY + rowH * (0.5 + (rng() - 0.5) * ROW_JITTER)
      const flip = rng() < 0.5
      insidePoly(poly, cx, cy) && Atlas.drawPiece(ctx, name, cx, cy + h / 2, h, { flip })
      x += w * STEP_SHARE
    }
    rowY += rowH
  }
}
//
// Brown roots crawling down over the stones from the top.
//
function paintRoots(ctx, rng, box, topY, share) {
  const count = Math.round(box.w / 1000 * ROOTS_PER_1000 * share)
  for (let i = 0; i < count; i++) {
    const x = box.x1 + rng() * box.w
    walkRoot(ctx, rng, x, Math.max(topY, box.y1) + CAP_H, Math.PI / 2 + (rng() * 2 - 1) * ROOT_TURN, ROOT_W_MIN + rng() * ROOT_W_RANGE, true)
  }
}
function walkRoot(ctx, rng, x, y, angle, w, canBranch) {
  const segments = ROOT_SEGMENTS_MIN + Math.floor(rng() * ROOT_SEGMENTS_RANGE)
  const pts = [{ x, y }]
  let a = angle
  for (let s = 0; s < segments; s++) {
    a += (rng() * 2 - 1) * ROOT_TURN
    a = Math.max(ROOT_ANGLE_MARGIN, Math.min(Math.PI - ROOT_ANGLE_MARGIN, a))
    const len = ROOT_SEG_MIN + rng() * ROOT_SEG_RANGE
    const last = pts[pts.length - 1]
    pts.push({ x: last.x + Math.cos(a) * len, y: last.y + Math.sin(a) * len })
  }
  strokeRootPath(ctx, pts, w + ROOT_CONTOUR_PAD, COLORS.root[0])
  strokeRootPath(ctx, pts, w, COLORS.root[2])
  strokeRootPath(ctx, pts, w * ROOT_LIT_FRAC, COLORS.root[3])
  if (!canBranch) return
  pts.forEach((p, i) => i > 1 && rng() < ROOT_BRANCH_CHANCE && walkRoot(ctx, rng, p.x, p.y, a + (rng() < 0.5 ? -1 : 1) * ROOT_TURN * 2, w * ROOT_BRANCH_W, false))
}
function strokeRootPath(ctx, pts, w, color) {
  ctx.strokeStyle = color
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  let width = w
  for (let i = 1; i < pts.length; i++) {
    ctx.lineWidth = width
    ctx.beginPath()
    ctx.moveTo(pts[i - 1].x, pts[i - 1].y)
    ctx.lineTo(pts[i].x, pts[i].y)
    ctx.stroke()
    width *= ROOT_TAPER
  }
}
//
// Shade over everything painted in the layer, deepening away from the
// lit side.
//
function paintShade(ctx, x, y, w, h, fromBelow) {
  const g = ctx.createLinearGradient(0, y, 0, y + h)
  g.addColorStop(fromBelow ? 1 - SHADE_FROM : SHADE_FROM, `${COLORS.shade}00`)
  g.addColorStop(fromBelow ? 0 : 1, COLORS.shade)
  ctx.save()
  ctx.globalCompositeOperation = 'source-atop'
  ctx.globalAlpha = SHADE_ALPHA
  ctx.fillStyle = g
  ctx.fillRect(x, y, w, h)
  ctx.restore()
}
//
// The flat stone cap: body, lit top edge, dark lower edge, cracks.
//
function paintCap(ctx, rng, x1, x2, y, opts) {
  const l = opts.roundLeft ? CAP_END_ROUND : 0
  const r = opts.roundRight ? CAP_END_ROUND : 0
  ctx.fillStyle = COLORS.cap
  ctx.beginPath()
  ctx.roundRect(x1, y - 1, x2 - x1, CAP_H + 1, [l, r, r, l])
  ctx.fill()
  ctx.fillStyle = COLORS.capLight
  ctx.fillRect(x1 + l, y - 1, x2 - x1 - l - r, CAP_LIGHT_H)
  ctx.fillStyle = COLORS.capDark
  ctx.fillRect(x1 + l, y + CAP_H - CAP_EDGE_H, x2 - x1 - l - r, CAP_EDGE_H)
  ctx.strokeStyle = COLORS.capDark
  ctx.lineWidth = CRACK_W
  for (let x = x1 + rng() * CRACK_GAP_MIN; x < x2 - CRACK_GAP_MIN; x += CRACK_GAP_MIN + rng() * CRACK_GAP_RANGE) {
    ctx.beginPath()
    ctx.moveTo(x, y + CAP_LIGHT_H)
    ctx.lineTo(x + (rng() - 0.5) * CAP_H, y + CAP_H)
    ctx.stroke()
  }
}
//
// The thick moss rim along the cap's lower edge: clumpy (eased between
// seeded knots), a dark body, a mid band and a lit crest.
//
function paintRim(ctx, knots, x1, x2, y) {
  const xs = []
  const hs = []
  for (let x = x1; x <= x2; x += RIM_STEP) {
    xs.push(x)
    hs.push(RIM_H_MIN + knotAt(knots, (x - x1) / MOSS_KNOT_STEP) * RIM_H_RANGE)
  }
  fillBand(ctx, xs, hs, y, -RIM_UP, 1, COLORS.moss[1])
  fillBand(ctx, xs, hs, y, -RIM_UP, RIM_MID, COLORS.moss[3])
  fillBand(ctx, xs, hs, y, -RIM_UP, -RIM_LIT, COLORS.moss[4])
}
//
// Moss patches on the cap where the knots run high.
//
function paintPatches(ctx, knots, x1, x2, y) {
  for (let i = 0; i < knots.length - 1; i++) {
    if (knots[i] < PATCH_FROM) continue
    const w = MOSS_KNOT_STEP * (1 + knots[i])
    const cx = x1 + i * MOSS_KNOT_STEP + w / 2
    const h = PATCH_H_MIN + knots[i] * PATCH_H_RANGE
    if (cx + w / 2 > x2) break
    ctx.fillStyle = COLORS.moss[2]
    ctx.beginPath()
    ctx.ellipse(cx, y + 1, w / 2, h, 0, Math.PI, TAU)
    ctx.fill()
    ctx.fillStyle = COLORS.moss[3]
    ctx.beginPath()
    ctx.ellipse(cx, y + 1, w * PATCH_CORE_W, h * PATCH_CORE_H, 0, Math.PI, TAU)
    ctx.fill()
  }
}
//
// Little tufts of three grass blades on the cap.
//
function paintGrass(ctx, rng, x1, x2, y) {
  ctx.lineCap = 'round'
  ctx.lineWidth = GRASS_W
  for (let x = x1 + GRASS_STEP; x < x2 - GRASS_STEP; x += GRASS_STEP) {
    if (rng() >= GRASS_CHANCE) continue
    const h = GRASS_H_MIN + rng() * GRASS_H_RANGE
    ctx.strokeStyle = COLORS.moss[rng() < GRASS_LIT_CHANCE ? 2 : 3]
    for (let b = -1; b <= 1; b++) {
      ctx.beginPath()
      ctx.moveTo(x + b * GRASS_SPREAD, y + 1)
      ctx.lineTo(x + b * GRASS_SPREAD + b * h * GRASS_LEAN, y - h * (1 - Math.abs(b) * GRASS_SIDE_SHORT))
      ctx.stroke()
    }
  }
}
function paintDrapes(ctx, rng, x1, x2, y) {
  for (let x = x1; x < x2; x += DRAPE_STEP) {
    rng() < DRAPE_CHANCE && paintDrape(ctx, rng, x + rng() * DRAPE_STEP, y, DRAPE_LEN_MIN + rng() * DRAPE_LEN_RANGE, 0)
  }
}
function paintEndDrapes(ctx, rng, x, y, dir) {
  for (let i = 0; i < END_DRAPES; i++) {
    const dx = dir * (END_DRAPE_IN_MIN + rng() * END_DRAPE_IN_RANGE) - dir * i * END_DRAPE_STEP
    paintDrape(ctx, rng, x + dx, y, END_DRAPE_LEN_MIN + rng() * END_DRAPE_LEN_RANGE, dir * rng() * END_DRAPE_SWAY)
  }
}
//
// A tapered moss strand with small leaf blobs along it.
//
function paintDrape(ctx, rng, x, y, len, sway) {
  const w = DRAPE_W_MIN + rng() * DRAPE_W_RANGE
  strokeTaper(ctx, x, y, x + sway, y + len, w + ROOT_CONTOUR_PAD, CONTOUR)
  strokeTaper(ctx, x, y, x + sway, y + len, w, COLORS.mossHang[0])
  strokeTaper(ctx, x, y, x + sway * DRAPE_CORE_LEN, y + len * DRAPE_CORE_LEN, w * DRAPE_CORE_W, COLORS.mossHang[1])
  const leaves = Math.floor(len / DRAPE_LEAF_EVERY)
  for (let i = 1; i < leaves; i++) {
    const u = i / leaves
    ctx.fillStyle = COLORS.mossHang[rng() < DRAPE_LEAF_LIT_CHANCE ? 2 : 1]
    ctx.beginPath()
    ctx.arc(x + sway * u + (i % 2 ? -1 : 1) * w / 2, y + len * u, DRAPE_LEAF_R * (1 - u * DRAPE_LEAF_SHRINK), 0, TAU)
    ctx.fill()
  }
}
//
// Stroke from (x1, y1) to (x2, y2) narrowing toward its end, bending
// sideways late (a hanging strand).
//
function strokeTaper(ctx, x1, y1, x2, y2, w, color) {
  ctx.strokeStyle = color
  ctx.lineCap = 'round'
  for (let i = 0; i < TAPER_STEPS; i++) {
    const u0 = i / TAPER_STEPS
    const u1 = (i + 1) / TAPER_STEPS
    ctx.lineWidth = Math.max(TAPER_MIN_W, w * (1 - u0))
    ctx.beginPath()
    ctx.moveTo(x1 + (x2 - x1) * u0 * u0, y1 + (y2 - y1) * u0)
    ctx.lineTo(x1 + (x2 - x1) * u1 * u1, y1 + (y2 - y1) * u1)
    ctx.stroke()
  }
}
//
// Band between y + h × topShare and y + h × bottomShare along the samples.
//
function fillBand(ctx, xs, hs, y, topShare, bottomShare, color) {
  ctx.fillStyle = color
  ctx.beginPath()
  xs.forEach((x, i) => ctx.lineTo(x, y + hs[i] * topShare))
  for (let i = xs.length - 1; i >= 0; i--) ctx.lineTo(xs[i], y + hs[i] * bottomShare)
  ctx.closePath()
  ctx.fill()
}
//
// One side of a spike from its base down to the tip.
//
function spikeSide(x, y, len, dir, lumps) {
  const w = len * SPIKE_W_SHARE
  const pts = []
  for (let i = 0; i <= SPIKE_SIDES; i++) {
    const u = i / SPIKE_SIDES
    pts.push({ x: x + dir * w * (1 - u) * lumps[i], y: y + len * u })
  }
  return pts
}
function fillPoly(ctx, pts, color) {
  tracePoly(ctx, pts)
  ctx.fillStyle = color
  ctx.fill()
}
function knotAt(knots, f) {
  const i = Math.max(0, Math.min(knots.length - 2, Math.floor(f)))
  const u = Math.max(0, Math.min(1, f - i))
  return knots[i] + (knots[i + 1] - knots[i]) * u * u * (3 - 2 * u)
}
function tracePoly(ctx, poly) {
  ctx.beginPath()
  ctx.moveTo(poly[0].x, poly[0].y)
  for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y)
  ctx.closePath()
}
//
// Even-odd point test against an outline.
//
function insidePoly(poly, x, y) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]
    const b = poly[j]
    a.y > y !== b.y > y && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x && (inside = !inside)
  }
  return inside
}
