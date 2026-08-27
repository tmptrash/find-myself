import { CFG } from '../../../cfg.js'
import { getRGB, toCanvas } from '../../../utils/helper.js'

//
// Log platform visual constants (shared with touch level 2).
// All wood tones come from the unified game palette (CFG.visual.colors.palette).
//
const LOG_BARK_COLOR_HEX = CFG.visual.colors.palette.log.bark
const LOG_BARK_LIGHT_HEX = CFG.visual.colors.palette.log.barkLight
const LOG_BARK_DARK_HEX = CFG.visual.colors.palette.log.barkDark
const LOG_RING_COLOR_HEX = CFG.visual.colors.palette.log.ring
const LOG_RING_DARK_HEX = CFG.visual.colors.palette.log.ringDark
const LOG_CORE_COLOR_HEX = CFG.visual.colors.palette.log.core
const LOG_END_STEPS = 16
const LOG_BARK_LINE_COUNT = 5
const LOG_END_SQUASH = 0.55
const LOG_CRACK_COUNT_MIN = 6
const LOG_CRACK_COUNT_MAX = 12
const LOG_CRACK_LENGTH_MIN = 6
const LOG_CRACK_LENGTH_MAX = 24
const LOG_KNOT_COUNT_MIN = 2
const LOG_KNOT_COUNT_MAX = 5
const LOG_KNOT_RADIUS_MIN = 2
const LOG_KNOT_RADIUS_MAX = 5
const SNOW_CLUMP_COUNT_MIN = 3
const SNOW_CLUMP_COUNT_MAX = 7
const SNOW_CLUMP_RADIUS_MIN = 3
const SNOW_CLUMP_RADIUS_MAX = 8

/**
 * Creates a static log-shaped platform with invisible collision body and visual draw callback
 * @param {Object} cfg - Platform configuration
 * @param {Object} cfg.k - Kaplay instance
 * @param {number} cfg.x - Center X
 * @param {number} cfg.y - Center Y
 * @param {number} cfg.width - Platform width
 * @param {number} cfg.height - Platform height
 * @param {boolean} [cfg.withSnow=false] - Whether to render snow on top
 * @param {number} [cfg.z] - Z-index for collision body
 * @returns {Object} Platform instance with collisionObject and logDetail
 */
export function create(cfg) {
  const { k, x, y, width, height, withSnow = false, z = CFG.visual.zIndex.platforms } = cfg
  const logDetail = generateLogDetail(width, height, withSnow)
  const collisionObject = k.add([
    k.rect(width, height),
    k.pos(x, y),
    k.anchor('center'),
    k.area(),
    k.body({ isStatic: true }),
    k.opacity(0),
    k.z(z),
    CFG.game.platformName
  ])
  k.add([
    k.pos(x, y),
    k.z(z - 1),
    {
      draw() {
        drawLogPlatform(k, width, height, 0, 0, 1, logDetail)
      }
    }
  ])
  return { collisionObject, logDetail }
}

/**
 * Pre-generates random crack and knot detail for a log platform
 * @param {number} w - Platform width
 * @param {number} h - Platform height
 * @param {boolean} withSnow - Whether to generate snow profile
 * @returns {Object} Detail data
 */
export function generateLogDetail(w, h, withSnow) {
  const halfW = w / 2
  const halfH = h / 2
  const sq = LOG_END_SQUASH
  //
  // Only the right end ever gets a rounded cap drawn over it (see
  // drawLogPlatform / drawLOutlineLogPlatform) — the left side is always
  // bare outline/cut wood, so cracks and grain there should run all the
  // way out to the true left edge instead of stopping short by the same
  // cap-radius inset the right side needs.
  //
  const innerLeft = -halfW
  const innerRight = halfW - halfH * sq
  const innerW = innerRight - innerLeft
  //
  // Stratified along X (one crack per evenly-spaced slot, jittered within
  // it) rather than pure uniform random — a handful of independent random
  // draws can easily cluster away from one end by chance, leaving that
  // end of the log looking bare. Slots guarantee cracks reach both edges
  // of the usable (non-cap) width every time.
  //
  const crackCount = LOG_CRACK_COUNT_MIN + Math.floor(Math.random() * (LOG_CRACK_COUNT_MAX - LOG_CRACK_COUNT_MIN + 1))
  const cracks = []
  const slotW = innerW / crackCount
  for (let i = 0; i < crackCount; i++) {
    const cx = innerLeft + slotW * (i + 0.5) + (Math.random() - 0.5) * slotW * 0.7
    const cy = -halfH * 0.7 + Math.random() * h * 0.7
    const len = LOG_CRACK_LENGTH_MIN + Math.random() * (LOG_CRACK_LENGTH_MAX - LOG_CRACK_LENGTH_MIN)
    const angle = -0.4 + Math.random() * 0.8
    cracks.push({ x: cx, y: cy, len, angle })
  }
  const knotCount = LOG_KNOT_COUNT_MIN + Math.floor(Math.random() * (LOG_KNOT_COUNT_MAX - LOG_KNOT_COUNT_MIN + 1))
  const knots = []
  for (let i = 0; i < knotCount; i++) {
    knots.push({
      x: innerLeft + Math.random() * innerW,
      y: -halfH * 0.5 + Math.random() * h * 0.5,
      r: LOG_KNOT_RADIUS_MIN + Math.random() * (LOG_KNOT_RADIUS_MAX - LOG_KNOT_RADIUS_MIN)
    })
  }
  let snowProfile = null
  let snowClumps = null
  if (withSnow) {
    const steps = 24
    snowProfile = new Array(steps + 1).fill(0)
    const moundCount = 2 + Math.floor(Math.random() * 2)
    for (let m = 0; m < moundCount; m++) {
      const center = 0.15 + Math.random() * 0.7
      const spread = 0.2 + Math.random() * 0.3
      const moundHeight = 0.5 + Math.random() * 0.5
      for (let i = 0; i <= steps; i++) {
        const t = i / steps
        const dist = (t - center) / spread
        snowProfile[i] += moundHeight * Math.max(0, 1 - dist * dist)
      }
    }
    const maxVal = Math.max(...snowProfile)
    for (let i = 0; i <= steps; i++) {
      snowProfile[i] = snowProfile[i] / maxVal + (Math.random() - 0.5) * 0.08
      snowProfile[i] = Math.max(0, snowProfile[i])
    }
    snowProfile[0] = Math.min(snowProfile[0], 0.05)
    snowProfile[steps] = Math.min(snowProfile[steps], 0.05)
    const clumpCount = SNOW_CLUMP_COUNT_MIN + Math.floor(Math.random() * (SNOW_CLUMP_COUNT_MAX - SNOW_CLUMP_COUNT_MIN + 1))
    snowClumps = []
    for (let i = 0; i < clumpCount; i++) {
      const t = 0.1 + Math.random() * 0.8
      const idx = Math.round(t * steps)
      const profileH = snowProfile[Math.min(idx, steps)]
      snowClumps.push({
        t,
        yOffset: -profileH * 0.3 + Math.random() * profileH * 0.4,
        r: SNOW_CLUMP_RADIUS_MIN + Math.random() * (SNOW_CLUMP_RADIUS_MAX - SNOW_CLUMP_RADIUS_MIN)
      })
    }
  }
  return { cracks, knots, snowProfile, snowClumps }
}

/**
 * Draws a log-shaped platform relative to center (0, 0)
 * @param {Object} k - Kaplay instance
 * @param {number} w - Platform width
 * @param {number} h - Platform height
 * @param {number} ox - Offset X
 * @param {number} oy - Offset Y
 * @param {number} opacity - Draw opacity
 * @param {Object} detail - Pre-generated log detail
 * @param {Object} [colors] - Optional hex tone overrides ({ bark, barkLight, barkDark, ring, ringDark, core })
 */
export function drawLogPlatform(k, w, h, ox, oy, opacity, detail, colors = null) {
  const halfW = w / 2
  const halfH = h / 2
  const endR = halfH
  const sq = LOG_END_SQUASH
  const barkColor = getRGB(k, colors?.bark ?? LOG_BARK_COLOR_HEX)
  const barkLight = getRGB(k, colors?.barkLight ?? LOG_BARK_LIGHT_HEX)
  const barkDark = getRGB(k, colors?.barkDark ?? LOG_BARK_DARK_HEX)
  const ringColor = getRGB(k, colors?.ring ?? LOG_RING_COLOR_HEX)
  const ringDark = getRGB(k, colors?.ringDark ?? LOG_RING_DARK_HEX)
  const coreColor = getRGB(k, colors?.core ?? LOG_CORE_COLOR_HEX)
  const shadowColor = colors?.shadow ? getRGB(k, colors.shadow) : k.rgb(0, 0, 0)
  const bodyPts = []
  for (let i = 0; i <= LOG_END_STEPS; i++) {
    const a = Math.PI / 2 + Math.PI * i / LOG_END_STEPS
    bodyPts.push(k.vec2(-halfW + endR * Math.cos(a) * sq + ox, endR * Math.sin(a) + oy))
  }
  for (let i = 0; i <= LOG_END_STEPS; i++) {
    const a = -Math.PI / 2 + Math.PI * i / LOG_END_STEPS
    bodyPts.push(k.vec2(halfW + endR * Math.cos(a) * sq + ox, endR * Math.sin(a) + oy))
  }
  k.drawPolygon({ pts: bodyPts.map(p => k.vec2(p.x, p.y + 2)), color: shadowColor, opacity: 0.4 * opacity })
  k.drawPolygon({ pts: bodyPts, color: barkColor, opacity })
  const topPts = []
  for (let i = 0; i <= LOG_END_STEPS; i++) {
    const a = Math.PI / 2 + Math.PI * i / LOG_END_STEPS
    const r = endR * 0.85
    topPts.push(k.vec2(-halfW + r * Math.cos(a) * sq + ox, r * Math.sin(a) * 0.45 - halfH * 0.2 + oy))
  }
  for (let i = 0; i <= LOG_END_STEPS; i++) {
    const a = -Math.PI / 2 + Math.PI * i / LOG_END_STEPS
    const r = endR * 0.85
    topPts.push(k.vec2(halfW + r * Math.cos(a) * sq + ox, r * Math.sin(a) * 0.45 - halfH * 0.2 + oy))
  }
  k.drawPolygon({ pts: topPts, color: barkLight, opacity: 0.5 * opacity })
  for (let i = 0; i < LOG_BARK_LINE_COUNT; i++) {
    const ly = -halfH + (h / (LOG_BARK_LINE_COUNT + 1)) * (i + 1) + oy
    k.drawRect({
      pos: k.vec2(-halfW + endR * sq + ox, ly),
      width: w - endR * sq * 2,
      height: 1,
      color: barkDark,
      opacity: 0.3 * opacity
    })
  }
  for (const crack of detail.cracks) {
    const dx = Math.cos(crack.angle) * crack.len * 0.5
    const dy = Math.sin(crack.angle) * crack.len * 0.5
    k.drawLines({
      pts: [k.vec2(crack.x - dx + ox, crack.y - dy + oy), k.vec2(crack.x + dx + ox, crack.y + dy + oy)],
      width: 1,
      color: barkDark,
      opacity: 0.5 * opacity
    })
  }
  for (const knot of detail.knots) {
    drawOvalRing(k, knot.x + ox, knot.y + oy, knot.r, 0.7, barkDark, 0.45 * opacity)
    drawOvalRing(k, knot.x + ox, knot.y + oy, knot.r * 0.5, 0.7, barkLight, 0.25 * opacity)
  }
  const endCX = halfW + ox
  const endCY = oy
  drawOvalRing(k, endCX, endCY, endR, sq, ringColor, opacity)
  drawOvalRing(k, endCX, endCY, endR * 0.75, sq, coreColor, opacity)
  drawOvalRing(k, endCX, endCY, endR * 0.5, sq, ringDark, 0.3 * opacity)
  drawOvalRing(k, endCX, endCY, endR * 0.2, sq, barkDark, 0.5 * opacity)
  if (!detail.snowProfile) return
  const sp = detail.snowProfile
  const snowSteps = sp.length - 1
  const snowHeight = h * 0.5
  const snowPts = []
  for (let i = 0; i <= snowSteps; i++) {
    const t = i / snowSteps
    const px = (t - 0.5) * w + ox
    snowPts.push(k.vec2(px, -halfH - snowHeight * sp[i] + oy))
  }
  snowPts.push(k.vec2(halfW + ox, -halfH + oy))
  snowPts.push(k.vec2(-halfW + ox, -halfH + oy))
  k.drawPolygon({ pts: snowPts, color: k.rgb(255, 255, 255), opacity: 0.9 * opacity })
}

/**
 * Pre-renders the fully filled, coloured log barrel (drawLogPlatform's
 * steady-state look, opacity 1, no snow) to an offscreen canvas once. The
 * wood shape, cracks and knots never change after generation — only which
 * fixed colour palette applies — so baking removes dozens of polygon/oval
 * redraws (with fresh trig per point, every frame) from the hot path for
 * every log platform on screen at once.
 * @param {Object} k - Kaplay instance (only used for colour lookup)
 * @param {number} w - Platform width
 * @param {number} h - Platform height
 * @param {Object} detail - Pre-generated log detail (see generateLogDetail)
 * @param {Object} [colors] - Optional hex tone overrides (same shape as drawLogPlatform)
 * @returns {{ canvas: HTMLCanvasElement, offsetX: number, offsetY: number }}
 */
export function bakeLogPlatformCanvas(k, w, h, detail, colors = null) {
  const halfH = h / 2
  const pad = 4
  const capMargin = halfH * LOG_END_SQUASH + pad
  const canvasW = Math.ceil(w + capMargin * 2)
  const canvasH = Math.ceil(h + pad * 2 + 4)
  const offsetX = canvasW / 2
  const offsetY = canvasH / 2
  const canvas = toCanvas({ width: canvasW, height: canvasH }, (ctx) => {
    drawLogPlatformToCtx(ctx, k, w, h, offsetX, offsetY, detail, colors)
  })
  return { canvas, offsetX, offsetY }
}
/**
 * Packs several pre-baked log canvases side by side into one shared atlas
 * canvas. Every log platform variant can then be drawn from a single loaded
 * sprite via a UV sub-rect (quad) instead of its own texture — on real GPUs
 * the per-platform bindTexture/useProgram state changes (one bake per
 * platform per colour variant) cost far more than the actual fill rate, so
 * sharing one texture across every platform on screen is the real win.
 * @param {Array<{canvas: HTMLCanvasElement, offsetX: number, offsetY: number}>} entries
 * @returns {{ canvas: HTMLCanvasElement, tiles: Array<{x: number, y: number, w: number, h: number, offsetX: number, offsetY: number}> }}
 */
export function packLogPlatformAtlas(entries) {
  const pad = 2
  let atlasW = pad
  let atlasH = 0
  entries.forEach(e => {
    atlasW += e.canvas.width + pad
    atlasH = Math.max(atlasH, e.canvas.height)
  })
  const atlasCanvas = document.createElement('canvas')
  atlasCanvas.width = atlasW
  atlasCanvas.height = atlasH
  const ctx = atlasCanvas.getContext('2d')
  const tiles = []
  let cursorX = pad
  entries.forEach(e => {
    ctx.drawImage(e.canvas, cursorX, 0)
    tiles.push({ x: cursorX, y: 0, w: e.canvas.width, h: e.canvas.height, offsetX: e.offsetX, offsetY: e.offsetY })
    cursorX += e.canvas.width + pad
  })
  return { canvas: atlasCanvas, tiles }
}
//
// Draws a filled oval using polygon approximation
//
function drawOvalRing(k, cx, cy, r, squash, color, opacity) {
  const pts = []
  for (let i = 0; i <= LOG_END_STEPS; i++) {
    const a = Math.PI * 2 * i / LOG_END_STEPS
    pts.push(k.vec2(cx + Math.cos(a) * r * squash, cy + Math.sin(a) * r))
  }
  k.drawPolygon({ pts, color, opacity })
}
//
// Canvas2D mirror of drawLogPlatform, used only for one-time baking (see
// bakeLogPlatformCanvas). Snow is intentionally left out — no baked caller
// ever passes withSnow detail.
//
function drawLogPlatformToCtx(ctx, k, w, h, ox, oy, detail, colors) {
  const halfW = w / 2
  const halfH = h / 2
  const endR = halfH
  const sq = LOG_END_SQUASH
  const barkColor = getRGB(k, colors?.bark ?? LOG_BARK_COLOR_HEX)
  const barkLight = getRGB(k, colors?.barkLight ?? LOG_BARK_LIGHT_HEX)
  const barkDark = getRGB(k, colors?.barkDark ?? LOG_BARK_DARK_HEX)
  const ringColor = getRGB(k, colors?.ring ?? LOG_RING_COLOR_HEX)
  const ringDark = getRGB(k, colors?.ringDark ?? LOG_RING_DARK_HEX)
  const coreColor = getRGB(k, colors?.core ?? LOG_CORE_COLOR_HEX)
  const shadowColor = colors?.shadow ? getRGB(k, colors.shadow) : { r: 0, g: 0, b: 0 }
  const bodyPts = []
  for (let i = 0; i <= LOG_END_STEPS; i++) {
    const a = Math.PI / 2 + Math.PI * i / LOG_END_STEPS
    bodyPts.push({ x: -halfW + endR * Math.cos(a) * sq + ox, y: endR * Math.sin(a) + oy })
  }
  for (let i = 0; i <= LOG_END_STEPS; i++) {
    const a = -Math.PI / 2 + Math.PI * i / LOG_END_STEPS
    bodyPts.push({ x: halfW + endR * Math.cos(a) * sq + ox, y: endR * Math.sin(a) + oy })
  }
  ctxFillPoly(ctx, bodyPts.map(p => ({ x: p.x, y: p.y + 2 })), ctxRgba(shadowColor, 0.4))
  ctxFillPoly(ctx, bodyPts, ctxRgba(barkColor, 1))
  const topPts = []
  for (let i = 0; i <= LOG_END_STEPS; i++) {
    const a = Math.PI / 2 + Math.PI * i / LOG_END_STEPS
    const r = endR * 0.85
    topPts.push({ x: -halfW + r * Math.cos(a) * sq + ox, y: r * Math.sin(a) * 0.45 - halfH * 0.2 + oy })
  }
  for (let i = 0; i <= LOG_END_STEPS; i++) {
    const a = -Math.PI / 2 + Math.PI * i / LOG_END_STEPS
    const r = endR * 0.85
    topPts.push({ x: halfW + r * Math.cos(a) * sq + ox, y: r * Math.sin(a) * 0.45 - halfH * 0.2 + oy })
  }
  ctxFillPoly(ctx, topPts, ctxRgba(barkLight, 0.5))
  ctx.fillStyle = ctxRgba(barkDark, 0.3)
  for (let i = 0; i < LOG_BARK_LINE_COUNT; i++) {
    const ly = -halfH + (h / (LOG_BARK_LINE_COUNT + 1)) * (i + 1) + oy
    ctx.fillRect(-halfW + endR * sq + ox, ly, w - endR * sq * 2, 1)
  }
  for (const crack of detail.cracks) {
    const dx = Math.cos(crack.angle) * crack.len * 0.5
    const dy = Math.sin(crack.angle) * crack.len * 0.5
    ctxStrokeLine(ctx, crack.x - dx + ox, crack.y - dy + oy, crack.x + dx + ox, crack.y + dy + oy, 1, ctxRgba(barkDark, 0.5))
  }
  for (const knot of detail.knots) {
    ctxFillOval(ctx, knot.x + ox, knot.y + oy, knot.r, 0.7, ctxRgba(barkDark, 0.45))
    ctxFillOval(ctx, knot.x + ox, knot.y + oy, knot.r * 0.5, 0.7, ctxRgba(barkLight, 0.25))
  }
  const endCX = halfW + ox
  const endCY = oy
  ctxFillOval(ctx, endCX, endCY, endR, sq, ctxRgba(ringColor, 1))
  ctxFillOval(ctx, endCX, endCY, endR * 0.75, sq, ctxRgba(coreColor, 1))
  ctxFillOval(ctx, endCX, endCY, endR * 0.5, sq, ctxRgba(ringDark, 0.3))
  ctxFillOval(ctx, endCX, endCY, endR * 0.2, sq, ctxRgba(barkDark, 0.5))
}
//
// Formats an {r,g,b} colour as a canvas rgba() string
//
function ctxRgba(rgb, opacity) {
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`
}
//
// Fills a closed polygon on a 2D context
//
function ctxFillPoly(ctx, pts, style) {
  ctx.beginPath()
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
  ctx.closePath()
  ctx.fillStyle = style
  ctx.fill()
}
//
// Fills a squashed oval (ellipse) on a 2D context
//
function ctxFillOval(ctx, cx, cy, r, squash, style) {
  ctx.beginPath()
  ctx.ellipse(cx, cy, r * squash, r, 0, 0, Math.PI * 2)
  ctx.fillStyle = style
  ctx.fill()
}
//
// Strokes a single line segment on a 2D context
//
function ctxStrokeLine(ctx, x1, y1, x2, y2, width, style) {
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.lineWidth = width
  ctx.strokeStyle = style
  ctx.stroke()
}
