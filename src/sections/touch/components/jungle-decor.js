import { CFG } from '../cfg.js'
import { toCanvas } from '../../../utils/helper.js'
//
// Grass blade configuration (triangular blades for realism)
//
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
// Thorn colors (matches defaults inside drawThorns)
//
const THORN_FILL_R = 72
const THORN_FILL_G = 56
const THORN_FILL_B = 42
const THORN_OUTLINE_R = 10
const THORN_OUTLINE_G = 9
const THORN_OUTLINE_B = 8
const THORN_HIGHLIGHT_R = 118
const THORN_HIGHLIGHT_G = 98
const THORN_HIGHLIGHT_B = 78
const THORN_HIGHLIGHT_OPACITY = 0.35
//
// Canvas padding around the thorn bounding box to avoid clipping edge thorns
//
const THORN_CANVAS_PADDING = 8
//
// Vertical offset to raise thorns above platform surface (pixels)
//
const THORN_RAISE_OFFSET = 3
//
// Unique sprite name counter — prevents name collision when multiple JungleDecor
// instances exist in the same session (e.g. level restart).
//
let _thornSpriteCounter = 0
//
// Bake thorn array to a tight canvas sprite and load it into Kaplay.
// Returns { spriteName, offsetX, offsetY } — the sprite's top-left world position.
// A single drawSprite call replaces 3 draw calls × N thorns every frame.
//
function bakeThornSprite(k, thornData) {
  if (!thornData || thornData.length === 0) return null
  //
  // Calculate tight bounding box
  //
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  const ow = 1.15
  thornData.forEach(thorn => {
    const hw = thorn.width / 2
    minX = Math.min(minX, thorn.x - hw - ow - THORN_CANVAS_PADDING)
    maxX = Math.max(maxX, thorn.x + hw + ow + THORN_CANVAS_PADDING)
    minY = Math.min(minY, thorn.baseY - THORN_HEIGHT_MAX - ow - THORN_CANVAS_PADDING)
    maxY = Math.max(maxY, thorn.baseY + ow + THORN_CANVAS_PADDING)
  })
  const canvasW = Math.ceil(maxX - minX)
  const canvasH = Math.ceil(maxY - minY)
  const canvas = toCanvas({ width: canvasW, height: canvasH }, ctx => {
    const ox = -minX
    const oy = -minY
    thornData.forEach(thorn => {
      const hw = thorn.width / 2
      const thornH = thorn.height
      const skew = Math.sin(thorn.x * 0.09 + thorn.baseY * 0.02) * (hw * 0.35)
      const tipX = thorn.x + (thorn.tipOffset || 0) + Math.cos(thorn.x * 0.06) * (hw * 0.25)
      const tipY = thorn.baseY - thornH
      const midRX = thorn.x + hw * 0.25 + skew
      const midLX = thorn.x - hw * 0.35 + skew * 0.4
      const upperMidY = thorn.baseY - thornH * 0.38
      //
      // Outline pass
      //
      ctx.fillStyle = `rgb(${THORN_OUTLINE_R},${THORN_OUTLINE_G},${THORN_OUTLINE_B})`
      ctx.beginPath()
      ctx.moveTo(thorn.x - hw - ow + ox, thorn.baseY + ow * 0.6 + oy)
      ctx.lineTo(thorn.x + hw + ow + ox, thorn.baseY + ow * 0.6 + oy)
      ctx.lineTo(midRX + ow * 0.8 + ox, upperMidY + oy)
      ctx.lineTo(tipX + ox, tipY - ow + oy)
      ctx.closePath()
      ctx.fill()
      //
      // Fill pass
      //
      ctx.fillStyle = `rgb(${THORN_FILL_R},${THORN_FILL_G},${THORN_FILL_B})`
      ctx.beginPath()
      ctx.moveTo(thorn.x - hw + ox, thorn.baseY + oy)
      ctx.lineTo(thorn.x + hw + ox, thorn.baseY + oy)
      ctx.lineTo(midRX + ox, upperMidY - 1 + oy)
      ctx.lineTo(tipX + ox, tipY + oy)
      ctx.closePath()
      ctx.fill()
      //
      // Highlight line
      //
      ctx.globalAlpha = THORN_HIGHLIGHT_OPACITY
      ctx.strokeStyle = `rgb(${THORN_HIGHLIGHT_R},${THORN_HIGHLIGHT_G},${THORN_HIGHLIGHT_B})`
      ctx.lineWidth = 1.1
      ctx.lineCap = 'butt'
      ctx.beginPath()
      ctx.moveTo(midLX + ox, thorn.baseY - 3 + oy)
      ctx.lineTo(tipX - skew * 0.2 + ox, tipY + thornH * 0.08 + oy)
      ctx.stroke()
      ctx.globalAlpha = 1
    })
  })
  const spriteName = `thorn-baked-${_thornSpriteCounter++}`
  k.loadSprite(spriteName, canvas)
  canvas.width = 0
  canvas.height = 0
  return { spriteName, offsetX: minX, offsetY: minY }
}
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
  //
  // Bake static thorn geometry to sprites at create time.
  // Each thorn set (bottom wall and platform zones) is drawn once to a tight
  // canvas and loaded as a sprite; onDraw replaces N×3 draw calls with 1 drawSprite.
  //
  const bottomThornSprite = bakeThornSprite(k, thornData)
  const platformThornSprite = bakeThornSprite(k, platformThornData)
  const inst = {
    k,
    hero,
    grassBlades,
    vines,
    thornData,
    platformThornData,
    bottomThornSprite,
    platformThornSprite
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
  const s = inst.bottomThornSprite
  if (s) {
    inst.k.drawSprite({ sprite: s.spriteName, pos: inst.k.vec2(s.offsetX, s.offsetY) })
    return
  }
  drawThorns(inst.k, inst.thornData, inst.thornColor)
}

/**
 * Draws platform thorns only (for rendering above darkness overlay)
 * @param {Object} inst - Jungle decoration instance
 */
export function onDrawPlatformThorns(inst) {
  const s = inst.platformThornSprite
  if (s) {
    inst.k.drawSprite({ sprite: s.spriteName, pos: inst.k.vec2(s.offsetX, s.offsetY) })
    return
  }
  drawThorns(inst.k, inst.platformThornData, inst.thornColor)
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
    const pad = 8
    const startX = platform.x - platform.width / 2 + pad
    const endX = platform.x + platform.width / 2 - pad
    const span = Math.max(0, endX - startX)
    const clusterCount = Math.max(2, Math.floor(span / 46 + Math.random() * 4))
    for (let c = 0; c < clusterCount; c++) {
      if (Math.random() < 0.07) continue
      const centerX = startX + Math.random() * span
      const clusterRadius = 9 + Math.random() * 34
      const bladeCount = 2 + Math.floor(Math.random() * 13)
      for (let b = 0; b < bladeCount; b++) {
        const dist = Math.pow(Math.random(), 1.48) * clusterRadius
        const ang = Math.random() * Math.PI * 2
        const x = centerX + Math.cos(ang) * dist * 0.92 + (Math.random() - 0.5) * 3
        if (x < startX || x > endX) continue
        const height = GRASS_HEIGHT_MIN + Math.random() * (GRASS_HEIGHT_MAX - GRASS_HEIGHT_MIN)
        const widthVariation = 0.7 + Math.random() * 0.6
        blades.push({
          x,
          baseY: platform.y - GRASS_RAISE_OFFSET,
          tipY: platform.y - GRASS_RAISE_OFFSET - height,
          halfWidth: GRASS_BLADE_WIDTH * widthVariation / 2,
          swaySpeed: GRASS_SWAY_SPEED_MIN + Math.random() * (GRASS_SWAY_SPEED_MAX - GRASS_SWAY_SPEED_MIN),
          swayOffset: Math.random() * Math.PI * 2,
          color: colorPalette[Math.floor(Math.random() * colorPalette.length)]
        })
      }
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
  //
  // Splintered stakes / snapped branches — irregular quads read as forest debris,
  // not abstract neon triangles (outline stays near-black for damp silhouettes).
  //
  const thornColor = fillColor ?? k.rgb(72, 56, 42)
  const outlineColor = k.rgb(10, 9, 8)
  const ow = 1.15
  const hi = k.rgb(118, 98, 78)
  thornData.forEach(thorn => {
    const hw = thorn.width / 2
    const h = thorn.height
    const skew = Math.sin(thorn.x * 0.09 + thorn.baseY * 0.02) * (hw * 0.35)
    const tipX = thorn.x + (thorn.tipOffset || 0) + Math.cos(thorn.x * 0.06) * (hw * 0.25)
    const tipY = thorn.baseY - h
    const midRX = thorn.x + hw * 0.25 + skew
    const midLX = thorn.x - hw * 0.35 + skew * 0.4
    const upperMidY = thorn.baseY - h * 0.38
    k.drawPolygon({
      pts: [
        k.vec2(thorn.x - hw - ow, thorn.baseY + ow * 0.6),
        k.vec2(thorn.x + hw + ow, thorn.baseY + ow * 0.6),
        k.vec2(midRX + ow * 0.8, upperMidY),
        k.vec2(tipX, tipY - ow)
      ],
      color: outlineColor
    })
    k.drawPolygon({
      pts: [
        k.vec2(thorn.x - hw, thorn.baseY),
        k.vec2(thorn.x + hw, thorn.baseY),
        k.vec2(midRX, upperMidY - 1),
        k.vec2(tipX, tipY)
      ],
      color: thornColor
    })
    k.drawLine({
      p1: k.vec2(midLX, thorn.baseY - 3),
      p2: k.vec2(tipX - skew * 0.2, tipY + h * 0.08),
      width: 1.1,
      color: hi,
      opacity: 0.35
    })
  })
}
