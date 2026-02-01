import { CFG } from '../cfg.js'
import { toPng } from '../../../utils/helper.js'

/**
 * Creates city background sprite for time section level 0
 * @param {Object} config - Configuration
 * @param {Object} config.k - Kaplay instance
 * @param {number} config.bottomPlatformHeight - Bottom platform height
 * @returns {string} Data URL of the background sprite
 */
export function createCityBackgroundSprite(k, bottomPlatformHeight) {
  const screenWidth = CFG.visual.screen.width
  const screenHeight = CFG.visual.screen.height
  
  return toPng({ width: screenWidth, height: screenHeight, pixelRatio: 1 }, (ctx) => {
    //
    // Draw gradient background
    // Light gray goes to top of screen, dark gray goes to bottom
    //
    const gradient = ctx.createLinearGradient(0, 0, 0, screenHeight)
    gradient.addColorStop(0, '#9a9a9a')    // Light sky at top
    gradient.addColorStop(0.3, '#7a7a7a')
    gradient.addColorStop(0.5, '#5a5a5a')
    gradient.addColorStop(0.8, '#3a3a3a')  // Dark city
    gradient.addColorStop(1, '#2a2a2a')    // Darkest at bottom
    
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, screenWidth, screenHeight)
    
    //
    // Draw sun (larger, brighter, more to the right)
    //
    const sunX = screenWidth * 0.85  // Moved more to the right (was 0.75)
    const sunY = screenHeight * 0.2
    const sunRadius = 90  // Increased size (was 60)
    const pulse = 1.0  // Static pulse for static image
    
    // Blurred glow (multiple circles, brighter)
    for (let i = 5; i > 0; i--) {
      const sunGradient = ctx.createRadialGradient(
        sunX, sunY, 0,
        sunX, sunY, sunRadius * i * 0.5 * pulse
      )
      
      const opacity = 0.06 / i  // Increased brightness (was 0.03 / i)
      sunGradient.addColorStop(0, `rgba(255, 255, 255, ${opacity * 2})`)
      sunGradient.addColorStop(1, `rgba(255, 255, 255, 0)`)
      
      ctx.fillStyle = sunGradient
      ctx.beginPath()
      ctx.arc(sunX, sunY, sunRadius * i * 0.5 * pulse, 0, Math.PI * 2)
      ctx.fill()
    }
    
    // Sun itself (brighter)
    const sunGradient = ctx.createRadialGradient(
      sunX, sunY, 0,
      sunX, sunY, sunRadius * pulse
    )
    sunGradient.addColorStop(0, 'rgba(255, 255, 255, 0.7)')  // Increased brightness (was 0.4)
    sunGradient.addColorStop(0.7, 'rgba(250, 250, 250, 0.4)')  // Increased brightness (was 0.2)
    sunGradient.addColorStop(1, 'rgba(240, 240, 240, 0)')
    
    ctx.fillStyle = sunGradient
    ctx.beginPath()
    ctx.arc(sunX, sunY, sunRadius * pulse, 0, Math.PI * 2)
    ctx.fill()
    
    //
    // Draw blurred buildings (even stronger blur)
    // Buildings start from bottom platform and go only upward
    //
    ctx.filter = 'blur(6px)'  // Slightly sharper than before (was 8px)
    
    const randomRange = (min, max) => Math.random() * (max - min) + min
    const randomInt = (min, max) => Math.floor(randomRange(min, max))
    
    //
    // Calculate bottom platform Y position (houses start from here)
    //
    const bottomPlatformY = screenHeight - bottomPlatformHeight
    
    let currentX = 0
    while (currentX < screenWidth * 1.2) {
      const width = randomRange(60, 150)
      //
      // Buildings go from bottom platform upward (not below it)
      // Height varies from 30% to 70% of available space above platform
      //
      const availableHeight = bottomPlatformY
      const height = randomRange(availableHeight * 0.3, availableHeight * 0.7)
      const buildingY = bottomPlatformY - height  // Start from platform, go upward
      const windowRows = Math.floor(height / 25)
      const windowCols = Math.floor(width / 20)
      const color = randomInt(60, 80)
      
      // Building
      ctx.fillStyle = `rgb(${color}, ${color}, ${color})`
      ctx.fillRect(currentX, buildingY, width, height)
      
      ctx.strokeStyle = `rgb(${color - 10}, ${color - 10}, ${color - 10})`
      ctx.lineWidth = 2
      ctx.strokeRect(currentX, buildingY, width, height)
      
      // Windows
      for (let row = 0; row < windowRows; row++) {
        for (let col = 0; col < windowCols; col++) {
          if (Math.random() > 0.3) {
            const windowX = currentX + (col + 0.5) * (width / windowCols)
            const windowY = buildingY + (row + 0.5) * (height / windowRows)
            const windowSize = 6
            const brightness = 150 + Math.random() * 20
            
            ctx.fillStyle = `rgb(${brightness}, ${brightness}, ${brightness})`
            ctx.fillRect(windowX - windowSize / 2, windowY - windowSize / 2, windowSize, windowSize)
          }
        }
      }
      
      currentX += width + randomRange(5, 15)
    }
    
    ctx.filter = 'none'
  })
}

/**
 * Preloads city background sprite
 * @param {Object} k - Kaplay instance
 * @param {number} bottomPlatformHeight - Bottom platform height
 * @param {string} [spriteName='city-background'] - Sprite name to use
 */
export function preloadCityBackground(k, bottomPlatformHeight, spriteName = 'city-background') {
  const spriteData = createCityBackgroundSprite(k, bottomPlatformHeight)
  k.loadSprite(spriteName, spriteData)
}
