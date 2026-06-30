import { CFG } from '../../../cfg.js'
import { getRGB } from '../../../utils/helper.js'
//
// Log bark colours (same palette as touch lesson 2)
//
const LOG_BARK_COLOR_HEX = '#5C3A1E'
const LOG_BARK_LIGHT_HEX = '#7A5030'
const LOG_BARK_DARK_HEX = '#3E2510'
const LOG_RING_COLOR_HEX = '#A07050'
const LOG_RING_DARK_HEX = '#6B4930'
const LOG_CORE_COLOR_HEX = '#C4956A'
const LOG_END_STEPS = 16
const LOG_BARK_LINE_COUNT = 5
const LOG_END_SQUASH = 0.55
const LOG_CRACK_COUNT_MIN = 5
const LOG_CRACK_COUNT_MAX = 10
const LOG_CRACK_LENGTH_MIN = 5
const LOG_CRACK_LENGTH_MAX = 20
const LOG_KNOT_COUNT_MIN = 1
const LOG_KNOT_COUNT_MAX = 3
const LOG_KNOT_RADIUS_MIN = 2
const LOG_KNOT_RADIUS_MAX = 4
//
// Default platform dimensions
//
const DEFAULT_WIDTH = 82
const DEFAULT_HEIGHT = 28

/**
 * Generates random detail data (cracks, knots) for a log platform.
 * Call once at creation time so the visuals are stable across frames.
 * @param {number} w - Platform width
 * @param {number} h - Platform height
 * @returns {Object} Detail data { cracks, knots }
 */
export function generateDetail(w, h) {
  const halfW = w / 2
  const halfH = h / 2
  const sq = LOG_END_SQUASH
  const innerLeft = -halfW + halfH * sq
  const innerRight = halfW - halfH * sq
  const innerW = innerRight - innerLeft
  //
  // Cracks: short dark diagonal lines on the bark surface
  //
  const crackCount = LOG_CRACK_COUNT_MIN + Math.floor(Math.random() * (LOG_CRACK_COUNT_MAX - LOG_CRACK_COUNT_MIN + 1))
  const cracks = []
  for (let i = 0; i < crackCount; i++) {
    const cx = innerLeft + Math.random() * innerW
    const cy = -halfH * 0.7 + Math.random() * h * 0.7
    const len = LOG_CRACK_LENGTH_MIN + Math.random() * (LOG_CRACK_LENGTH_MAX - LOG_CRACK_LENGTH_MIN)
    const angle = -0.4 + Math.random() * 0.8
    cracks.push({ x: cx, y: cy, len, angle })
  }
  //
  // Knots: small dark ovals on the bark
  //
  const knotCount = LOG_KNOT_COUNT_MIN + Math.floor(Math.random() * (LOG_KNOT_COUNT_MAX - LOG_KNOT_COUNT_MIN + 1))
  const knots = []
  for (let i = 0; i < knotCount; i++) {
    knots.push({
      x: innerLeft + Math.random() * innerW,
      y: -halfH * 0.5 + Math.random() * h * 0.5,
      r: LOG_KNOT_RADIUS_MIN + Math.random() * (LOG_KNOT_RADIUS_MAX - LOG_KNOT_RADIUS_MIN)
    })
  }
  return { cracks, knots }
}

/**
 * Creates a log-style physics platform.
 * The entity position (x, y) is the TOP-LEFT corner of the collision box.
 * The collision box extends right by width and down by height.
 * The visual log is drawn centered at (width/2, height/2) in local space.
 * @param {Object} cfg - Configuration
 * @param {Object} cfg.k - Kaplay instance
 * @param {number} cfg.x - X position (top-left of collision area)
 * @param {number} cfg.y - Y position (top-left = landing surface)
 * @param {number} [cfg.width] - Log width in pixels
 * @param {number} [cfg.height] - Log height in pixels
 * @param {number} [cfg.opacity=1] - Initial visual opacity
 * @returns {Object} Kaplay game object
 */
export function create(cfg) {
  const { k, x, y, opacity = 1 } = cfg
  const w = cfg.width ?? DEFAULT_WIDTH
  const h = cfg.height ?? DEFAULT_HEIGHT
  const halfW = w / 2
  const halfH = h / 2
  const detail = generateDetail(w, h)
  return k.add([
    k.pos(x, y),
    //
    // Collision box starts at entity pos (top-left of visual log)
    //
    k.area({ shape: new k.Rect(k.vec2(0, 0), w, h) }),
    k.body({ isStatic: true }),
    k.z(CFG.visual.zIndex.platforms),
    k.opacity(opacity),
    CFG.game.platformName,
    {
      draw() {
        const o = this.opacity
        drawLog(k, halfW, halfH, w, h, o, detail)
      }
    }
  ])
}
//
// Draws a fully detailed log barrel at the local draw origin.
// ox, oy = visual center of the log (relative to entity top-left).
//
function drawLog(k, ox, oy, w, h, opacity, detail) {
  const halfW = w / 2
  const halfH = h / 2
  const endR = halfH
  const sq = LOG_END_SQUASH
  const barkColor = getRGB(k, LOG_BARK_COLOR_HEX)
  const barkLight = getRGB(k, LOG_BARK_LIGHT_HEX)
  const barkDark = getRGB(k, LOG_BARK_DARK_HEX)
  const ringColor = getRGB(k, LOG_RING_COLOR_HEX)
  const ringDark = getRGB(k, LOG_RING_DARK_HEX)
  const coreColor = getRGB(k, LOG_CORE_COLOR_HEX)
  //
  // Main barrel body: polygon with oval left/right ends
  //
  const bodyPts = []
  for (let i = 0; i <= LOG_END_STEPS; i++) {
    const a = Math.PI / 2 + Math.PI * i / LOG_END_STEPS
    bodyPts.push(k.vec2(-halfW + endR * Math.cos(a) * sq + ox, endR * Math.sin(a) + oy))
  }
  for (let i = 0; i <= LOG_END_STEPS; i++) {
    const a = -Math.PI / 2 + Math.PI * i / LOG_END_STEPS
    bodyPts.push(k.vec2(halfW + endR * Math.cos(a) * sq + ox, endR * Math.sin(a) + oy))
  }
  //
  // Drop shadow
  //
  k.drawPolygon({ pts: bodyPts.map(p => k.vec2(p.x, p.y + 2)), color: k.rgb(0, 0, 0), opacity: 0.4 * opacity })
  //
  // Bark fill
  //
  k.drawPolygon({ pts: bodyPts, color: barkColor, opacity })
  //
  // Light streak on top half
  //
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
  //
  // Horizontal bark grain lines
  //
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
  //
  // Cracks: short dark diagonal lines across the bark
  //
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
  //
  // Knots: small dark ovals on the bark surface
  //
  for (const knot of detail.knots) {
    drawOvalRing(k, knot.x + ox, knot.y + oy, knot.r, 0.7, barkDark, 0.45 * opacity)
    drawOvalRing(k, knot.x + ox, knot.y + oy, knot.r * 0.5, 0.7, barkLight, 0.25 * opacity)
  }
  //
  // Right end-grain oval (annual rings cross-section)
  //
  const endCX = halfW + ox
  const endCY = oy
  drawOvalRing(k, endCX, endCY, endR, sq, ringColor, opacity)
  drawOvalRing(k, endCX, endCY, endR * 0.75, sq, coreColor, opacity)
  drawOvalRing(k, endCX, endCY, endR * 0.5, sq, ringDark, 0.3 * opacity)
  drawOvalRing(k, endCX, endCY, endR * 0.2, sq, barkDark, 0.5 * opacity)
}
//
// Draws a filled ellipse (squashed circle) at (cx, cy).
//
function drawOvalRing(k, cx, cy, r, squash, color, opacity) {
  const pts = []
  for (let i = 0; i <= LOG_END_STEPS; i++) {
    const a = Math.PI * 2 * i / LOG_END_STEPS
    pts.push(k.vec2(cx + Math.cos(a) * r * squash, cy + Math.sin(a) * r))
  }
  k.drawPolygon({ pts, color, opacity })
}
