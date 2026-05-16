import { toCanvas } from '../../../utils/helper.js'
import { getDarkness } from '../utils/time-day-night.js'
/**
 * Creates a blurred car sprite using canvas with blur filter
 * @param {Object} params - Car parameters
 * @param {number} params.bodyWidth - Car body width
 * @param {number} params.bodyHeight - Car body height
 * @param {number} params.roofWidth - Car roof width
 * @param {number} params.roofHeight - Car roof height
 * @param {number} params.wheelRadius - Wheel radius
 * @param {number} params.bodyColor - Body color (gray value 0-255)
 * @param {number} params.roofColor - Roof color (gray value 0-255)
 * @param {number} params.wheelColor - Wheel color (gray value 0-255)
 * @param {number} params.windowColor - Window color (gray value 0-255)
 * @param {number} params.speed - Car speed (for window direction)
 * @returns {string} Data URL of the car sprite
 */
function createBlurredCarSprite({ bodyWidth, bodyHeight, roofWidth, roofHeight, wheelRadius, bodyColor, roofColor, wheelColor, windowColor, speed }) {
  //
  // Calculate canvas size (add padding for blur)
  //
  const padding = 20
  const canvasWidth = bodyWidth + padding * 2
  const canvasHeight = roofHeight + bodyHeight + wheelRadius + padding * 2
  const centerX = canvasWidth / 2
  const centerY = canvasHeight - padding - wheelRadius
  
  return toCanvas({ width: canvasWidth, height: canvasHeight, pixelRatio: 1 }, (ctx) => {
    //
    // Clear canvas with transparent background
    //
    ctx.clearRect(0, 0, canvasWidth, canvasHeight)
    //
    // Apply blur filter (same as buildings - blur(6px))
    //
    ctx.filter = 'blur(6px)'
    //
    // Helper function to draw rounded rectangle
    //
    const drawRoundedRect = (x, y, width, height, radius, color) => {
      ctx.fillStyle = `rgb(${color}, ${color}, ${color})`
      ctx.beginPath()
      ctx.moveTo(x + radius, y)
      ctx.lineTo(x + width - radius, y)
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
      ctx.lineTo(x + width, y + height - radius)
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
      ctx.lineTo(x + radius, y + height)
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
      ctx.lineTo(x, y + radius)
      ctx.quadraticCurveTo(x, y, x + radius, y)
      ctx.closePath()
      ctx.fill()
    }
    //
    // Car body outline (darker stroke) - draw first (behind)
    //
    const outlineWidth = 1.5
    const outlineColor = bodyColor - 20
    //
    // Body outline
    //
    drawRoundedRect(
      centerX - bodyWidth / 2 - outlineWidth,
      centerY - bodyHeight,
      bodyWidth + outlineWidth * 2,
      bodyHeight + outlineWidth * 2,
      4 + outlineWidth,
      outlineColor
    )
    //
    // Roof outline
    //
    drawRoundedRect(
      centerX - roofWidth / 2 - outlineWidth,
      centerY - bodyHeight - roofHeight - outlineWidth,
      roofWidth + outlineWidth * 2,
      roofHeight + outlineWidth * 2,
      4 + outlineWidth,
      outlineColor
    )
    //
    // Main car body (rounded rectangle)
    //
    drawRoundedRect(
      centerX - bodyWidth / 2,
      centerY - bodyHeight,
      bodyWidth,
      bodyHeight,
      4,
      bodyColor
    )
    //
    // Car roof (rounded rectangle)
    //
    drawRoundedRect(
      centerX - roofWidth / 2,
      centerY - bodyHeight - roofHeight,
      roofWidth,
      roofHeight,
      4,
      roofColor
    )
    //
    // Car windows
    //
    const windowWidth = roofWidth / 2 - 8
    const windowHeight = roofHeight - 8
    const windowY = centerY - bodyHeight - roofHeight + 4
    //
    // Front window (right side when moving right)
    //
    const frontWindowX = speed > 0 ? centerX + roofWidth / 4 : centerX - roofWidth / 4
    ctx.fillStyle = `rgb(${windowColor}, ${windowColor}, ${windowColor})`
    ctx.fillRect(frontWindowX - windowWidth / 2, windowY, windowWidth, windowHeight)
    //
    // Rear window
    //
    const rearWindowX = speed > 0 ? centerX - roofWidth / 4 : centerX + roofWidth / 4
    ctx.fillRect(rearWindowX - windowWidth / 2, windowY, windowWidth, windowHeight)
    //
    // Draw wheels (4 wheels)
    //
    const wheelY = centerY - wheelRadius
    const frontWheelX = centerX + bodyWidth / 3 - bodyWidth / 2
    const rearWheelX = centerX - bodyWidth / 3 + bodyWidth / 2
    //
    // Front wheels
    //
    ctx.fillStyle = `rgb(${wheelColor}, ${wheelColor}, ${wheelColor})`
    ctx.beginPath()
    ctx.arc(frontWheelX, wheelY, wheelRadius, 0, Math.PI * 2)
    ctx.fill()
    //
    // Rear wheels
    //
    ctx.beginPath()
    ctx.arc(rearWheelX, wheelY, wheelRadius, 0, Math.PI * 2)
    ctx.fill()
    //
    // Wheel rims (lighter circles inside)
    //
    const rimRadius = wheelRadius - 3
    ctx.fillStyle = `rgb(${wheelColor + 25}, ${wheelColor + 25}, ${wheelColor + 25})`
    ctx.beginPath()
    ctx.arc(frontWheelX, wheelY, rimRadius, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(rearWheelX, wheelY, rimRadius, 0, Math.PI * 2)
    ctx.fill()
    //
    // Diffused headlights at front bumper (same blur as body — soft glow)
    //
    const frontSign = speed > 0 ? 1 : -1
    const bumperY = centerY - bodyHeight * 0.26
    const headSpread = bodyWidth * 0.22
    const headRx = wheelRadius * 2.2
    const drawHeadDisc = (hx, hy) => {
      const grd = ctx.createRadialGradient(hx, hy, 0, hx, hy, headRx)
      grd.addColorStop(0, 'rgba(255, 250, 228, 0.22)')
      grd.addColorStop(0.35, 'rgba(255, 236, 195, 0.11)')
      grd.addColorStop(0.7, 'rgba(255, 218, 165, 0.045)')
      grd.addColorStop(1, 'rgba(255, 208, 150, 0)')
      ctx.fillStyle = grd
      ctx.beginPath()
      ctx.arc(hx, hy, headRx, 0, Math.PI * 2)
      ctx.fill()
    }
    const hxBase = centerX + frontSign * (bodyWidth * 0.56)
    drawHeadDisc(hxBase - frontSign * headSpread * 0.42, bumperY)
    drawHeadDisc(hxBase - frontSign * headSpread * 0.95, bumperY + wheelRadius * 0.12)
  })
}

/**
 * Creates moving blurred cars on background (sedans/SUVs with wheels, driving on bottom platform)
 * Cars are rendered as blurred sprites using canvas with blur filter
 * @param {Object} config - Configuration
 * @param {Object} config.k - Kaplay instance
 * @param {number} config.platformBottomHeight - Height of bottom platform
 * @param {number} config.platformSideWidth - Width of side platforms
 * @param {number} [config.carCount=5] - Number of cars to create
 */
export function create(config) {
  const { k, platformBottomHeight, platformSideWidth, carCount = 5 } = config
  //
  // Car parameters
  //
  const platformTopY = k.height() - platformBottomHeight + 17  // Top of bottom platform
  const carSpeedMin = 10  // Minimum speed (px/s) - slower
  const carSpeedMax = 30  // Maximum speed (px/s) - slower
  const gameAreaLeft = platformSideWidth
  const gameAreaRight = k.width() - platformSideWidth
  const gameAreaWidth = gameAreaRight - gameAreaLeft
  const cars = []
  //
  // Create cars moving in different directions
  // Distribute cars horizontally across the platform at start
  //
  for (let i = 0; i < carCount; i++) {
    const direction = Math.random() > 0.5 ? 1 : -1  // Left (-1) or right (1)
    const carSpeed = (carSpeedMin + Math.random() * (carSpeedMax - carSpeedMin)) * direction
    const isSUV = Math.random() > 0.5  // 50% chance of SUV (taller) vs sedan
    const bodyWidth = isSUV ? 80 + Math.random() * 30 : 70 + Math.random() * 30  // 80-110px (SUV) or 70-100px (sedan)
    const bodyHeight = isSUV ? 35 + Math.random() * 10 : 30 + Math.random() * 8  // 35-45px (SUV) or 30-38px (sedan)
    const roofWidth = bodyWidth * 0.6  // Roof is 60% of body width
    const roofHeight = isSUV ? bodyHeight * 0.4 : bodyHeight * 0.5  // Roof height
    const wheelRadius = 10 + Math.random() * 4  // 10-14px radius
    const bodyColor = 50 + Math.random() * 20  // Gray color 50-70
    const roofColor = bodyColor - 15  // Darker roof
    const wheelColor = 30 + Math.random() * 15  // Dark wheels 30-45
    const windowColor = 80 + Math.random() * 20  // Lighter windows 80-100
    //
    // Create blurred car sprite
    //
    const carSpriteDataURL = createBlurredCarSprite({
      bodyWidth,
      bodyHeight,
      roofWidth,
      roofHeight,
      wheelRadius,
      bodyColor,
      roofColor,
      wheelColor,
      windowColor,
      speed: carSpeed
    })
    //
    // Load sprite with unique ID
    //
    const spriteId = `car-${Date.now()}-${i}-${Math.random()}`
    k.loadSprite(spriteId, carSpriteDataURL)
    //
    // Release canvas backing store immediately after Kaplay reads it.
    //
    carSpriteDataURL.width = 0
    carSpriteDataURL.height = 0
    //
    // Position car on bottom platform
    // Calculate car center position relative to canvas
    // Canvas: padding + wheels + body + roof + padding
    // centerY: canvasHeight - padding - wheelRadius (bottom of body)
    //
    const padding = 20
    const canvasHeight = roofHeight + bodyHeight + wheelRadius + padding * 2
    const centerY = canvasHeight - padding - wheelRadius
    const carY = platformTopY - (centerY + wheelRadius - canvasHeight / 2)  // Position sprite center so wheels touch platform
    //
    // Distribute cars horizontally across the platform at start (not all from edges)
    //
    const startX = gameAreaLeft + (i / (carCount - 1)) * gameAreaWidth + (Math.random() - 0.5) * (gameAreaWidth / carCount)
    //
    // Headlight offset: front bumper area, raised to upper body (hood level)
    // The body top in screen space is roughly car.pos.y - (canvasHeight/2 - 20 - wheelRadius - bodyHeight)
    // so offsetY ≈ -(canvasHeight/2 - 20 - wheelRadius - bodyHeight * 0.35) gives upper body placement
    //
    const headlightOffsetX = bodyWidth * 0.68
    const headlightOffsetY = -(canvasHeight / 2 - 20 - wheelRadius - bodyHeight * 0.30)
    const frontSign = carSpeed > 0 ? 1 : -1
    //
    // Add car sprite to scene; opacity dims at night so only headlights glow
    //
    const carObj = k.add([
      k.sprite(spriteId),
      k.pos(startX, carY),
      k.anchor('center'),
      k.z(15.6),
      {
        speed: carSpeed,
        gameAreaLeft,
        gameAreaRight,
        headlightOffsetX,
        headlightOffsetY,
        frontSign
      },
      {
        update() {
          this.pos.x += this.speed * k.dt()
          if (this.speed > 0 && this.pos.x > this.gameAreaRight + 100) {
            this.pos.x = this.gameAreaLeft - 100
          } else if (this.speed < 0 && this.pos.x < this.gameAreaLeft - 100) {
            this.pos.x = this.gameAreaRight + 100
          }
          //
          // Dim car body at night so only baked headlight glows remain visible
          //
          const darkness = getDarkness()
          this.opacity = Math.max(0.08, 1 - darkness * 1.15)
        }
      }
    ])
    cars.push(carObj)
  }
  createHeadlightLayer(k, cars)
}
/**
 * Creates the fixed headlight overlay layer for a set of cars.
 * Cars must have pos, frontSign, headlightOffsetX, headlightOffsetY properties.
 * @param {Object} k - Kaplay instance
 * @param {Array} cars - Array of car game objects
 * @param {boolean} [alwaysOn=false] - When true, draw headlights even during daytime
 * @param {number} [zIndex=15.62] - Z-index for the headlight layer
 */
export function createHeadlightLayer(k, cars, alwaysOn = false, zIndex = 15.62) {
  k.add([
    k.z(zIndex),
    k.fixed(),
    {
      draw() { drawHeadlights(k, cars, alwaysOn) }
    }
  ])
}
//
// Draw front headlight halos and red rear lights for each car.
// When alwaysOn=true (winter/night levels), minimum intensity applied even during day.
//
function drawHeadlights(k, cars, alwaysOn) {
  const darkness = getDarkness()
  if (!alwaysOn && darkness < 0.2) return
  const intensity = alwaysOn
    ? Math.max(0.25, Math.min(1, darkness / 0.55))
    : Math.min(1, (darkness - 0.2) / 0.35)
  for (const car of cars) {
    if (!car.pos) continue
    const hy = car.pos.y + car.headlightOffsetY
    //
    // Front headlights — warm white soft-blur glow (outer to inner)
    //
    const hx = car.pos.x + car.frontSign * car.headlightOffsetX
    k.drawCircle({ pos: k.vec2(hx, hy), radius: 48, color: k.rgb(255, 252, 210), opacity: intensity * 0.03 })
    k.drawCircle({ pos: k.vec2(hx, hy), radius: 34, color: k.rgb(255, 252, 210), opacity: intensity * 0.06 })
    k.drawCircle({ pos: k.vec2(hx, hy), radius: 22, color: k.rgb(255, 252, 210), opacity: intensity * 0.11 })
    k.drawCircle({ pos: k.vec2(hx, hy), radius: 10, color: k.rgb(255, 255, 240), opacity: intensity * 0.34 })
    k.drawCircle({ pos: k.vec2(hx, hy), radius: 4, color: k.rgb(255, 255, 255), opacity: intensity * 0.52 })
    //
    // Rear lights — red soft-blur glow
    //
    const rx = car.pos.x - car.frontSign * car.headlightOffsetX
    k.drawCircle({ pos: k.vec2(rx, hy), radius: 28, color: k.rgb(255, 20, 10), opacity: intensity * 0.05 })
    k.drawCircle({ pos: k.vec2(rx, hy), radius: 14, color: k.rgb(255, 20, 10), opacity: intensity * 0.12 })
    k.drawCircle({ pos: k.vec2(rx, hy), radius: 6, color: k.rgb(255, 40, 20), opacity: intensity * 0.38 })
    k.drawCircle({ pos: k.vec2(rx, hy), radius: 3, color: k.rgb(255, 80, 40), opacity: intensity * 0.62 })
  }
}
