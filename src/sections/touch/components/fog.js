import { CFG } from '../cfg.js'
//
// Large fog wisp configuration (broad, slow-moving background streaks)
//
const LARGE_WISP_COUNT = 8
const LARGE_WISP_LENGTH_MIN = 300
const LARGE_WISP_LENGTH_MAX = 600
const LARGE_WISP_WIDTH_MIN = 40
const LARGE_WISP_WIDTH_MAX = 80
const LARGE_WISP_OPACITY_MIN = 0.015
const LARGE_WISP_OPACITY_MAX = 0.03
//
// Small fog wisp configuration (detail wisps for density variation)
//
const SMALL_WISP_COUNT = 18
const SMALL_WISP_LENGTH_MIN = 80
const SMALL_WISP_LENGTH_MAX = 250
const SMALL_WISP_WIDTH_MIN = 15
const SMALL_WISP_WIDTH_MAX = 40
const SMALL_WISP_OPACITY_MIN = 0.02
const SMALL_WISP_OPACITY_MAX = 0.04
//
// Wisp drift and rotation speeds
//
const DRIFT_SPEED_MIN = 2
const DRIFT_SPEED_MAX = 6
const ROTATE_SPEED_MIN = 0.02
const ROTATE_SPEED_MAX = 0.08
//
// Fog color (darker than background to create shadow patches, not light streaks)
//
const FOG_COLOR_R = 16
const FOG_COLOR_G = 16
const FOG_COLOR_B = 22
//
// Screen edge wrapping margin
//
const WRAP_MARGIN = 100
/**
 * Creates a fog system using semi-transparent elongated wisps
 * Wisps overlap to create areas of varying fog density
 * @param {Object} cfg - Configuration
 * @param {Object} cfg.k - Kaplay instance
 * @returns {Object} Fog instance
 */
export function create(cfg) {
  const { k } = cfg
  const screenW = CFG.visual.screen.width
  const screenH = CFG.visual.screen.height
  //
  // Generate large background wisps (wide, slow, subtle)
  //
  const largeWisps = generateWisps(
    screenW, screenH, LARGE_WISP_COUNT,
    LARGE_WISP_LENGTH_MIN, LARGE_WISP_LENGTH_MAX,
    LARGE_WISP_WIDTH_MIN, LARGE_WISP_WIDTH_MAX,
    LARGE_WISP_OPACITY_MIN, LARGE_WISP_OPACITY_MAX
  )
  //
  // Generate small detail wisps (narrow, more visible, create density variation)
  //
  const smallWisps = generateWisps(
    screenW, screenH, SMALL_WISP_COUNT,
    SMALL_WISP_LENGTH_MIN, SMALL_WISP_LENGTH_MAX,
    SMALL_WISP_WIDTH_MIN, SMALL_WISP_WIDTH_MAX,
    SMALL_WISP_OPACITY_MIN, SMALL_WISP_OPACITY_MAX
  )
  const inst = { k, largeWisps, smallWisps }
  return inst
}

/**
 * Updates fog wisps: drifts positions and gently rotates angles
 * @param {Object} inst - Fog instance
 * @param {number} dt - Delta time
 */
export function onUpdate(inst, dt) {
  const screenW = CFG.visual.screen.width
  const screenH = CFG.visual.screen.height
  updateWisps(inst.largeWisps, dt, screenW, screenH)
  updateWisps(inst.smallWisps, dt, screenW, screenH)
}

/**
 * Draws all fog wisps as thick semi-transparent lines
 * Where wisps overlap, fog appears denser (higher effective opacity)
 * @param {Object} inst - Fog instance
 */
export function onDraw(inst) {
  const { k, largeWisps, smallWisps } = inst
  const fogColor = k.rgb(FOG_COLOR_R, FOG_COLOR_G, FOG_COLOR_B)
  drawWisps(k, largeWisps, fogColor)
  drawWisps(k, smallWisps, fogColor)
}

/**
 * Generates an array of fog wisp objects with random position, angle, and size
 * @param {number} screenW - Screen width
 * @param {number} screenH - Screen height
 * @param {number} count - Number of wisps to generate
 * @param {number} lenMin - Minimum wisp length
 * @param {number} lenMax - Maximum wisp length
 * @param {number} wMin - Minimum wisp width (line thickness)
 * @param {number} wMax - Maximum wisp width
 * @param {number} opMin - Minimum opacity
 * @param {number} opMax - Maximum opacity
 * @returns {Array} Array of wisp data objects
 */
function generateWisps(screenW, screenH, count, lenMin, lenMax, wMin, wMax, opMin, opMax) {
  const wisps = []
  for (let i = 0; i < count; i++) {
    wisps.push({
      x: Math.random() * screenW,
      y: Math.random() * screenH,
      angle: Math.random() * Math.PI,
      length: lenMin + Math.random() * (lenMax - lenMin),
      width: wMin + Math.random() * (wMax - wMin),
      opacity: opMin + Math.random() * (opMax - opMin),
      driftAngle: Math.random() * Math.PI * 2,
      driftSpeed: DRIFT_SPEED_MIN + Math.random() * (DRIFT_SPEED_MAX - DRIFT_SPEED_MIN),
      rotateSpeed: (ROTATE_SPEED_MIN + Math.random() * (ROTATE_SPEED_MAX - ROTATE_SPEED_MIN)) * (Math.random() > 0.5 ? 1 : -1)
    })
  }
  return wisps
}

/**
 * Updates wisp positions with slow drift and gentle angle rotation
 * Wraps around screen edges for continuous coverage
 * @param {Array} wisps - Array of wisp objects
 * @param {number} dt - Delta time
 * @param {number} screenW - Screen width
 * @param {number} screenH - Screen height
 */
function updateWisps(wisps, dt, screenW, screenH) {
  wisps.forEach(wisp => {
    wisp.x += Math.cos(wisp.driftAngle) * wisp.driftSpeed * dt
    wisp.y += Math.sin(wisp.driftAngle) * wisp.driftSpeed * dt
    wisp.angle += wisp.rotateSpeed * dt
    //
    // Wrap around screen edges with generous margin
    //
    if (wisp.x < -WRAP_MARGIN) wisp.x = screenW + WRAP_MARGIN
    if (wisp.x > screenW + WRAP_MARGIN) wisp.x = -WRAP_MARGIN
    if (wisp.y < -WRAP_MARGIN) wisp.y = screenH + WRAP_MARGIN
    if (wisp.y > screenH + WRAP_MARGIN) wisp.y = -WRAP_MARGIN
  })
}

/**
 * Draws wisps as thick semi-transparent lines at their current angle
 * @param {Object} k - Kaplay instance
 * @param {Array} wisps - Array of wisp objects
 * @param {Object} color - Kaplay color object
 */
function drawWisps(k, wisps, color) {
  wisps.forEach(wisp => {
    const halfLen = wisp.length / 2
    const dx = Math.cos(wisp.angle) * halfLen
    const dy = Math.sin(wisp.angle) * halfLen
    k.drawLine({
      p1: k.vec2(wisp.x - dx, wisp.y - dy),
      p2: k.vec2(wisp.x + dx, wisp.y + dy),
      width: wisp.width,
      color,
      opacity: wisp.opacity
    })
  })
}
