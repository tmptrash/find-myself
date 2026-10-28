import { CFG } from '../../../cfg.js'
import { forestRgb } from '../../forest/utils/forest-palette.js'
import { growTreeRootSegments, paintRootRelief } from '../../../utils/grow-tree-root.js'
import { drawFernToCanvas } from '../../../utils/draw-fern.js'
import * as Layout from './cave-layout.js'
//
// Shared Canvas2D painters for the cave bakes (terrain tiles, parallax rows,
// platforms): stony rock masses, moss rims, stalactites, stalagmites, roots
// and dark ferns. Every colour comes from CFG.visual.colors.palette.cave.
//
export const CAVE_PAL = CFG.visual.colors.palette.cave
//
// Stones packed inside a rock mass: radius range, vertex count and how
// densely they fill the mass (1 = stone areas sum to the mass area).
//
const STONE_R_MIN = 6
const STONE_R_RANGE = 13
const STONE_VERTS_MIN = 6
const STONE_VERTS_RANGE = 4
const STONE_RADIUS_JITTER = 0.35
const STONE_FLATTEN_Y = 0.78
const STONE_FILL_DENSITY = 1.25
const STONE_TONE_WEIGHTS = [0.22, 0.48, 0.3]
const STONE_LIT_ALPHA = 0.55
const STONE_LIT_W = 1.6
//
// Lit rim arc on each stone: radius share and upper-left angle span.
//
const STONE_LIT_RADIUS = 0.72
const STONE_LIT_ARC_FROM = Math.PI * 1.05
const STONE_LIT_ARC_TO = Math.PI * 1.6
const STONE_CONTOUR_ALPHA = 0.75
const STONE_CONTOUR_W = 1
const MASS_CONTOUR_W = 2.4
//
// Rock mass inner occlusion: wide dark stroke kept inside the outline.
//
const MASS_OCCLUSION_W = 16
const MASS_OCCLUSION_ALPHA = 0.32
//
// Moss rim lumps along a walkable top edge.
//
const MOSS_STEP = 5
const MOSS_RX_MIN = 3
const MOSS_RX_RANGE = 4
const MOSS_RY_MIN = 2
const MOSS_RY_RANGE = 2
const MOSS_LIGHT_CHANCE = 0.45
const MOSS_SPECK_CHANCE = 0.12
const MOSS_LIGHT_SHIFT = 0.3
const MOSS_LIGHT_SIZE = 0.55
const MOSS_DRIP_CHANCE = 0.1
const MOSS_DRIP_LEN_MIN = 3
const MOSS_DRIP_LEN_RANGE = 7
//
// Spikes (reference: long knobbly cones): lumpy sides with drip rings, a
// slightly curved tip, lit left face, shaded right, a pale streak, and a
// broken base where they leave the rock.
//
const SPIKE_STEPS = 10
const SPIKE_TAPER_POW = 0.85
const SPIKE_LUMP_AMP = 0.14
const SPIKE_LUMP_FREQ = 3.2
const SPIKE_TIP_BEND = 0.35
const SPIKE_TIP_W = 0.6
const SPIKE_BASE_JAG = 4
const SPIKE_BASE_POINTS = 4
const SPIKE_BASE_FLARE = 1.15
const SPIKE_LIT_SHARE = 0.38
const SPIKE_SHADE_SHARE = 0.32
const SPIKE_RINGS_MIN = 2
const SPIKE_RINGS_RANGE = 3
const SPIKE_RING_ALPHA = 0.55
const SPIKE_RING_W = 1.2
const SPIKE_STREAK_ALPHA = 0.6
const SPIKE_STREAK_W = 1.2
const SPIKE_STREAK_FROM = 0.1
const SPIKE_STREAK_TO = 0.7
const SPIKE_STREAK_SHIFT = 0.22
const SPIKE_CONTOUR_W = 1.5
//
// Stones breaking a rock mass outline: spacing, chance, size, how far they
// sit inside the mass (so walkable tops only get small bumps).
//
const EDGE_STONE_STEP = 9
const EDGE_STONE_CHANCE = 0.65
const EDGE_STONE_R_MIN = 3
const EDGE_STONE_R_RANGE = 4
const EDGE_STONE_INSET = 0.55
//
// Root bundles: segment count range per bundle.
//
const ROOT_SEGMENTS_MIN = 4
const ROOT_SEGMENTS_RANGE = 4
//
// Ferns: size range when sprouting from rock edges.
//
const FERN_SIZE_MIN = 22
const FERN_SIZE_RANGE = 26
//
// Hanging vine: S-curve, stem / contour widths, alternate oval leaves.
//
const VINE_CURVE = 9
const VINE_W = 2
const VINE_CONTOUR_W = 3.6
const VINE_STEP_PX = 6
const LEAF_EVERY = 2
const LEAF_RX_MIN = 3.5
const LEAF_RX_RANGE = 3
const LEAF_RY_FRAC = 0.5
const LEAF_TILT = 0.7
const LEAF_LIGHT_CHANCE = 0.3
//
// Leaf crown where a vine leaves the rock: a small fan of bigger leaves.
//
const CROWN_LEAVES_MIN = 3
const CROWN_LEAVES_RANGE = 3
const CROWN_LEAF_SCALE = 1.7
const CROWN_SPREAD = 2.2
const CROWN_LEAF_REACH = 0.8
//
// Boulders: smooth lumpy outline, lit cap, shaded side, a crack, moss tufts.
//
const BOULDER_VERTS = 14
const BOULDER_WOBBLE = 0.12
const BOULDER_FLATTEN = 0.72
const BOULDER_LIT_SHIFT = 0.28
const BOULDER_LIT_SCALE = 0.62
const BOULDER_SHADE_SHIFT = 0.3
const BOULDER_SHADE_SCALE = 0.75
const BOULDER_CRACK_W = 1.2
const BOULDER_CRACK_SEGS = 3
const BOULDER_CRACK_WANDER = 0.5
const BOULDER_GLINT_SHIFT = 0.4
const BOULDER_GLINT_RX = 0.2
const BOULDER_GLINT_RY = 0.15
const BOULDER_MOSS_SPAN = 0.7
//
// Platform slabs: no straight edges — a faint wave on the walkable top,
// rounded ends, ragged sides on grounds.
//
const PLATFORM_END_R = 7
const PLATFORM_END_STEP = 0.5
const PLATFORM_EDGE_STEP = 6
const PLATFORM_TOP_WAVE = 1.2
const PLATFORM_SIDE_RAGGED = 6
const PLATFORM_BOTTOM_JAG = 4
const PLATFORM_BOTTOM_JAG_FREQ = 3
//
// Moss strands (the reference's hanging leafy threads): a thin stem curving
// slightly, small leaflets packed along it on alternating sides, pointing
// down and out, shrinking toward the tip; a drop at the end.
//
const STRAND_STEP_PX = 4
const STRAND_CURVE = 4
const STRAND_STEM_W = 1.3
const STRAND_LEAF_EVERY = 3.2
const STRAND_LEAF_RX = 2.6
const STRAND_LEAF_RY = 1.5
const STRAND_LEAF_JITTER = 0.35
const STRAND_LEAF_TILT = 0.75
const STRAND_LEAF_REACH = 1.6
const STRAND_TIP_SCALE = 0.45
const STRAND_SHADOW = 0.9
const STRAND_LIGHT_CHANCE = 0.35
const STRAND_BUD = 3
const STRAND_DROP_R = 1.8
const STRAND_DROP_STRETCH = 1.4
const STRAND_DROP_ALPHA = 0.85
const HALF_TURN = Math.PI
const FULL_TURN = Math.PI * 2
const BYTE = 255

/**
 * CSS colour from a palette hex with optional alpha.
 * @param {string} hex - '#rrggbb' palette swatch
 * @param {number} [alpha=1]
 * @returns {string}
 */
export function css(hex, alpha = 1) {
  const { r, g, b } = forestRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}


/**
 * Paints a stony rock mass: base fill, packed stones in 3 tones with a lit
 * upper rim, inner occlusion and a dark contour.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array<{x: number, y: number}>} pts - Mass outline
 * @param {() => number} rng - Seeded random
 * @param {Object} [opts]
 * @param {string[]} [opts.tones] - Four tones dark → light (defaults to cave rock)
 * @param {number} [opts.stoneScale=1] - Stone size multiplier (bigger = farther clusters)
 * @param {boolean} [opts.contour=true] - Draw the outer contour
 * @param {boolean} [opts.edgeStones=false] - Break the outline with stones
 * @param {boolean} [opts.smooth=false] - Round every outline corner (no sharp angles)
 */
export function paintRockMass(ctx, pts, rng, opts = {}) {
  const tones = opts.tones ?? CAVE_PAL.rock
  const stoneScale = opts.stoneScale ?? 1
  const bounds = polygonBounds(pts)
  const path = opts.smooth ? smoothPath(pts) : polygonPath(pts)
  ctx.save()
  ctx.fillStyle = css(tones[1])
  ctx.fill(path)
  ctx.clip(path)
  const meanR = (STONE_R_MIN + STONE_R_RANGE / 2) * stoneScale
  const count = Math.ceil(bounds.w * bounds.h / (Math.PI * meanR * meanR) * STONE_FILL_DENSITY)
  for (let i = 0; i < count; i++) {
    const x = bounds.x + rng() * bounds.w
    const y = bounds.y + rng() * bounds.h
    const r = (STONE_R_MIN + rng() * STONE_R_RANGE) * stoneScale
    insidePath(ctx, path, x, y) && paintStone(ctx, x, y, r, rng, tones)
  }
  ctx.strokeStyle = css(tones[0], MASS_OCCLUSION_ALPHA)
  ctx.lineWidth = MASS_OCCLUSION_W
  ctx.stroke(path)
  ctx.restore()
  if (opts.contour === false) return
  ctx.strokeStyle = css(CAVE_PAL.contour)
  ctx.lineWidth = MASS_CONTOUR_W
  ctx.lineJoin = 'round'
  ctx.stroke(path)
  opts.edgeStones && paintEdgeStones(ctx, pts, path, rng, tones)
}

/**
 * Moss rim along a walkable top edge (2–3 tones, a few short drips).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x1 - Rim start X
 * @param {number} x2 - Rim end X
 * @param {(x: number) => number} topAt - Edge Y at X
 * @param {() => number} rng - Seeded random
 * @param {string[]} [tones] - Base / light / speck moss tones
 */
export function paintMossRim(ctx, x1, x2, topAt, rng, tones = CAVE_PAL.moss) {
  const [base, light, speck] = tones
  for (let x = x1; x <= x2; x += MOSS_STEP) {
    const y = topAt(x)
    const rx = MOSS_RX_MIN + rng() * MOSS_RX_RANGE
    const ry = MOSS_RY_MIN + rng() * MOSS_RY_RANGE
    ctx.fillStyle = css(base)
    fillEllipse(ctx, x, y + 1, rx, ry)
    rng() < MOSS_DRIP_CHANCE && ctx.fillRect(Math.round(x), y + 1, 1, MOSS_DRIP_LEN_MIN + rng() * MOSS_DRIP_LEN_RANGE)
    rng() < MOSS_LIGHT_CHANCE && (ctx.fillStyle = css(light), fillEllipse(ctx, x - rx * MOSS_LIGHT_SHIFT, y - ry * MOSS_LIGHT_SHIFT, rx * MOSS_LIGHT_SIZE, ry * MOSS_LIGHT_SIZE))
    rng() < MOSS_SPECK_CHANCE && (ctx.fillStyle = css(speck), ctx.fillRect(Math.round(x), Math.round(y - 1), 1, 1))
  }
}

/**
 * Stone spike (stalactite when dir = 1, stalagmite when dir = -1).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x - Base centre X
 * @param {number} y - Base Y
 * @param {number} w - Base width
 * @param {number} len - Length toward the tip
 * @param {number} dir - 1 hangs down, -1 points up
 * @param {() => number} rng - Seeded random
 * @param {string[]} [tones] - Dark / mid / light spike tones
 */
export function paintSpike(ctx, x, y, w, len, dir, rng, tones = CAVE_PAL.spike) {
  const [dark, mid, light] = tones
  const phase = rng() * FULL_TURN
  const bend = (rng() - 0.5) * w * SPIKE_TIP_BEND * 2
  const at = (t, side) => {
    const half = w / 2 * (Math.pow(1 - t, SPIKE_TAPER_POW) * (1 - SPIKE_TIP_W / w) + SPIKE_TIP_W / w)
    const lump = 1 + Math.sin(t * Math.PI * SPIKE_LUMP_FREQ + phase + side) * SPIKE_LUMP_AMP
    return { x: x + bend * t * t + side * half * lump, y: y + len * t * dir }
  }
  const pts = []
  for (let i = 0; i <= SPIKE_STEPS; i++) pts.push(at(i / SPIKE_STEPS, -1))
  for (let i = SPIKE_STEPS; i >= 0; i--) pts.push(at(i / SPIKE_STEPS, 1))
  for (let i = 1; i < SPIKE_BASE_POINTS; i++) {
    pts.push({ x: x + w / 2 * SPIKE_BASE_FLARE - w * SPIKE_BASE_FLARE * i / SPIKE_BASE_POINTS, y: y - dir * rng() * SPIKE_BASE_JAG })
  }
  const path = smoothPath(pts)
  const top = Math.min(y - SPIKE_BASE_JAG, y + len * dir)
  ctx.save()
  ctx.fillStyle = css(mid)
  ctx.fill(path)
  ctx.clip(path)
  ctx.fillStyle = css(light)
  ctx.fillRect(x - w, top, w * (1 - SPIKE_LIT_SHARE), len + SPIKE_BASE_JAG * 2)
  ctx.fillStyle = css(dark)
  ctx.fillRect(x + w / 2 - w * SPIKE_SHADE_SHARE + bend / 2, top, w, len + SPIKE_BASE_JAG * 2)
  ctx.strokeStyle = css(dark, SPIKE_RING_ALPHA)
  ctx.lineWidth = SPIKE_RING_W
  const rings = SPIKE_RINGS_MIN + Math.floor(rng() * SPIKE_RINGS_RANGE)
  for (let i = 0; i < rings; i++) {
    const t = (i + rng()) / (rings + 1)
    const l = at(t, -1)
    const r = at(t, 1)
    ctx.beginPath()
    ctx.moveTo(l.x, l.y)
    ctx.quadraticCurveTo((l.x + r.x) / 2, l.y + dir * w * SPIKE_LUMP_AMP, r.x, r.y)
    ctx.stroke()
  }
  ctx.strokeStyle = css(CAVE_PAL.rockRim, SPIKE_STREAK_ALPHA)
  ctx.lineWidth = SPIKE_STREAK_W
  ctx.beginPath()
  const s0 = at(SPIKE_STREAK_FROM, -1)
  const s1 = at(SPIKE_STREAK_TO, -1)
  ctx.moveTo(s0.x + w * SPIKE_STREAK_SHIFT, s0.y)
  ctx.lineTo(s1.x + w * SPIKE_STREAK_SHIFT / 2, s1.y)
  ctx.stroke()
  ctx.restore()
  ctx.strokeStyle = css(CAVE_PAL.contour)
  ctx.lineWidth = SPIKE_CONTOUR_W
  ctx.lineJoin = 'round'
  ctx.stroke(path)
}

/**
 * Root bundle grown from a point (shared tree-root relief look).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x - Root start X
 * @param {number} y - Root start Y
 * @param {number} angle - Growth direction (radians, PI/2 = down)
 * @param {number} thickness - Starting width
 * @param {() => number} rng - Seeded random
 * @param {number} [bias=0] - Lateral curl per segment
 */
export function paintRoot(ctx, x, y, angle, thickness, rng, bias = 0) {
  const rand = (min, max) => min + rng() * (max - min)
  const segs = growTreeRootSegments({
    x,
    y,
    angle,
    segments: ROOT_SEGMENTS_MIN + Math.floor(rng() * ROOT_SEGMENTS_RANGE),
    thickness,
    lateralBiasPerSegment: bias,
    rand
  }).map(s => ({ sx: s.startX, sy: s.startY, ex: s.endX, ey: s.endY, w: s.width }))
  paintRootRelief(ctx, segs, rng, {
    fill: forestRgb(CAVE_PAL.root),
    lit: forestRgb(CAVE_PAL.rootLit),
    contour: forestRgb(CAVE_PAL.contour)
  })
}

/**
 * Dark fern clump sprouting from a rock edge along its outward normal.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x - Root X
 * @param {number} y - Root Y
 * @param {number} angle - Rotation of "up" (0 = upright, PI/2 = grows right)
 * @param {() => number} rng - Seeded random
 * @param {number} [sizeScale=1]
 * @param {string[]} [tones] - Dark / mid / light frond tones
 */
export function paintEdgeFern(ctx, x, y, angle, rng, sizeScale = 1, tones = CAVE_PAL.plant) {
  const [dark, mid, light] = tones
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  drawFernToCanvas(ctx, {
    x: 0,
    baseY: 0,
    size: (FERN_SIZE_MIN + rng() * FERN_SIZE_RANGE) * sizeScale,
    rng,
    colors: { contour: css(CAVE_PAL.contour), dark: css(dark), mid: css(mid), light: css(light) }
  })
  ctx.restore()
}

/**
 * Leafy vine strand hanging down from a point: dark contour under a thin
 * stem, alternate oval leaves.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x - Pin X
 * @param {number} y - Pin Y
 * @param {number} len - Strand length
 * @param {() => number} rng - Seeded random
 * @param {Object} [opts]
 * @param {string[]} [opts.tones] - Dark / mid / light tones (defaults to cave plants)
 * @param {number} [opts.scale=1] - Leaf and stroke size multiplier
 * @param {boolean} [opts.contour=true] - Dark outline around stem and leaves
 * @param {boolean} [opts.crown=false] - A few leaves where the vine leaves the rock
 */
export function paintHangingVine(ctx, x, y, len, rng, opts = {}) {
  const [, mid, light] = opts.tones ?? CAVE_PAL.plant
  const scale = opts.scale ?? 1
  const contour = opts.contour !== false
  const steps = Math.max(2, Math.round(len / VINE_STEP_PX))
  const phase = rng() * FULL_TURN
  const pts = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    pts.push({ x: x + Math.sin(t * FULL_TURN + phase) * VINE_CURVE * scale * t, y: y + len * t })
  }
  const stroke = (color, width) => {
    ctx.strokeStyle = color
    ctx.lineWidth = width
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
    ctx.stroke()
  }
  contour && stroke(css(CAVE_PAL.contour), VINE_CONTOUR_W * scale)
  stroke(css(mid), VINE_W * scale)
  opts.crown && paintLeafCrown(ctx, x, y, rng, scale, mid, light)
  pts.forEach((p, i) => {
    if (i === 0 || i % LEAF_EVERY !== 0) return
    const side = (i / LEAF_EVERY) % 2 === 0 ? 1 : -1
    const rx = (LEAF_RX_MIN + rng() * LEAF_RX_RANGE) * scale
    ctx.beginPath()
    ctx.ellipse(p.x + side * rx, p.y, rx, rx * LEAF_RY_FRAC, side * LEAF_TILT, 0, FULL_TURN)
    ctx.fillStyle = css(rng() < LEAF_LIGHT_CHANCE ? light : mid)
    ctx.fill()
    if (!contour) return
    ctx.strokeStyle = css(CAVE_PAL.contour)
    ctx.lineWidth = 1
    ctx.stroke()
  })
}

/**
 * Moss strand hanging from a point: a thin curving stem densely set with
 * small leaflets (alternating sides, pointing down and out, smaller toward
 * the tip) over a soft drop shadow, with an optional drop at the tip.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x - Pin X
 * @param {number} y - Pin Y
 * @param {number} len - Strand length
 * @param {() => number} rng - Seeded random
 * @param {Object} [opts]
 * @param {string[]} [opts.tones] - Shadow / dark / mid / light / drop tones
 * @param {number} [opts.scale=1] - Leaflet size multiplier
 * @param {boolean} [opts.drop=true] - Hang a drop at the tip
 * @returns {{x: number, y: number}} Tip point (below the drop)
 */
export function paintMossStrand(ctx, x, y, len, rng, opts = {}) {
  const [shadow, dark, mid, light, drop] = opts.tones ?? CAVE_PAL.plantStrand
  const scale = opts.scale ?? 1
  const steps = Math.max(2, Math.round(len / STRAND_STEP_PX))
  const phase = rng() * FULL_TURN
  const curve = (rng() - 0.5) * 2 * STRAND_CURVE
  const stem = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    stem.push({ x: x + Math.sin(t * HALF_TURN + phase) * curve * t, y: y + len * t })
  }
  const leaflets = []
  for (let d = 0, side = 1; d < len; d += STRAND_LEAF_EVERY, side = -side) {
    const t = d / len
    const p = stem[Math.round(t * steps)]
    const size = scale * (1 - (1 - STRAND_TIP_SCALE) * t) * (1 + (rng() - 0.5) * STRAND_LEAF_JITTER * 2)
    leaflets.push({ x: p.x + side * STRAND_LEAF_REACH * size, y: p.y, size, side, tone: rng() < STRAND_LIGHT_CHANCE ? light : mid })
  }
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  leaflets.forEach(l => strandLeaflet(ctx, l.x + STRAND_SHADOW, l.y + STRAND_SHADOW, l.size, l.side, shadow))
  ctx.strokeStyle = css(dark)
  ctx.lineWidth = STRAND_STEM_W * scale
  ctx.beginPath()
  stem.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
  ctx.stroke()
  leaflets.forEach(l => strandLeaflet(ctx, l.x, l.y, l.size, l.side, l.tone))
  for (let b = 0; b < STRAND_BUD; b++) strandLeaflet(ctx, x + (rng() - 0.5) * STRAND_BUD * 2, y + rng() * STRAND_BUD, scale, b % 2 ? 1 : -1, b ? mid : dark)
  const tip = stem[stem.length - 1]
  if (opts.drop === false) return tip
  ctx.fillStyle = css(drop, STRAND_DROP_ALPHA)
  ctx.beginPath()
  ctx.ellipse(tip.x, tip.y + STRAND_DROP_R, STRAND_DROP_R, STRAND_DROP_R * STRAND_DROP_STRETCH, 0, 0, FULL_TURN)
  ctx.fill()
  return { x: tip.x, y: tip.y + STRAND_DROP_R * 2 }
}

/**
 * Smooth lumpy boulder sitting on a ground line: base tone, lit cap toward
 * the upper left, shaded lower right, one crack and a moss tuft on top.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx - Centre X
 * @param {number} groundY - Ground line it rests on
 * @param {number} r - Radius
 * @param {() => number} rng - Seeded random
 * @param {string[]} tones - Dark / base / light / highlight tones
 * @param {string[]} [mossTones] - Moss tones for the top tuft
 */
export function paintBoulder(ctx, cx, groundY, r, rng, tones, mossTones = CAVE_PAL.moss) {
  const cy = groundY - r * BOULDER_FLATTEN * (1 - BOULDER_WOBBLE)
  const pts = []
  const phase = rng() * FULL_TURN
  for (let i = 0; i < BOULDER_VERTS; i++) {
    const a = i / BOULDER_VERTS * FULL_TURN
    const rr = r * (1 + Math.sin(a * 2 + phase) * BOULDER_WOBBLE + (rng() - 0.5) * BOULDER_WOBBLE)
    pts.push({ x: cx + Math.cos(a) * rr, y: Math.min(groundY, cy + Math.sin(a) * rr * BOULDER_FLATTEN) })
  }
  const path = smoothPath(pts)
  ctx.save()
  ctx.fillStyle = css(tones[1])
  ctx.fill(path)
  ctx.clip(path)
  ctx.fillStyle = css(tones[0])
  fillEllipse(ctx, cx + r * BOULDER_SHADE_SHIFT, cy + r * BOULDER_SHADE_SHIFT, r * BOULDER_SHADE_SCALE, r * BOULDER_SHADE_SCALE * BOULDER_FLATTEN)
  ctx.fillStyle = css(tones[2])
  fillEllipse(ctx, cx - r * BOULDER_LIT_SHIFT, cy - r * BOULDER_LIT_SHIFT, r * BOULDER_LIT_SCALE, r * BOULDER_LIT_SCALE * BOULDER_FLATTEN)
  ctx.fillStyle = css(tones[3])
  fillEllipse(ctx, cx - r * BOULDER_GLINT_SHIFT, cy - r * BOULDER_GLINT_SHIFT, r * BOULDER_GLINT_RX, r * BOULDER_GLINT_RY)
  ctx.strokeStyle = css(tones[0])
  ctx.lineWidth = BOULDER_CRACK_W
  ctx.beginPath()
  let px = cx + (rng() - 0.5) * r
  let py = cy - r * BOULDER_FLATTEN
  ctx.moveTo(px, py)
  for (let i = 0; i < BOULDER_CRACK_SEGS; i++) {
    px += (rng() - 0.5) * r * BOULDER_CRACK_WANDER
    py += r * BOULDER_FLATTEN / BOULDER_CRACK_SEGS
    ctx.lineTo(px, py)
  }
  ctx.stroke()
  ctx.restore()
  ctx.strokeStyle = css(CAVE_PAL.contour)
  ctx.lineWidth = MASS_CONTOUR_W
  ctx.stroke(path)
  const half = r * BOULDER_MOSS_SPAN / 2
  paintMossRim(ctx, cx - half, cx + half, x => cy - Math.sqrt(Math.max(0, r * r - (x - cx) * (x - cx))) * BOULDER_FLATTEN, rng, mossTones)
}

/**
 * Platform slab in the gameplay look: flat walkable top with rounded
 * corners, the shared tapered wavy underside (Layout.platformBottomAt), a
 * stony body and a moss rim.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} p - Platform ({x1, x2, y, h, kind} like Layout.PLATFORMS)
 * @param {() => number} rng - Seeded random
 * @param {Object} [opts]
 * @param {string[]} [opts.tones] - Rock tones
 * @param {string[]} [opts.mossTones] - Moss tones
 * @param {number} [opts.stoneScale=1] - Stone size multiplier
 * @param {number} [opts.mossX1] - Moss rim start (defaults to the art start)
 * @param {number} [opts.mossX2] - Moss rim end (defaults to the art end)
 * @returns {(x: number) => number} Underside Y at X
 */
export function paintPlatformSlab(ctx, p, rng, opts = {}) {
  const { x1, x2 } = Layout.platformArtSpan(p)
  const bottomAt = x => Layout.platformBottomAt(p, x)
  const isGround = p.kind === Layout.PLATFORM_KIND.GROUND
  const r = isGround ? PLATFORM_END_R : Math.max(PLATFORM_END_R, (Math.min(bottomAt(x1), bottomAt(x2)) - p.y) / 2)
  const seed = rng() * FULL_TURN
  const top = sampleEdge(x1 + r, x2 - r, PLATFORM_EDGE_STEP, x => ({ x, y: p.y + Layout.profileNoise(x, seed) * PLATFORM_TOP_WAVE }))
  const end = (cx, sign) => sampleEdge(-HALF_TURN / 2, HALF_TURN / 2, PLATFORM_END_STEP, a => ({
    x: cx + sign * Math.cos(a) * r,
    y: p.y + r + Math.sin(a) * r
  }))
  const deepY = Layout.WORLD_H + Layout.WALL_COLLIDE_W
  const side = (sx, sign, from, to) => sampleEdge(from, to, PLATFORM_EDGE_STEP, y => ({
    x: sx + sign * Layout.profileNoise(y, seed + sx) * PLATFORM_SIDE_RAGGED,
    y
  }))
  const pts = isGround
    ? [...top, ...end(x2 - r, 1), ...side(x2, 1, p.y + r * 2, deepY), ...side(x1, -1, deepY, p.y + r * 2), ...end(x1 + r, -1).reverse()]
    : [...top, ...end(x2 - r, 1), ...sampleEdge(x2 - r, x1 + r, PLATFORM_EDGE_STEP, x => ({
        x,
        y: Math.max(p.y + r * 2, bottomAt(x)) + Layout.profileNoise(x * PLATFORM_BOTTOM_JAG_FREQ, seed) * PLATFORM_BOTTOM_JAG
      })), ...end(x1 + r, -1).reverse()]
  paintRockMass(ctx, pts, rng, { tones: opts.tones, stoneScale: opts.stoneScale, edgeStones: true, smooth: true })
  paintMossRim(ctx, opts.mossX1 ?? x1, opts.mossX2 ?? x2, x => p.y + Layout.profileNoise(x, seed) * PLATFORM_TOP_WAVE, rng, opts.mossTones)
  return bottomAt
}

/**
 * Kaplay colour that multiplies art into the cave shade (darker background
 * props riding a parallax row).
 * @param {Object} k - Kaplay instance
 * @param {number} amount - 0 (untouched) … 1 (the darkness swatch)
 * @returns {Object} Kaplay rgb
 */
export function caveShadeColor(k, amount) {
  const tint = forestRgb(CAVE_PAL.darkness)
  const shade = c => Math.round(BYTE - amount * (BYTE - c))
  return k.rgb(shade(tint.r), shade(tint.g), shade(tint.b))
}

/**
 * Builds an outline by sampling a function along one axis.
 * @param {number} from - Start coordinate
 * @param {number} to - End coordinate
 * @param {number} step - Sample step
 * @param {(v: number) => {x: number, y: number}} at - Point at coordinate
 * @returns {Array<{x: number, y: number}>}
 */
export function sampleEdge(from, to, step, at) {
  const out = []
  const dir = to >= from ? 1 : -1
  for (let v = from; dir > 0 ? v < to : v > to; v += step * dir) out.push(at(v))
  out.push(at(to))
  return out
}
//
// One packed stone: irregular polygon in a weighted tone, lit top-left rim
// and a thin contour.
//
function paintStone(ctx, x, y, r, rng, tones) {
  const verts = STONE_VERTS_MIN + Math.floor(rng() * STONE_VERTS_RANGE)
  const pts = []
  const turn = rng() * FULL_TURN
  for (let i = 0; i < verts; i++) {
    const a = turn + i / verts * FULL_TURN
    const rr = r * (1 - STONE_RADIUS_JITTER / 2 + rng() * STONE_RADIUS_JITTER)
    pts.push({ x: x + Math.cos(a) * rr, y: y + Math.sin(a) * rr * STONE_FLATTEN_Y })
  }
  const path = polygonPath(pts)
  ctx.fillStyle = css(tones[pickWeighted(rng, STONE_TONE_WEIGHTS)])
  ctx.fill(path)
  ctx.strokeStyle = css(tones[0], STONE_CONTOUR_ALPHA)
  ctx.lineWidth = STONE_CONTOUR_W
  ctx.stroke(path)
  const litR = r * STONE_LIT_RADIUS
  ctx.beginPath()
  ctx.ellipse(x, y, litR, litR * STONE_FLATTEN_Y, 0, STONE_LIT_ARC_FROM, STONE_LIT_ARC_TO)
  ctx.strokeStyle = css(tones[3], STONE_LIT_ALPHA)
  ctx.lineWidth = STONE_LIT_W
  ctx.stroke()
  return path
}
//
// Index from cumulative weights.
//
function pickWeighted(rng, weights) {
  let t = rng()
  for (let i = 0; i < weights.length; i++) {
    t -= weights[i]
    if (t <= 0) return i
  }
  return weights.length - 1
}
//
// Stones sitting on the outline of a mass (mostly inside it), so its edge
// reads as a broken line of rocks rather than a clean cut.
//
function paintEdgeStones(ctx, pts, path, rng, tones) {
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]
    const b = pts[(i + 1) % pts.length]
    const len = Math.hypot(b.x - a.x, b.y - a.y)
    for (let d = 0; d < len; d += EDGE_STONE_STEP) {
      if (rng() > EDGE_STONE_CHANCE) continue
      const t = d / len
      const r = EDGE_STONE_R_MIN + rng() * EDGE_STONE_R_RANGE
      const nx = -(b.y - a.y) / len
      const ny = (b.x - a.x) / len
      let x = a.x + (b.x - a.x) * t
      let y = a.y + (b.y - a.y) * t
      const inward = insidePath(ctx, path, x + nx * r, y + ny * r) ? 1 : -1
      x += nx * r * EDGE_STONE_INSET * inward
      y += ny * r * EDGE_STONE_INSET * inward
      const stone = paintStone(ctx, x, y, r, rng, tones)
      ctx.strokeStyle = css(CAVE_PAL.contour)
      ctx.lineWidth = STONE_CONTOUR_W
      ctx.stroke(stone)
    }
  }
}
//
// Fan of bigger leaves around a vine's root point, spreading downward.
//
//
// One leaflet of a moss strand: a small oval tilted down and out.
//
function strandLeaflet(ctx, x, y, size, side, tone) {
  ctx.fillStyle = css(tone)
  ctx.beginPath()
  ctx.ellipse(x, y, STRAND_LEAF_RX * size, STRAND_LEAF_RY * size, side * STRAND_LEAF_TILT, 0, FULL_TURN)
  ctx.fill()
}
function paintLeafCrown(ctx, x, y, rng, scale, mid, light) {
  const count = CROWN_LEAVES_MIN + Math.floor(rng() * CROWN_LEAVES_RANGE)
  for (let i = 0; i < count; i++) {
    const a = Math.PI / 2 + (i / Math.max(1, count - 1) - 0.5) * CROWN_SPREAD
    const rx = (LEAF_RX_MIN + rng() * LEAF_RX_RANGE) * scale * CROWN_LEAF_SCALE
    ctx.beginPath()
    ctx.ellipse(x + Math.cos(a) * rx * CROWN_LEAF_REACH, y + Math.sin(a) * rx * CROWN_LEAF_REACH, rx, rx * LEAF_RY_FRAC, a, 0, FULL_TURN)
    ctx.fillStyle = css(rng() < LEAF_LIGHT_CHANCE ? light : mid)
    ctx.fill()
  }
}
//
// Closed outline through vertex midpoints with quadratic corners (smooth).
//
function smoothPath(pts) {
  const path = new Path2D()
  const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
  const start = mid(pts[pts.length - 1], pts[0])
  path.moveTo(start.x, start.y)
  pts.forEach((p, i) => {
    const m = mid(p, pts[(i + 1) % pts.length])
    path.quadraticCurveTo(p.x, p.y, m.x, m.y)
  })
  path.closePath()
  return path
}
//
// Hit test in drawing coordinates (isPointInPath expects device pixels, the
// path itself follows the context transform, e.g. the half-res bakes).
//
function insidePath(ctx, path, x, y) {
  const m = ctx.getTransform()
  return ctx.isPointInPath(path, m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f)
}
//
// Closed polygon as a reusable Path2D (fill, clip, hit test, stroke).
//
function polygonPath(pts) {
  const path = new Path2D()
  pts.forEach((p, i) => (i === 0 ? path.moveTo(p.x, p.y) : path.lineTo(p.x, p.y)))
  path.closePath()
  return path
}
function fillEllipse(ctx, x, y, rx, ry) {
  ctx.beginPath()
  ctx.ellipse(x, y, rx, ry, 0, 0, FULL_TURN)
  ctx.fill()
}
function polygonBounds(pts) {
  const xs = pts.map(p => p.x)
  const ys = pts.map(p => p.y)
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y }
}
