//
// Pixel classes for the staircase pass. MIXED covers already anti-aliased
// pixels, eyes and anything outside the rim band — those are never edited.
//
const CLASS_MIXED = 0
const CLASS_INK = 1
const CLASS_BODY = 2
const CLASS_CLEAR = 3
//
// Grain shifts baked colours slightly, so class matching uses a tolerance.
//
const CLASS_COLOR_TOL_SQ = 40 * 40 * 3
const OPAQUE_ALPHA_MIN = 250
const CLEAR_ALPHA_MAX = 8
const BAND_CLEAR_ALPHA_MAX = 127
//
// Tolerant mode: ink share along the body→ink colour line that still counts
// as pure ink / pure body.
//
const TOLERANT_INK_MIN = 0.65
const TOLERANT_BODY_MAX = 0.35
//
// Only pixels this many px (Chebyshev) beyond the rim touch transparency are
// considered — keeps the pass off interior details such as the mouth.
//
const RIM_BAND_EXTRA_PX = 2
//
// Z-shaped steps up to this length are blended along a straight line; longer
// runs and corners only round their ends.
//
const MAX_Z_STEP_LEN = 16
const CORNER_RAMP_PX = 1
const HALF_STEP = 0.5
const MAX_BLEND = 0.5
const COVERAGE_SAMPLES = 4
const NO_SOURCE = -1

/**
 * Softens hard staircase steps and sharp right-angle corners along the hero
 * outline (both the outer edge and the edge against the body / hollow
 * interior). Straight runs and already anti-aliased pixels stay untouched, so
 * the pass only rounds jagged spots; eyes are excluded via `excludeDiscs`.
 * @param {CanvasRenderingContext2D} ctx - Baked hero frame context
 * @param {Object} cfg - Pass configuration
 * @param {string} cfg.outlineHex - Outline colour ("#RRGGBB")
 * @param {string} cfg.bodyHex - Body colour ("#RRGGBB")
 * @param {number} cfg.rim - Outline rim width in px
 * @param {Array<{x:number,y:number,r:number}>} [cfg.excludeDiscs=[]] - Areas to leave as-is
 * @param {boolean} [cfg.tolerant=false] - Treat faint ink/body tints as pure (rebuilt run rims)
 */
export function smoothHeroContourSteps(ctx, cfg) {
  const { width: w, height: h } = ctx.canvas
  const img = ctx.getImageData(0, 0, w, h)
  const px = img.data
  const inst = {
    w,
    h,
    px,
    cls: classifyContourPixels(px, w, h, cfg),
    weight: new Float32Array(w * h),
    source: new Int32Array(w * h).fill(NO_SOURCE)
  }
  scanHorizontalEdges(inst)
  scanVerticalEdges(inst)
  applyContourBlend(inst)
  ctx.putImageData(img, 0, 0)
}
//
// Labels every pixel as ink / body / clear / mixed, then demotes pixels in
// excluded discs or far from any transparent pixel to mixed.
//
function classifyContourPixels(px, w, h, cfg) {
  const ink = parseHexRgb(cfg.outlineHex)
  const body = parseHexRgb(cfg.bodyHex)
  const cls = new Uint8Array(w * h)
  const nearClear = new Uint8Array(w * h)
  for (let idx = 0; idx < w * h; idx++) {
    const i = idx * 4
    px[i + 3] <= BAND_CLEAR_ALPHA_MAX && (nearClear[idx] = 1)
    cls[idx] = cfg.tolerant
      ? classifyTolerant(px, i, ink, body)
      : classifyStrict(px, i, ink, body)
  }
  const band = dilateChebyshev(nearClear, w, h, cfg.rim + RIM_BAND_EXTRA_PX)
  for (let idx = 0; idx < w * h; idx++) {
    !band[idx] && (cls[idx] = CLASS_MIXED)
  }
  for (const disc of cfg.excludeDiscs || []) {
    clearDiscToMixed(cls, w, h, disc)
  }
  return cls
}
//
// Strict: only fully opaque pixels close to the pure ink / body colour.
//
function classifyStrict(px, i, ink, body) {
  const a = px[i + 3]
  if (a <= CLEAR_ALPHA_MAX) return CLASS_CLEAR
  if (a < OPAQUE_ALPHA_MIN) return CLASS_MIXED
  if (colorDistSq(px, i, ink) <= CLASS_COLOR_TOL_SQ) return CLASS_INK
  if (colorDistSq(px, i, body) <= CLASS_COLOR_TOL_SQ) return CLASS_BODY
  return CLASS_MIXED
}
//
// Tolerant: opaque ink/body blends snap to the nearer side, so faint stair
// tints left by earlier passes no longer hide the staircase from the scan.
//
function classifyTolerant(px, i, ink, body) {
  const a = px[i + 3]
  if (a <= CLEAR_ALPHA_MAX) return CLASS_CLEAR
  if (a < OPAQUE_ALPHA_MIN) return CLASS_MIXED
  const span = [ink[0] - body[0], ink[1] - body[1], ink[2] - body[2]]
  const spanSq = span[0] * span[0] + span[1] * span[1] + span[2] * span[2]
  if (spanSq <= CLASS_COLOR_TOL_SQ) {
    return colorDistSq(px, i, ink) <= CLASS_COLOR_TOL_SQ ? CLASS_INK : CLASS_MIXED
  }
  const rel = [px[i] - body[0], px[i + 1] - body[1], px[i + 2] - body[2]]
  const t = (rel[0] * span[0] + rel[1] * span[1] + rel[2] * span[2]) / spanSq
  const off = [rel[0] - span[0] * t, rel[1] - span[1] * t, rel[2] - span[2] * t]
  if (off[0] * off[0] + off[1] * off[1] + off[2] * off[2] > CLASS_COLOR_TOL_SQ) return CLASS_MIXED
  if (t >= TOLERANT_INK_MIN) return CLASS_INK
  if (t <= TOLERANT_BODY_MAX) return CLASS_BODY
  return CLASS_MIXED
}
//
// Ink flag for edge tests: 1 ink, 0 body/clear, -1 mixed (never an edge).
//
function inkAt(inst, x, y) {
  if (x < 0 || y < 0 || x >= inst.w || y >= inst.h) return -1
  const c = inst.cls[y * inst.w + x]
  if (c === CLASS_MIXED) return -1
  return c === CLASS_INK ? 1 : 0
}
//
// True when the two pixels are both classified and sit on opposite sides.
//
function isEdgeBetween(inst, x0, y0, x1, y1) {
  const a = inkAt(inst, x0, y0)
  const b = inkAt(inst, x1, y1)
  return a >= 0 && b >= 0 && a !== b
}
//
// Edges between row y and y+1.
//
function scanHorizontalEdges(inst) {
  for (let y = 0; y < inst.h - 1; y++) {
    scanEdgeLine(inst, true, y, inst.w)
  }
}
//
// Edges between column x and x+1 — same as the horizontal pass, transposed.
//
function scanVerticalEdges(inst) {
  for (let x = 0; x < inst.w - 1; x++) {
    scanEdgeLine(inst, false, x, inst.h)
  }
}
//
// Walks one edge line, splits it into same-orientation runs and blends each.
// `line` is the row (horizontal) or column (vertical) on the first side.
//
function scanEdgeLine(inst, horizontal, line, length) {
  let a = 0
  while (a < length) {
    if (!edgeAt(inst, horizontal, line, a)) {
      a++
      continue
    }
    const firstInk = firstSideInk(inst, horizontal, line, a)
    let b = a
    while (b + 1 < length && edgeAt(inst, horizontal, line, b + 1) && firstSideInk(inst, horizontal, line, b + 1) === firstInk) b++
    const start = runEndTurn(inst, horizontal, line, a - 1, a)
    const end = runEndTurn(inst, horizontal, line, b + 1, b)
    blendEdgeRun(inst, a, b, start, end, horizontal, line)
    a = b + 1
  }
}
//
// Edge across `line|line+1` at run position t.
//
function edgeAt(inst, horizontal, line, t) {
  return horizontal
    ? isEdgeBetween(inst, t, line, t, line + 1)
    : isEdgeBetween(inst, line, t, line + 1, t)
}

function firstSideInk(inst, horizontal, line, t) {
  return horizontal ? inkAt(inst, t, line) : inkAt(inst, line, t)
}
//
// Perpendicular edge between run positions t0 and t1 on one side line.
//
function perpEdgeAt(inst, horizontal, sideLine, t0, t1) {
  return horizontal
    ? isEdgeBetween(inst, t0, sideLine, t1, sideLine)
    : isEdgeBetween(inst, sideLine, t0, sideLine, t1)
}
//
// Turn at a run end (`outside` is the position just past the run): the
// boundary bends into the first side (+0.5), the second side (-0.5), or not
// at all / both ways (0). `steps` is true when the bend is a 1 px stair step
// whose edge carries on parallel one line over — a real staircase, not the
// corner of a long straight wall.
//
function runEndTurn(inst, horizontal, line, outside, inside) {
  const turnsFirst = perpEdgeAt(inst, horizontal, line, outside, inside)
  const turnsSecond = perpEdgeAt(inst, horizontal, line + 1, outside, inside)
  if (turnsFirst === turnsSecond) return { h: 0, steps: false }
  return turnsFirst
    ? { h: HALF_STEP, steps: edgeAt(inst, horizontal, line - 1, outside) }
    : { h: -HALF_STEP, steps: edgeAt(inst, horizontal, line + 1, outside) }
}
//
// Reconstructs the smooth boundary over one edge run and stores, per pixel,
// how much of the opposite side should bleed into it.
//
function blendEdgeRun(inst, a, b, start, end, horizontal, line) {
  const hStart = start.h
  const hEnd = end.h
  if (hStart === 0 && hEnd === 0) return
  const len = b - a + 1
  const isZ = hStart !== 0 && hEnd !== 0 && hStart !== hEnd &&
    start.steps && end.steps && len <= MAX_Z_STEP_LEN
  const ramp = hStart !== 0 && hEnd !== 0 ? Math.min(CORNER_RAMP_PX, len / 2) : Math.min(CORNER_RAMP_PX, len)
  for (let t = a; t <= b; t++) {
    let sum = 0
    for (let s = 0; s < COVERAGE_SAMPLES; s++) {
      const pos = t - a + (s + HALF_STEP) / COVERAGE_SAMPLES
      sum += isZ
        ? hStart + (hEnd - hStart) * (pos / len)
        : cornerRampHeight(pos, len, hStart, hEnd, ramp)
    }
    const hAvg = sum / COVERAGE_SAMPLES
    const first = horizontal ? line * inst.w + t : t * inst.w + line
    const second = horizontal ? first + inst.w : first + 1
    hAvg > 0 && addBlend(inst, first, second, hAvg)
    hAvg < 0 && addBlend(inst, second, first, -hAvg)
  }
}
//
// Corner-only boundary: each turning end tapers linearly back to the edge.
//
function cornerRampHeight(pos, len, hStart, hEnd, ramp) {
  const fromStart = hStart * Math.max(0, 1 - pos / ramp)
  const fromEnd = hEnd * Math.max(0, 1 - (len - pos) / ramp)
  return fromStart + fromEnd
}
//
// Accumulates bleed weight; the strongest contributor provides the colour.
//
function addBlend(inst, target, source, amount) {
  const prev = inst.weight[target]
  inst.weight[target] = prev + amount
  amount >= prev && (inst.source[target] = source)
}
//
// Mixes each weighted pixel toward its source pixel in premultiplied space:
// ink into body tints it, ink into clear adds partial ink, clear into ink
// fades it. Sources are read from a snapshot so blends never chain.
//
function applyContourBlend(inst) {
  const { weight, source } = inst
  const px = inst.px
  const orig = px.slice()
  for (let idx = 0; idx < weight.length; idx++) {
    const wgt = Math.min(MAX_BLEND, weight[idx])
    if (wgt <= 0) continue
    const i = idx * 4
    const si = source[idx] * 4
    const a = orig[i + 3]
    const sa = orig[si + 3]
    const na = a + (sa - a) * wgt
    px[i + 3] = Math.round(na)
    if (na <= 0) continue
    for (let c = 0; c < 3; c++) {
      px[i + c] = Math.round((orig[i + c] * a * (1 - wgt) + orig[si + c] * sa * wgt) / na)
    }
  }
}
//
// Grows a binary mask by `radius` px in the 8-connected (Chebyshev) metric.
//
function dilateChebyshev(mask, w, h, radius) {
  const out = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!mask[y * w + x]) continue
      const y0 = Math.max(0, y - radius)
      const y1 = Math.min(h - 1, y + radius)
      const x0 = Math.max(0, x - radius)
      const x1 = Math.min(w - 1, x + radius)
      for (let yy = y0; yy <= y1; yy++) {
        out.fill(1, yy * w + x0, yy * w + x1 + 1)
      }
    }
  }
  return out
}
//
// Marks every pixel whose centre falls inside the disc as mixed.
//
function clearDiscToMixed(cls, w, h, disc) {
  const y0 = Math.max(0, Math.floor(disc.y - disc.r))
  const y1 = Math.min(h - 1, Math.ceil(disc.y + disc.r))
  const x0 = Math.max(0, Math.floor(disc.x - disc.r))
  const x1 = Math.min(w - 1, Math.ceil(disc.x + disc.r))
  const r2 = disc.r * disc.r
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x + HALF_STEP - disc.x
      const dy = y + HALF_STEP - disc.y
      dx * dx + dy * dy <= r2 && (cls[y * w + x] = CLASS_MIXED)
    }
  }
}

function colorDistSq(px, i, rgb) {
  const dr = px[i] - rgb[0]
  const dg = px[i + 1] - rgb[1]
  const db = px[i + 2] - rgb[2]
  return dr * dr + dg * dg + db * db
}

function parseHexRgb(hex) {
  const s = String(hex).replace('#', '')
  return [
    parseInt(s.substring(0, 2), 16),
    parseInt(s.substring(2, 4), 16),
    parseInt(s.substring(4, 6), 16)
  ]
}
