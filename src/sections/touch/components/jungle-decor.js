import { CFG } from '../cfg.js'
//
// Grass blade configuration (triangular blades for realism)
//
const GRASS_SPACING = 8
const GRASS_HEIGHT_MIN = 8
const GRASS_HEIGHT_MAX = 24
const GRASS_BLADE_WIDTH = 3
const GRASS_SWAY_SPEED_MIN = 1.5
const GRASS_SWAY_SPEED_MAX = 3.5
const GRASS_SWAY_AMOUNT = 2.5
const GRASS_PUSH_RADIUS = 50
const GRASS_PUSH_FORCE = 15
const GRASS_OPACITY = 0.85
const GRASS_RAISE_OFFSET = 2
//
// Pre-defined dark green color palette for grass blades [r, g, b]
//
const GRASS_COLORS = [
  [12, 30, 8],
  [18, 40, 12],
  [15, 45, 10],
  [22, 50, 15],
  [10, 25, 8],
  [20, 55, 14]
]
//
// Vine configuration
//
const VINE_PER_PLATFORM_MIN = 2
const VINE_PER_PLATFORM_MAX = 5
const VINE_LENGTH_MIN = 50
const VINE_LENGTH_MAX = 130
const VINE_SWAY_SPEED_MIN = 0.4
const VINE_SWAY_SPEED_MAX = 1.0
const VINE_SWAY_AMOUNT = 4
const VINE_SEGMENTS = 4
const VINE_THICKNESS = 4
const VINE_OPACITY = 0.8
const VINE_OUTLINE_WIDTH = 1.5
//
// Thorn configuration (shared by bottom wall and platform thorns)
//
const THORN_SPACING = 22
const THORN_WIDTH_MIN = 7
const THORN_WIDTH_MAX = 14
const THORN_HEIGHT_MIN = 11
const THORN_HEIGHT_MAX = 20
const THORN_TIP_OFFSET = 3
const THORN_OUTLINE_WIDTH = 2
//
// Vertical offset to raise thorns above platform surface (pixels)
//
const THORN_RAISE_OFFSET = 3
/**
 * Creates jungle decoration system with grass, vines, thorns, and platform spikes
 * @param {Object} cfg - Configuration
 * @param {Object} cfg.k - Kaplay instance
 * @param {Array} cfg.platforms - Corridor platform definitions [{x, y, width}]
 * @param {number} cfg.platformHeight - Platform thickness in pixels
 * @param {Object} cfg.hero - Hero instance for grass push interaction
 * @param {Array} [cfg.platformThorns] - Platform thorn zones [{startX, endX, y}]
 * @param {Array} [cfg.skipVineIndices] - Platform indices to skip vine generation for
 * @returns {Object} Jungle decoration instance
 */
export function create(cfg) {
  const { k, platforms, platformHeight, hero, platformThorns = [], skipVineIndices = [] } = cfg
  //
  // Pre-compute Kaplay color objects for grass palette
  //
  const grassColorObjects = GRASS_COLORS.map(c => k.rgb(c[0], c[1], c[2]))
  //
  // Generate all decoration data
  //
  const grassBlades = generateGrass(platforms, grassColorObjects)
  const vines = generateVines(platforms, platformHeight, skipVineIndices)
  const thornData = generateBottomWallThorns()
  const platformThornData = generatePlatformThorns(platformThorns)
  const inst = {
    k,
    hero,
    grassBlades,
    vines,
    thornData,
    platformThornData
  }
  return inst
}

/**
 * Draws hanging vines below platforms with wind sway
 * Called at Z_VINES layer behind platforms
 * @param {Object} inst - Jungle decoration instance
 */
export function onDrawVines(inst) {
  const { k, vines } = inst
  const time = k.time()
  const vineColor = k.rgb(15, 30, 12)
  const outlineColor = k.rgb(0, 0, 0)
  vines.forEach(vine => {
    const baseSway = Math.sin(time * vine.swaySpeed + vine.swayOffset) * VINE_SWAY_AMOUNT
    //
    // Draw vine as connected segments with increasing sway toward tip (pendulum effect)
    // Each segment draws black outline first, then green vine on top
    //
    const segLen = vine.length / VINE_SEGMENTS
    let prevX = vine.x
    let prevY = vine.startY
    for (let s = 1; s <= VINE_SEGMENTS; s++) {
      const segFraction = s / VINE_SEGMENTS
      const segSway = baseSway * segFraction
      const curX = vine.x + segSway
      const curY = vine.startY + segLen * s
      const segWidth = VINE_THICKNESS * (1 - segFraction * 0.3)
      //
      // Draw black outline (thicker)
      //
      k.drawLine({
        p1: k.vec2(prevX, prevY),
        p2: k.vec2(curX, curY),
        width: segWidth + VINE_OUTLINE_WIDTH * 2,
        color: outlineColor,
        opacity: VINE_OPACITY
      })
      //
      // Draw vine color on top
      //
      k.drawLine({
        p1: k.vec2(prevX, prevY),
        p2: k.vec2(curX, curY),
        width: segWidth,
        color: vineColor,
        opacity: VINE_OPACITY
      })
      prevX = curX
      prevY = curY
    }
  })
}

/**
 * Draws bottom wall thorns only (for rendering above darkness overlay)
 * @param {Object} inst - Jungle decoration instance
 */
export function onDrawBottomThorns(inst) {
  drawThorns(inst.k, inst.thornData)
}

/**
 * Draws platform thorns only (for rendering above darkness overlay)
 * @param {Object} inst - Jungle decoration instance
 */
export function onDrawPlatformThorns(inst) {
  drawThorns(inst.k, inst.platformThornData)
}

/**
 * Draws grass blades (triangular, hero-reactive) on platforms
 * Wind sway and hero proximity push create natural-looking movement
 * @param {Object} inst - Jungle decoration instance
 */
export function onDrawGrass(inst) {
  const { k, hero, grassBlades } = inst
  const time = k.time()
  //
  // Get hero position for grass push effect
  //
  const heroX = hero?.character?.pos?.x ?? -1000
  const heroY = hero?.character?.pos?.y ?? -1000
  //
  // Draw grass blades as triangular shapes with wind sway and hero push
  //
  grassBlades.forEach(blade => {
    const windSway = Math.sin(time * blade.swaySpeed + blade.swayOffset) * GRASS_SWAY_AMOUNT
    //
    // Calculate hero proximity push on grass blade
    //
    const dx = blade.x - heroX
    const dy = blade.baseY - heroY
    const dist = Math.sqrt(dx * dx + dy * dy)
    let pushSway = 0
    if (dist < GRASS_PUSH_RADIUS && dist > 0) {
      const pushStrength = 1 - dist / GRASS_PUSH_RADIUS
      pushSway = (dx / dist) * pushStrength * GRASS_PUSH_FORCE
    }
    const totalSway = windSway + pushSway
    //
    // Draw blade as filled triangle: wide base narrowing to pointed tip
    //
    k.drawPolygon({
      pts: [
        k.vec2(blade.x - blade.halfWidth, blade.baseY),
        k.vec2(blade.x + blade.halfWidth, blade.baseY),
        k.vec2(blade.x + totalSway, blade.tipY)
      ],
      color: blade.color,
      opacity: GRASS_OPACITY
    })
  })
}

/**
 * Generates grass blade data distributed across all platforms
 * Each blade has a random width for natural variation
 * @param {Array} platforms - Platform definitions [{x, y, width}]
 * @param {Array} colorPalette - Pre-computed Kaplay color objects
 * @returns {Array} Grass blade data
 */
function generateGrass(platforms, colorPalette) {
  const blades = []
  platforms.forEach(platform => {
    const startX = platform.x - platform.width / 2 + 5
    const endX = platform.x + platform.width / 2 - 5
    for (let x = startX; x < endX; x += GRASS_SPACING) {
      const height = GRASS_HEIGHT_MIN + Math.random() * (GRASS_HEIGHT_MAX - GRASS_HEIGHT_MIN)
      //
      // Vary blade width slightly for natural look
      //
      const widthVariation = 0.7 + Math.random() * 0.6
      blades.push({
        x: x + (Math.random() - 0.5) * 4,
        baseY: platform.y - GRASS_RAISE_OFFSET,
        tipY: platform.y - GRASS_RAISE_OFFSET - height,
        halfWidth: GRASS_BLADE_WIDTH * widthVariation / 2,
        swaySpeed: GRASS_SWAY_SPEED_MIN + Math.random() * (GRASS_SWAY_SPEED_MAX - GRASS_SWAY_SPEED_MIN),
        swayOffset: Math.random() * Math.PI * 2,
        color: colorPalette[Math.floor(Math.random() * colorPalette.length)]
      })
    }
  })
  return blades
}

/**
 * Generates vine data hanging from the bottom of platforms
 * Skips platforms at indices listed in skipIndices
 * @param {Array} platforms - Platform definitions [{x, y, width}]
 * @param {number} platformHeight - Platform thickness in pixels
 * @param {Array} skipIndices - Platform indices to skip
 * @returns {Array} Vine data
 */
function generateVines(platforms, platformHeight, skipIndices = []) {
  const vines = []
  platforms.forEach((platform, idx) => {
    if (skipIndices.includes(idx)) return
    const count = VINE_PER_PLATFORM_MIN + Math.floor(Math.random() * (VINE_PER_PLATFORM_MAX - VINE_PER_PLATFORM_MIN + 1))
    for (let i = 0; i < count; i++) {
      vines.push({
        x: platform.x - platform.width / 2 + 20 + Math.random() * (platform.width - 40),
        startY: platform.y + platformHeight,
        length: VINE_LENGTH_MIN + Math.random() * (VINE_LENGTH_MAX - VINE_LENGTH_MIN),
        swaySpeed: VINE_SWAY_SPEED_MIN + Math.random() * (VINE_SWAY_SPEED_MAX - VINE_SWAY_SPEED_MIN),
        swayOffset: Math.random() * Math.PI * 2
      })
    }
  })
  return vines
}

/**
 * Generates thorn spike data along the bottom wall surface
 * @returns {Array} Thorn data [{x, baseY, width, height, tipOffset}]
 */
function generateBottomWallThorns() {
  const thorns = []
  const startX = CFG.visual.gameArea.leftMargin + 5
  const endX = CFG.visual.screen.width - CFG.visual.gameArea.rightMargin - 5
  const baseY = CFG.visual.screen.height - CFG.visual.gameArea.bottomMargin - THORN_RAISE_OFFSET
  for (let x = startX; x < endX; x += THORN_SPACING) {
    thorns.push({
      x: x + (Math.random() - 0.5) * 6,
      baseY,
      width: THORN_WIDTH_MIN + Math.random() * (THORN_WIDTH_MAX - THORN_WIDTH_MIN),
      height: THORN_HEIGHT_MIN + Math.random() * (THORN_HEIGHT_MAX - THORN_HEIGHT_MIN),
      tipOffset: (Math.random() - 0.5) * THORN_TIP_OFFSET
    })
  }
  return thorns
}

/**
 * Generates thorn data for specific platform zones
 * Thorns point upward from the platform surface
 * @param {Array} zones - Array of {startX, endX, y} defining thorn coverage
 * @returns {Array} Thorn data (same format as bottom wall thorns)
 */
function generatePlatformThorns(zones) {
  const thorns = []
  zones.forEach(zone => {
    for (let x = zone.startX; x < zone.endX; x += THORN_SPACING) {
      thorns.push({
        x: x + (Math.random() - 0.5) * 6,
        baseY: zone.y - THORN_RAISE_OFFSET,
        width: THORN_WIDTH_MIN + Math.random() * (THORN_WIDTH_MAX - THORN_WIDTH_MIN),
        height: THORN_HEIGHT_MIN + Math.random() * (THORN_HEIGHT_MAX - THORN_HEIGHT_MIN),
        tipOffset: (Math.random() - 0.5) * THORN_TIP_OFFSET
      })
    }
  })
  return thorns
}

/**
 * Draws thorn spikes as sharp upward triangles (same style as level 3 bottom wall)
 * @param {Object} k - Kaplay instance
 * @param {Array} thornData - Array of thorn definitions
 * @param {*} [fillColor] - Optional inner fill (Kaplay Color); default gray-purple
 */
export function drawThorns(k, thornData, fillColor) {
  const thornColor = fillColor ?? k.rgb(70, 65, 80)
  const outlineColor = k.rgb(0, 0, 0)
  const ow = THORN_OUTLINE_WIDTH
  thornData.forEach(thorn => {
    //
    // Draw black outline (slightly larger triangle behind the thorn)
    //
    k.drawPolygon({
      pts: [
        k.vec2(thorn.x - thorn.width / 2 - ow, thorn.baseY + ow),
        k.vec2(thorn.x + thorn.width / 2 + ow, thorn.baseY + ow),
        k.vec2(thorn.x + thorn.tipOffset, thorn.baseY - thorn.height - ow)
      ],
      color: outlineColor
    })
    //
    // Draw thorn fill on top
    //
    k.drawPolygon({
      pts: [
        k.vec2(thorn.x - thorn.width / 2, thorn.baseY),
        k.vec2(thorn.x + thorn.width / 2, thorn.baseY),
        k.vec2(thorn.x + thorn.tipOffset, thorn.baseY - thorn.height)
      ],
      color: thornColor
    })
  })
}
