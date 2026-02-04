import { toPng } from '../../../utils/helper.js'
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
  
  return toPng({ width: canvasWidth, height: canvasHeight, pixelRatio: 1 }, (ctx) => {
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
    // Add car sprite to scene
    //
    k.add([
      k.sprite(spriteId),
      k.pos(startX, carY),
      k.anchor('center'),
      k.z(15.6),  // Behind rounded corners (15.8) but above background (15.5)
      {
        speed: carSpeed,
        gameAreaLeft,
        gameAreaRight
      },
      {
        update() {
          //
          // Move car horizontally
          //
          this.pos.x += this.speed * k.dt()
          //
          // Reset car position when it goes off-screen (wrap around)
          //
          if (this.speed > 0 && this.pos.x > this.gameAreaRight + 100) {
            this.pos.x = this.gameAreaLeft - 100
          } else if (this.speed < 0 && this.pos.x < this.gameAreaLeft - 100) {
            this.pos.x = this.gameAreaRight + 100
          }
        }
      }
    ])
  }
}
