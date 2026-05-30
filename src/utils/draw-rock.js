//
// Pure Canvas2D drawing primitives for procedurally-generated rocks
// (irregular quadratic-Bezier silhouettes with vertical gradient body,
// scattered mottling blotches, crack lines, sheen highlight, contact
// shadow and outline stroke). Shared between Touch L0's main rock
// sprites (`buildSingleRock`), the touch section floor-rock utility
// (`floor-rocks.js`) and the ready/menu background generator so every
// rock in the game uses the same silhouette + shading pipeline.
//
const BASE_R = 76
const BASE_G = 76
const BASE_B = 80
const TINT_MIN = -8
const TINT_RANGE = 24
const VERT_COUNT_MIN = 14
const VERT_COUNT_RANGE = 9
const VERT_RADIUS_BASE = 0.82
const VERT_RADIUS_RANGE = 0.28
const VERT_HEAVY_SIDE = 1.05
const VERT_LIGHT_SIDE = 0.92
const VERT_ANGLE_JITTER = 0.18
const VERT_FLATTEN_Y = 0.62
const LIGHT_OFFSET = 32
const DARK_OFFSET = 28
const BLUE_TINT_OFFSET = 4
const BLOTCH_COUNT_MIN = 6
const BLOTCH_COUNT_RANGE = 6
const CRACK_COUNT_RANGE = 3
const OUTLINE_ALPHA = 0.55
const OUTLINE_WIDTH = 1.4
const SHEEN_ALPHA = 0.12
const SHADOW_GROUND_ALPHA = 0.28
const SHADOW_CONTACT_ALPHA = 0.22

/**
 * Generates an irregular polygon (vertices around an ellipse with random
 * radius / angle jitter) used as the rock silhouette. The bottom half is
 * stretched to suggest weight resting on the ground.
 *
 * @returns {Array<{ x: number, y: number }>}
 */
export function buildRockVertices(radius) {
  const vertCount = VERT_COUNT_MIN + Math.floor(Math.random() * VERT_COUNT_RANGE)
  const verts = []
  for (let v = 0; v < vertCount; v++) {
    const t = v / vertCount
    const a = t * Math.PI * 2 + (Math.random() - 0.5) * VERT_ANGLE_JITTER
    //
    // Vertices on the lower half of the ring get pushed slightly outward
    // (heavySide) so the rock's base looks wider/heavier; upper-half
    // vertices get pulled in slightly (lightSide).
    //
    const heavySide = Math.sin(a) > 0 ? VERT_HEAVY_SIDE : VERT_LIGHT_SIDE
    const r = radius * (VERT_RADIUS_BASE + Math.random() * VERT_RADIUS_RANGE) * heavySide
    verts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r * VERT_FLATTEN_Y })
  }
  return verts
}

/**
 * Builds the per-rock palette (fill / light / dark + blue tint offset)
 * from a single random tint shared by every rock so the cluster reads as
 * one stone family. Returns RGB triplets for use by drawRockToCanvas.
 *
 * @param {Object} [opts]
 * @param {number} [opts.baseR=76] - Base R for the rock fill (0..255)
 * @param {number} [opts.baseG=76] - Base G for the rock fill (0..255)
 * @param {number} [opts.baseB=80] - Base B for the rock fill (0..255)
 * @returns {{
 *   fillR: number, fillG: number, fillB: number,
 *   lightR: number, lightG: number, lightB: number,
 *   darkR: number, darkG: number, darkB: number
 * }}
 */
export function buildRockPalette(opts = {}) {
  const baseR = opts.baseR ?? BASE_R
  const baseG = opts.baseG ?? BASE_G
  const baseB = opts.baseB ?? BASE_B
  const tint = TINT_MIN + Math.floor(Math.random() * TINT_RANGE)
  const fillR = clamp255(baseR + tint)
  const fillG = clamp255(baseG + tint)
  const fillB = clamp255(baseB + tint + BLUE_TINT_OFFSET)
  return {
    fillR, fillG, fillB,
    lightR: clamp255(fillR + LIGHT_OFFSET),
    lightG: clamp255(fillG + LIGHT_OFFSET),
    lightB: clamp255(fillB + LIGHT_OFFSET),
    darkR: clamp255(fillR - DARK_OFFSET),
    darkG: clamp255(fillG - DARK_OFFSET),
    darkB: clamp255(fillB - DARK_OFFSET)
  }
}

/**
 * Draws a single rock onto a 2D canvas context centered at `(cx, cy)`.
 * The shape, palette and texture details are caller-supplied so the
 * same drawing pipeline can be reused across sprites (where the canvas
 * is just-big-enough) and the big background composite (where rocks
 * are drawn into a shared canvas at world coordinates).
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} opts
 * @param {number} opts.cx - Rock silhouette centre X (canvas px)
 * @param {number} opts.cy - Rock silhouette centre Y (canvas px)
 * @param {number} opts.radius - Rock base radius (px) — drives texture scale
 * @param {Array<{ x: number, y: number }>} opts.verts - Pre-built rock outline
 * @param {{ fillR: number, fillG: number, fillB: number,
 *           lightR: number, lightG: number, lightB: number,
 *           darkR: number, darkG: number, darkB: number }} opts.palette
 */
export function drawRockToCanvas(ctx, opts) {
  const { cx, cy, radius, verts, palette } = opts
  const { fillR, fillG, fillB, lightR, lightG, lightB, darkR, darkG, darkB } = palette
  //
  // Quadratic-Bezier outline: each segment uses the current vertex as the
  // control point and the midpoint to the next vertex as the endpoint,
  // which smooths out the polygon while preserving its asymmetry.
  //
  const traceOutline = () => {
    ctx.beginPath()
    const v0 = verts[0]
    ctx.moveTo(cx + v0.x, cy + v0.y)
    for (let v = 0; v < verts.length; v++) {
      const cur = verts[v]
      const next = verts[(v + 1) % verts.length]
      const midX = cx + (cur.x + next.x) / 2
      const midY = cy + (cur.y + next.y) / 2
      ctx.quadraticCurveTo(cx + cur.x, cy + cur.y, midX, midY)
    }
    ctx.closePath()
  }
  //
  // Soft drop shadow underneath the rock — flat ellipse on the ground
  // line, slightly wider than the rock to suggest ambient occlusion.
  //
  ctx.fillStyle = `rgba(0, 0, 0, ${SHADOW_GROUND_ALPHA})`
  ctx.beginPath()
  ctx.ellipse(cx, cy + radius * 0.42, radius * 1.0, radius * 0.18, 0, 0, Math.PI * 2)
  ctx.closePath()
  ctx.fill()
  //
  // Body fill: vertical gradient — lighter at the top, darker at the
  // bottom — gives an immediate volumetric cue without per-pixel shading.
  //
  const grad = ctx.createLinearGradient(0, cy - radius * 0.7, 0, cy + radius * 0.7)
  grad.addColorStop(0, `rgb(${lightR}, ${lightG}, ${lightB})`)
  grad.addColorStop(0.55, `rgb(${fillR}, ${fillG}, ${fillB})`)
  grad.addColorStop(1, `rgb(${darkR}, ${darkG}, ${darkB})`)
  ctx.fillStyle = grad
  traceOutline()
  ctx.fill()
  //
  // Mottled texture: random subtle dark/light blotches clipped to the
  // rock silhouette so the surface doesn't look flat. Counts are bounded
  // so the rock never reads as noise.
  //
  ctx.save()
  traceOutline()
  ctx.clip()
  const blotchCount = BLOTCH_COUNT_MIN + Math.floor(Math.random() * BLOTCH_COUNT_RANGE)
  for (let b = 0; b < blotchCount; b++) {
    const bx = cx + (Math.random() - 0.5) * radius * 1.4
    const by = cy + (Math.random() - 0.5) * radius * 0.9
    const br = radius * (0.08 + Math.random() * 0.18)
    const lighter = Math.random() < 0.5
    const a = 0.06 + Math.random() * 0.08
    ctx.fillStyle = lighter
      ? `rgba(255, 255, 255, ${a})`
      : `rgba(0, 0, 0, ${a + 0.02})`
    ctx.beginPath()
    ctx.ellipse(bx, by, br, br * (0.6 + Math.random() * 0.4), Math.random() * Math.PI, 0, Math.PI * 2)
    ctx.fill()
  }
  //
  // A couple of fine crack lines for stone texture: each crack is a few
  // wiggly segments started at a random point on the rock interior.
  //
  const crackCount = 1 + Math.floor(Math.random() * CRACK_COUNT_RANGE)
  for (let c = 0; c < crackCount; c++) {
    const startA = Math.random() * Math.PI * 2
    const startR = radius * (0.1 + Math.random() * 0.5)
    let cxp = cx + Math.cos(startA) * startR
    let cyp = cy + Math.sin(startA) * startR * 0.5
    ctx.strokeStyle = `rgba(0, 0, 0, ${0.18 + Math.random() * 0.18})`
    ctx.lineWidth = 0.8 + Math.random() * 0.7
    ctx.beginPath()
    ctx.moveTo(cxp, cyp)
    const segs = 2 + Math.floor(Math.random() * 3)
    let ang = Math.random() * Math.PI * 2
    for (let s = 0; s < segs; s++) {
      ang += (Math.random() - 0.5) * 1.2
      cxp += Math.cos(ang) * radius * (0.18 + Math.random() * 0.18)
      cyp += Math.sin(ang) * radius * 0.12
      ctx.lineTo(cxp, cyp)
    }
    ctx.stroke()
  }
  ctx.restore()
  //
  // Top-left sheen highlight (key light) — small lighter ellipse near
  // the upper-left curve of the rock so the body looks dimensional.
  //
  ctx.fillStyle = `rgba(255, 255, 255, ${SHEEN_ALPHA})`
  ctx.beginPath()
  ctx.ellipse(cx - radius * 0.32, cy - radius * 0.28, radius * 0.55, radius * 0.18, -0.45, 0, Math.PI * 2)
  ctx.fill()
  //
  // Bottom-rim contact shadow — small dark arc where the rock meets the
  // ground, giving the impression of weight pressing down.
  //
  ctx.fillStyle = `rgba(0, 0, 0, ${SHADOW_CONTACT_ALPHA})`
  ctx.beginPath()
  ctx.ellipse(cx, cy + radius * 0.34, radius * 0.78, radius * 0.18, 0, 0, Math.PI)
  ctx.fill()
  //
  // Outline for clean definition against the soil
  //
  ctx.strokeStyle = `rgba(0, 0, 0, ${OUTLINE_ALPHA})`
  ctx.lineWidth = OUTLINE_WIDTH
  traceOutline()
  ctx.stroke()
}

function clamp255(v) {
  return Math.max(0, Math.min(255, v))
}
