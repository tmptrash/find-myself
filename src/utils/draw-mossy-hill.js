//
// Canvas2D rocky hill in the look of the glow reference: a heap of big
// boulders makes most of the mass, a ragged moss blanket drapes over their
// tops (thick in places, torn open in others so bare stone shows through),
// and low round-leaf clover grows along the foot. The slope climbs from the
// left foot to its highest point at hill.x2, so the hill can lean against a
// wall (hill.peakLeft mirrors that). An optional flat crest (hill.plateau)
// keeps a walkable top. Plants on top are left to the caller (mossyHillTopY
// roots them).
//
const HILL_SHAPE_POW = 2.1
const HILL_OUTLINE_STEP = 3
const HILL_BASE_SINK = 3
const HILL_CONTOUR_PX = 1.5
const HILL_ROCK_R_MIN = 16
const HILL_ROCK_R_HEIGHT = 0.62
const HILL_ROCK_R_JITTER = 0.25
const HILL_ROCK_STEP = 0.8
const HILL_ROCK_SQUASH = 0.78
const HILL_ROCK_TOP_SINK = 0.18
const HILL_ROCK_BACK_ROW_LIFT = 0.45
const HILL_ROCK_VERTS = 18
const HILL_ROCK_VERT_JITTER = 0.28
const HILL_ROCK_CRACK_SEGMENTS_MIN = 4
const HILL_ROCK_CRACK_SEGMENTS_RANGE = 4
const HILL_ROCK_CRACK_WOBBLE_PX = 3.6
const HILL_ROCK_CRACKS_MAX = 3
const HILL_ROCK_LIGHT_SHIFT_X = 0.16
const HILL_ROCK_LIGHT_SHIFT_Y = 0.7
const HILL_ROCK_SHADE_SHIFT_X = 0.07
const HILL_ROCK_SHADE_SHIFT_Y = 0.16
const HILL_ROCK_TONE_EDGE_WOBBLE = 2.4
const HILL_ROCK_OUTLINE_PX = 1.3
const HILL_ROCK_CRACK_CHANCE = 0.7
const HILL_ROCK_CRACK_PX = 1.2
const HILL_MOSS_BASE = 15
const HILL_MOSS_WAVE_A = 15
const HILL_MOSS_WAVE_F = 1 / 60
const HILL_MOSS_RIPPLE_A = 6
const HILL_MOSS_RIPPLE_F = 1 / 17
const HILL_MOSS_LEFT_BOOST = 0.4
const HILL_MOSS_TOP_LIFT = 2
const HILL_MOSS_EDGE_PX = 1.4
const HILL_MOSS_MID_DROP = 0.3
const HILL_MOSS_DRIP_STEP = 7
const HILL_MOSS_DRIP_R_MIN = 3
const HILL_MOSS_DRIP_R_RANGE = 5
const HILL_CLOVER_PER_PX = 0.22
const HILL_CLOVER_R_MIN = 3
const HILL_CLOVER_R_RANGE = 5
const HILL_CLOVER_LIGHT_DEPTH = 0.5
const HILL_GLINT_CHANCE = 0.12
const HILL_TOP_TUFTS_PER_PX = 0.08
const HILL_TOP_TUFT_R_MIN = 4
const HILL_TOP_TUFT_R_RANGE = 7
const HILL_ROCK_MOSS_PATCH_CHANCE = 0.55
const HILL_ROCK_MOSS_PATCH_CLOVERS = 5
const HILL_FOOT_STEP_MIN = 22
const HILL_FOOT_STEP_RANGE = 30
const HILL_FOOT_SKIP_CHANCE = 0.3
const HILL_FOOT_H_MIN = 12
const HILL_FOOT_H_RANGE = 18
const HILL_FOOT_LEAVES = 14
const HILL_FOOT_LEAF_R_MIN = 4
const HILL_FOOT_LEAF_R_RANGE = 4
const HILL_BOUNDS_PAD = 8

/**
 * Paints the boulder heap, its moss blanket and the clover at its foot.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} opts
 * @param {Object} opts.hill - { x1, x2, floorY, height, peakLeft?, plateau? } footprint; peak at x2 (x1 when peakLeft), plateau = flat crest fraction of the width
 * @param {() => number} opts.rng - Seeded random in [0, 1)
 * @param {Object} opts.colors - Hex colours
 * @param {string} opts.colors.contour - Hill, stone and leaf contour
 * @param {string} opts.colors.stoneDark - Shaded boulder faces and cracks
 * @param {string} opts.colors.stone - Boulder body and the gaps between boulders
 * @param {string} opts.colors.stoneLight - Boulder lit faces (upper left)
 * @param {string} opts.colors.deep - Cool shade under the moss edge
 * @param {string} opts.colors.shadow - Moss shadow mass
 * @param {string} opts.colors.mid - Moss mid mass
 * @param {string} opts.colors.light - Sunlit clover
 * @param {string} opts.colors.glint - Rare bright specks
 * @param {number} [opts.greeneryMaxY] - Moss and clover stay above this Y (lake islands)
 */
export function drawMossyHillToCanvas(ctx, opts) {
  const { hill, rng, colors, greeneryMaxY } = opts
  const rocks = buildRocks(hill, rng)
  const moss = buildMossEdge(hill, rng)
  ctx.fillStyle = colors.contour
  traceProfile(ctx, hill, HILL_CONTOUR_PX)
  ctx.fill()
  ctx.save()
  traceProfile(ctx, hill, 0)
  ctx.clip()
  ctx.fillStyle = colors.stone
  traceProfile(ctx, hill, 0)
  ctx.fill()
  rocks.forEach(rock => paintRock(ctx, rock, rng, colors))
  greeneryMaxY != null && ctx.save()
  greeneryMaxY != null && clipGreeneryAbove(ctx, greeneryMaxY)
  paintMoss(ctx, hill, moss, rng, colors)
  rocks.forEach(rock => rock.patch && paintRockMossPatch(ctx, rock, rng, colors))
  greeneryMaxY != null && ctx.restore()
  ctx.restore()
  paintTopTufts(ctx, hill, rng, colors, greeneryMaxY)
  paintFootClover(ctx, hill, rng, colors, greeneryMaxY)
}

/**
 * Hill top line at world x; up is a smaller Y. Rises from the foot to the
 * peak (x2, or x1 when peakLeft) and stays flat across the plateau.
 * @param {Object} hill - { x1, x2, floorY, height, peakLeft?, plateau? }
 * @param {number} x - World X
 * @returns {number}
 */
export function mossyHillTopY(hill, x) {
  const t = Math.max(0, Math.min(1, hillFootDistance(hill, x) / hillSlopeWidth(hill)))
  const s = 1 - Math.pow(1 - t, HILL_SHAPE_POW)
  return hill.floorY - s * hill.height
}

/**
 * Conservative world bounds of the hill plus headroom for plants on top.
 * @param {Object} hill - { x1, x2, floorY, height }
 * @param {number} plantPad - Extra height reserved above the peak
 * @returns {{x1: number, y1: number, x2: number, y2: number}}
 */
export function mossyHillBounds(hill, plantPad) {
  return {
    x1: hill.x1 - HILL_BOUNDS_PAD,
    y1: hill.floorY - hill.height - plantPad,
    x2: hill.x2 + HILL_BOUNDS_PAD,
    y2: hill.floorY + HILL_BASE_SINK + HILL_BOUNDS_PAD
  }
}
//
// Distance from the foot along the slope, and the slope's horizontal span.
//
function hillFootDistance(hill, x) {
  return hill.peakLeft ? hill.x2 - x : x - hill.x1
}
function hillSlopeWidth(hill) {
  return (hill.x2 - hill.x1) * (1 - (hill.plateau ?? 0))
}
//
// Silhouette under the top line, grown by `grow` px for the contour pass.
// Either end may be the tall side, so both get a vertical edge.
//
function traceProfile(ctx, hill, grow) {
  const { x1, x2 } = hill
  const baseY = hill.floorY + HILL_BASE_SINK
  ctx.beginPath()
  ctx.moveTo(x1 - grow, baseY)
  ctx.lineTo(x1 - grow, mossyHillTopY(hill, x1) - grow)
  for (let x = x1; x <= x2; x += HILL_OUTLINE_STEP) ctx.lineTo(x, mossyHillTopY(hill, x) - grow)
  ctx.lineTo(x2 + grow, mossyHillTopY(hill, x2) - grow)
  ctx.lineTo(x2 + grow, baseY)
  ctx.closePath()
}
//
// Two rows of boulders sized by the local hill height: a back row lifted
// toward the top line, a front row sunk into the ground. Drawn back to front.
//
function buildRocks(hill, rng) {
  const rocks = []
  for (const row of [0, 1]) {
    let x = hill.x1 + HILL_ROCK_R_MIN * (row ? 1.6 : 0.6)
    while (x < hill.x2 + HILL_ROCK_R_MIN) {
      const top = mossyHillTopY(hill, Math.min(x, hill.x2))
      const depth = hill.floorY - top
      const r = (HILL_ROCK_R_MIN + depth * HILL_ROCK_R_HEIGHT) * (1 + (rng() - 0.5) * HILL_ROCK_R_JITTER * 2)
      const ry = r * HILL_ROCK_SQUASH
      const cy = row
        ? hill.floorY - ry * (1 - HILL_ROCK_TOP_SINK)
        : top + ry * (1 - HILL_ROCK_BACK_ROW_LIFT) + depth * HILL_ROCK_TOP_SINK
      rocks.push({ cx: x, cy, rx: r, ry, verts: buildRockOutline(rng), patch: rng() < HILL_ROCK_MOSS_PATCH_CHANCE })
      x += r * HILL_ROCK_STEP * (1 + rng() * 0.4)
    }
  }
  return rocks
}
//
// Unit outline with a little per-vertex wobble so no stone is a clean ellipse.
//
function buildRockOutline(rng) {
  const verts = []
  for (let i = 0; i < HILL_ROCK_VERTS; i++) verts.push(1 + (rng() - 0.5) * HILL_ROCK_VERT_JITTER * 2)
  return verts
}
function traceRock(ctx, rock, dx, dy, grow) {
  ctx.beginPath()
  rock.verts.forEach((v, i) => {
    const a = (i / rock.verts.length) * Math.PI * 2
    const px = rock.cx + dx + Math.cos(a) * (rock.rx * v + grow)
    const py = rock.cy + dy + Math.sin(a) * (rock.ry * v + grow)
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
  })
  ctx.closePath()
}
//
// Tone fill boundary — same offset as traceRock but with a mild per-vertex
// radius wobble so light/shade edges are not perfect elliptical arcs.
//
function traceRockTone(ctx, rock, dx, dy, grow, rng, edgeWobble) {
  ctx.beginPath()
  rock.verts.forEach((v, i) => {
    const a = (i / rock.verts.length) * Math.PI * 2
    const wobble = (rng() - 0.5) * edgeWobble * 2
    const px = rock.cx + dx + Math.cos(a) * (rock.rx * v + grow + wobble)
    const py = rock.cy + dy + Math.sin(a) * (rock.ry * v + grow + wobble * 0.85)
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
  })
  ctx.closePath()
}
function fillRockTone(ctx, rock, rng, dx, dy, color, edgeWobble) {
  ctx.fillStyle = color
  traceRockTone(ctx, rock, dx, dy, 0, rng, edgeWobble)
  ctx.fill()
}
//
// Lit from the upper left: dark body, the same outline shifted up-left in
// the mid tone leaves a shaded crescent low on the right, a further shifted
// copy lights the top cap; contour and an optional crack.
//
function paintRock(ctx, rock, rng, colors) {
  ctx.fillStyle = colors.contour
  traceRock(ctx, rock, 0, 0, HILL_ROCK_OUTLINE_PX)
  ctx.fill()
  ctx.save()
  traceRock(ctx, rock, 0, 0, 0)
  ctx.clip()
  ctx.fillStyle = colors.stoneDark
  ctx.fill()
  fillRockTone(
    ctx, rock, rng,
    -rock.rx * HILL_ROCK_SHADE_SHIFT_X,
    -rock.ry * HILL_ROCK_SHADE_SHIFT_Y,
    colors.stone,
    HILL_ROCK_TONE_EDGE_WOBBLE
  )
  fillRockTone(
    ctx, rock, rng,
    -rock.rx * HILL_ROCK_LIGHT_SHIFT_X,
    -rock.ry * HILL_ROCK_LIGHT_SHIFT_Y,
    colors.stoneLight,
    HILL_ROCK_TONE_EDGE_WOBBLE * 0.85
  )
  ctx.restore()
  const crackCount = 1 + Math.floor(rng() * HILL_ROCK_CRACKS_MAX)
  for (let c = 0; c < crackCount; c++) {
    rng() <= HILL_ROCK_CRACK_CHANCE && paintRockCrack(ctx, rock, rng, colors)
  }
}
//
// Jagged, slightly soft crack on a boulder face (not ruler-straight segments).
//
function paintRockCrack(ctx, rock, rng, colors) {
  const sx = rock.cx - rock.rx * (0.05 + rng() * 0.45)
  const sy = rock.cy - rock.ry * (0.15 + rng() * 0.45)
  const segCount = HILL_ROCK_CRACK_SEGMENTS_MIN + Math.floor(rng() * HILL_ROCK_CRACK_SEGMENTS_RANGE)
  let px = sx
  let py = sy
  const pts = [{ x: px, y: py }]
  for (let s = 0; s < segCount; s++) {
    px += rock.rx * (0.05 + rng() * 0.16) * (rng() < 0.32 ? -1 : 1)
    py += rock.ry * (0.07 + rng() * 0.18)
    pts.push({
      x: px + (rng() - 0.5) * HILL_ROCK_CRACK_WOBBLE_PX,
      y: py + (rng() - 0.5) * HILL_ROCK_CRACK_WOBBLE_PX
    })
  }
  const drawStroke = (width, alpha, style) => {
    ctx.strokeStyle = style
    ctx.lineWidth = width
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.globalAlpha = alpha
    ctx.beginPath()
    ctx.moveTo(pts[0].x, pts[0].y)
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1]
      const cur = pts[i]
      const cpx = (prev.x + cur.x) * 0.5 + (rng() - 0.5) * HILL_ROCK_CRACK_WOBBLE_PX * 0.6
      const cpy = (prev.y + cur.y) * 0.5 + (rng() - 0.5) * HILL_ROCK_CRACK_WOBBLE_PX * 0.6
      ctx.quadraticCurveTo(cpx, cpy, cur.x, cur.y)
    }
    ctx.stroke()
  }
  drawStroke(HILL_ROCK_CRACK_PX + 1.1, 0.22, colors.stone)
  drawStroke(HILL_ROCK_CRACK_PX + rng() * 0.45, 0.5 + rng() * 0.35, colors.stoneDark)
  ctx.globalAlpha = 1
}
//
// Moss thickness along the hill: two waves with random phases plus a bias
// toward the low slope, clamped at zero so the blanket tears open.
//
function buildMossEdge(hill, rng) {
  const p1 = rng() * Math.PI * 2
  const p2 = rng() * Math.PI * 2
  const pts = []
  for (let x = hill.x1; x <= hill.x2; x += HILL_OUTLINE_STEP) {
    const t = Math.min(1, hillFootDistance(hill, x) / (hill.x2 - hill.x1))
    const th = HILL_MOSS_BASE * (1 + HILL_MOSS_LEFT_BOOST * (1 - t)) +
      HILL_MOSS_WAVE_A * Math.sin(x * HILL_MOSS_WAVE_F + p1) +
      HILL_MOSS_RIPPLE_A * Math.sin(x * HILL_MOSS_RIPPLE_F + p2) * (0.5 + rng() * 0.5)
    pts.push({ x, top: mossyHillTopY(hill, x) - HILL_MOSS_TOP_LIFT, th: Math.max(0, th) })
  }
  return pts
}
function traceMoss(ctx, moss, thScale, grow) {
  ctx.beginPath()
  moss.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.top) : ctx.lineTo(p.x, p.top))
  for (let i = moss.length - 1; i >= 0; i--) ctx.lineTo(moss[i].x, moss[i].top + moss[i].th * thScale + grow)
  ctx.closePath()
}
//
// Shadow and mid masses, a lumpy lower edge of clover drips (each with a
// dark rim so the moss reads as lying on the stone), then scattered clover
// clusters of varied size (lighter toward the top) for the leafy texture.
//
function paintMoss(ctx, hill, moss, rng, colors) {
  ctx.fillStyle = colors.shadow
  traceMoss(ctx, moss, 1, 0)
  ctx.fill()
  paintMossDrips(ctx, moss, rng, colors)
  ctx.fillStyle = colors.mid
  traceMoss(ctx, moss, 1 - HILL_MOSS_MID_DROP, 0)
  ctx.fill()
  const count = Math.round((hill.x2 - hill.x1) * HILL_CLOVER_PER_PX)
  for (let i = 0; i < count; i++) {
    const p = moss[Math.floor(rng() * moss.length)]
    if (p.th < HILL_CLOVER_R_MIN) continue
    const depth = rng()
    const r = HILL_CLOVER_R_MIN + rng() * HILL_CLOVER_R_RANGE
    const color = depth < HILL_CLOVER_LIGHT_DEPTH ? colors.light : (rng() < 0.5 ? colors.mid : colors.shadow)
    paintClover(ctx, p.x + (rng() - 0.5) * HILL_OUTLINE_STEP * 2, p.top + p.th * depth, r, rng() * Math.PI * 2, color)
    if (depth < HILL_CLOVER_LIGHT_DEPTH && rng() < HILL_GLINT_CHANCE) {
      ctx.fillStyle = colors.glint
      ctx.fillRect(Math.round(p.x - r * 0.3), Math.round(p.top + p.th * depth - r * 0.4), 2, 2)
    }
  }
}
function paintMossDrips(ctx, moss, rng, colors) {
  const step = Math.max(1, Math.round(HILL_MOSS_DRIP_STEP / HILL_OUTLINE_STEP))
  for (let i = 0; i < moss.length; i += step) {
    const p = moss[i]
    if (p.th <= 0) continue
    const r = Math.min(p.th, HILL_MOSS_DRIP_R_MIN + rng() * HILL_MOSS_DRIP_R_RANGE)
    const x = p.x + (rng() - 0.5) * HILL_MOSS_DRIP_STEP
    const y = p.top + p.th - r * 0.2
    const a = rng() * Math.PI * 2
    paintClover(ctx, x, y, r + HILL_MOSS_EDGE_PX, a, colors.deep)
    paintClover(ctx, x, y, r, a, colors.shadow)
  }
}
//
// A clover-like clump: three overlapping lobes around a centre.
//
function paintClover(ctx, x, y, r, angle, color) {
  ctx.fillStyle = color
  ctx.beginPath()
  for (let i = 0; i < 3; i++) {
    const a = angle + (i / 3) * Math.PI * 2
    const lx = x + Math.cos(a) * r * 0.55
    const ly = y + Math.sin(a) * r * 0.45
    ctx.moveTo(lx + r * 0.6, ly)
    ctx.arc(lx, ly, r * 0.6, 0, Math.PI * 2)
  }
  ctx.fill()
}
//
// Small moss patch on the upper rim of a boulder lower on the heap.
//
function paintRockMossPatch(ctx, rock, rng, colors) {
  const cx = rock.cx - rock.rx * (0.1 + rng() * 0.3)
  const cy = rock.cy - rock.ry * 0.78
  for (let i = 0; i < HILL_ROCK_MOSS_PATCH_CLOVERS; i++) {
    const r = HILL_CLOVER_R_MIN + rng() * HILL_CLOVER_R_RANGE * 0.6
    const x = cx + (rng() - 0.5) * rock.rx * 0.9
    const y = cy + rng() * rock.ry * 0.25
    paintClover(ctx, x, y + 1, r + 1, rng() * Math.PI * 2, colors.deep)
    paintClover(ctx, x, y, r, rng() * Math.PI * 2, i % 2 ? colors.mid : colors.light)
  }
}
//
// Irregular clumps poking above the top line so the crest is not a clean curve.
//
//
// Keeps moss and clover above the water line on lake islands (stones may go lower).
//
function clipGreeneryAbove(ctx, maxY) {
  const span = 8192
  ctx.beginPath()
  ctx.rect(-span, -span, span * 2, maxY + span)
  ctx.clip()
}
function paintTopTufts(ctx, hill, rng, colors, greeneryMaxY = null) {
  const count = Math.round((hill.x2 - hill.x1) * HILL_TOP_TUFTS_PER_PX)
  for (let i = 0; i < count; i++) {
    const x = hill.x1 + (hill.x2 - hill.x1) * (0.04 + rng() * 0.95)
    const r = HILL_TOP_TUFT_R_MIN + rng() * HILL_TOP_TUFT_R_RANGE
    const y = mossyHillTopY(hill, x) + r * 0.2
    if (greeneryMaxY != null && y > greeneryMaxY) continue
    const a = rng() * Math.PI * 2
    paintClover(ctx, x, y, r + HILL_CONTOUR_PX, a, colors.contour)
    paintClover(ctx, x, y, r, a, colors.shadow)
    paintClover(ctx, x - r * 0.15, y - r * 0.2, r * 0.7, a, rng() < 0.6 ? colors.light : colors.mid)
  }
}
//
// Low round-leaf clover growing along the hill foot; some gaps leave the
// bottom stones visible.
//
function paintFootClover(ctx, hill, rng, colors, greeneryMaxY = null) {
  for (let x = hill.x1 + HILL_FOOT_STEP_MIN; x < hill.x2; x += HILL_FOOT_STEP_MIN + rng() * HILL_FOOT_STEP_RANGE) {
    if (rng() < HILL_FOOT_SKIP_CHANCE) continue
    const h = HILL_FOOT_H_MIN + rng() * HILL_FOOT_H_RANGE
    const leaves = []
    for (let i = 0; i < HILL_FOOT_LEAVES; i++) {
      const u = rng()
      const y = hill.floorY - u * h
      if (greeneryMaxY != null && y > greeneryMaxY) continue
      leaves.push({
        x: x + (rng() - 0.5) * h * 1.6,
        y,
        r: HILL_FOOT_LEAF_R_MIN + rng() * HILL_FOOT_LEAF_R_RANGE,
        tone: u > 0.55 ? colors.light : (u > 0.25 ? colors.mid : colors.shadow)
      })
    }
    if (!leaves.length) continue
    leaves.sort((a, b) => b.y - a.y)
    ctx.fillStyle = colors.contour
    leaves.forEach(leaf => {
      ctx.beginPath()
      ctx.ellipse(leaf.x, leaf.y, leaf.r + HILL_CONTOUR_PX, leaf.r * 0.82 + HILL_CONTOUR_PX, 0, 0, Math.PI * 2)
      ctx.fill()
    })
    leaves.forEach(leaf => {
      ctx.fillStyle = leaf.tone
      ctx.beginPath()
      ctx.ellipse(leaf.x, leaf.y, leaf.r, leaf.r * 0.82, 0, 0, Math.PI * 2)
      ctx.fill()
    })
  }
}
