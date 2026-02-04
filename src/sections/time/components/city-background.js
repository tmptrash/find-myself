import { CFG } from '../cfg.js'
import { toPng } from '../../../utils/helper.js'

/**
 * Creates city background sprite for time section levels
 * @param {Object} k - Kaplay instance
 * @param {number} bottomPlatformHeight - Bottom platform height
 * @param {boolean} [showSun=true] - Whether to show the sun
 * @returns {string} Data URL of the background sprite
 */
export function createCityBackgroundSprite(k, bottomPlatformHeight, showSun = true) {
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
    // Calculate sun position (needed for building height calculation)
    //
    const sunX = screenWidth * 0.85 - 100  // Moved left by 100px
    const sunY = screenHeight * 0.2 + 150  // Moved down by 150px
    const sunRadius = 90  // Increased size (was 60)
    const pulse = 1.0  // Static pulse for static image
    
    //
    // Draw sun (larger, brighter, more to the right) - only if showSun is true
    //
    if (showSun) {
      
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
    }
    
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
    //
    // Calculate maximum building height to not cover the sun
    // Sun is at sunY, leave some space (100px) below it
    //
    const maxBuildingHeight = bottomPlatformY - sunY - 100
    
    //
    // First pass: Draw deepest background buildings (darkest, fill all gaps)
    //
    let currentX = 0
    const deepestBuildings = []
    while (currentX < screenWidth * 1.2) {
      //
      // Deepest buildings are smallest, darkest, and fill all gaps
      //
      const deepWidth = randomRange(40, 120)
      const deepHeight = Math.min(
        randomRange(maxBuildingHeight * 0.1, maxBuildingHeight * 0.3),
        maxBuildingHeight
      )  // Lowest buildings (10-30% of max height, but not above max)
      const deepBuildingY = bottomPlatformY - deepHeight
      const deepColor = randomInt(20, 35)  // Darkest color (20-35)
      
      deepestBuildings.push({
        x: currentX,
        y: deepBuildingY,
        width: deepWidth,
        height: deepHeight,
        color: deepColor
      })
      
      //
      // Very small spacing to fill all gaps
      //
      const deepSpacing = randomRange(5, 25)
      currentX += deepWidth + deepSpacing
    }
    
    //
    // Draw deepest buildings first (they will appear behind everything)
    //
    deepestBuildings.forEach(deep => {
      ctx.fillStyle = `rgb(${deep.color}, ${deep.color}, ${deep.color})`
      ctx.fillRect(deep.x, deep.y, deep.width, deep.height)
      
      ctx.strokeStyle = `rgb(${deep.color - 5}, ${deep.color - 5}, ${deep.color - 5})`
      ctx.lineWidth = 1
      ctx.strokeRect(deep.x, deep.y, deep.width, deep.height)
      
      //
      // Very few windows for deepest buildings
      //
      const windowRows = Math.floor(deep.height / 35)
      const windowCols = Math.floor(deep.width / 30)
      for (let row = 0; row < windowRows; row++) {
        for (let col = 0; col < windowCols; col++) {
          if (Math.random() > 0.7) {  // Very few windows (30% chance)
            const windowX = deep.x + (col + 0.5) * (deep.width / windowCols)
            const windowY = deep.y + (row + 0.5) * (deep.height / windowRows)
            const windowSize = 3  // Smallest windows
            const brightness = 50 + Math.random() * 10  // Darkest windows
            
            ctx.fillStyle = `rgb(${brightness}, ${brightness}, ${brightness})`
            ctx.fillRect(windowX - windowSize / 2, windowY - windowSize / 2, windowSize, windowSize)
          }
        }
      }
    })
    
    //
    // Second pass: Draw background buildings (lower and darker)
    //
    currentX = 0
    const backgroundBuildings = []
    while (currentX < screenWidth * 1.2) {
      //
      // Background buildings are smaller and darker
      //
      const bgWidth = randomRange(60, 180)
      const bgHeight = Math.min(
        randomRange(maxBuildingHeight * 0.15, maxBuildingHeight * 0.4),
        maxBuildingHeight
      )  // Lower buildings (15-40% of max height, but not above max)
      const bgBuildingY = bottomPlatformY - bgHeight
      const bgColor = randomInt(35, 50)  // Darker color (35-50 instead of 60-80)
      
      backgroundBuildings.push({
        x: currentX,
        y: bgBuildingY,
        width: bgWidth,
        height: bgHeight,
        color: bgColor
      })
      
      const bgSpacing = randomRange(20, 60)
      currentX += bgWidth + bgSpacing
    }
    
    //
    // Draw background buildings first (they will appear behind foreground buildings)
    //
    backgroundBuildings.forEach(bg => {
      ctx.fillStyle = `rgb(${bg.color}, ${bg.color}, ${bg.color})`
      ctx.fillRect(bg.x, bg.y, bg.width, bg.height)
      
      ctx.strokeStyle = `rgb(${bg.color - 8}, ${bg.color - 8}, ${bg.color - 8})`
      ctx.lineWidth = 1.5
      ctx.strokeRect(bg.x, bg.y, bg.width, bg.height)
      
      //
      // Fewer windows for background buildings
      //
      const windowRows = Math.floor(bg.height / 30)
      const windowCols = Math.floor(bg.width / 25)
      for (let row = 0; row < windowRows; row++) {
        for (let col = 0; col < windowCols; col++) {
          if (Math.random() > 0.5) {  // Less windows (50% chance instead of 70%)
            const windowX = bg.x + (col + 0.5) * (bg.width / windowCols)
            const windowY = bg.y + (row + 0.5) * (bg.height / windowRows)
            const windowSize = 4  // Smaller windows
            const brightness = 80 + Math.random() * 15  // Darker windows
            
            ctx.fillStyle = `rgb(${brightness}, ${brightness}, ${brightness})`
            ctx.fillRect(windowX - windowSize / 2, windowY - windowSize / 2, windowSize, windowSize)
          }
        }
      }
    })
    
    //
    // Second pass: Draw foreground buildings (higher and brighter, fewer of them)
    //
    currentX = 0
    while (currentX < screenWidth * 1.2) {
      //
      // Varied building widths - wide range for more diversity
      // Some buildings are narrow, some are very wide
      //
      const widthVariation = Math.random()
      let width
      if (widthVariation < 0.3) {
        //
        // 30% chance: narrow buildings (80-140px)
        //
        width = randomRange(80, 140)
      } else if (widthVariation < 0.7) {
        //
        // 40% chance: medium buildings (140-220px)
        //
        width = randomRange(140, 220)
      } else {
        //
        // 30% chance: wide buildings (220-350px)
        //
        width = randomRange(220, 350)
      }
      //
      // Foreground buildings go from bottom platform upward (not below it)
      // Height varies from 40% to 70% of available space (higher than background)
      //
      const availableHeight = bottomPlatformY
      const height = randomRange(availableHeight * 0.4, availableHeight * 0.7)
      const buildingY = bottomPlatformY - height  // Start from platform, go upward
      const windowRows = Math.floor(height / 25)
      const windowCols = Math.floor(width / 20)
      const color = randomInt(60, 80)  // Brighter than background buildings
      
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
      
      //
      // Varied spacing between foreground buildings - wider gaps to show background buildings
      // Some gaps are small, some are large
      //
      const spacingVariation = Math.random()
      let spacing
      if (spacingVariation < 0.2) {
        //
        // 20% chance: small gaps (15-30px)
        //
        spacing = randomRange(15, 30)
      } else if (spacingVariation < 0.5) {
        //
        // 30% chance: medium gaps (30-60px)
        //
        spacing = randomRange(30, 60)
      } else if (spacingVariation < 0.8) {
        //
        // 30% chance: large gaps (60-100px)
        //
        spacing = randomRange(60, 100)
      } else {
        //
        // 20% chance: very large gaps (100-150px)
        //
        spacing = randomRange(100, 150)
      }
      
      currentX += width + spacing
    }
    
    //
    // Third pass: Draw blurred trees in front of buildings (but blurred for depth effect)
    //
    ctx.filter = 'blur(8px)'  // Strong blur for trees
    
    //
    // Calculate available height for trees (same as for buildings)
    //
    const availableHeightForTrees = bottomPlatformY
    
    currentX = 0
    while (currentX < screenWidth * 1.2) {
      //
      // Trees are low and spread out
      //
      const treeWidth = randomRange(30, 80)
      const treeHeight = randomRange(availableHeightForTrees * 0.08, availableHeightForTrees * 0.25)  // Low trees (8-25% of height)
      const treeY = bottomPlatformY - treeHeight
      const treeX = currentX + randomRange(0, treeWidth * 0.3)  // Slight random offset
      
      //
      // Tree trunk (dark, narrow)
      //
      const trunkWidth = randomRange(4, 8)
      const trunkHeight = treeHeight * randomRange(0.3, 0.5)
      const trunkX = treeX + treeWidth / 2 - trunkWidth / 2
      const trunkY = bottomPlatformY - trunkHeight
      const trunkColor = randomInt(25, 35)  // Dark trunk
      
      ctx.fillStyle = `rgb(${trunkColor}, ${trunkColor}, ${trunkColor})`
      ctx.fillRect(trunkX, trunkY, trunkWidth, trunkHeight)
      
      //
      // Tree foliage (darker green-gray, rounded shape)
      //
      const foliageColor = randomInt(30, 45)  // Dark green-gray
      const foliageRadius = treeWidth * randomRange(0.4, 0.6)
      const foliageX = treeX + treeWidth / 2
      const foliageY = treeY + foliageRadius * 0.3
      
      //
      // Draw foliage as overlapping circles for natural tree shape
      //
      ctx.fillStyle = `rgb(${foliageColor}, ${foliageColor + 5}, ${foliageColor})`
      
      //
      // Main foliage circle
      //
      ctx.beginPath()
      ctx.arc(foliageX, foliageY, foliageRadius, 0, Math.PI * 2)
      ctx.fill()
      
      //
      // Additional smaller circles for more natural shape
      //
      const additionalCircles = Math.floor(Math.random() * 3) + 1  // 1-3 additional circles
      for (let i = 0; i < additionalCircles; i++) {
        const offsetX = (Math.random() - 0.5) * foliageRadius * 0.8
        const offsetY = (Math.random() - 0.5) * foliageRadius * 0.6
        const smallRadius = foliageRadius * randomRange(0.4, 0.7)
        
        ctx.beginPath()
        ctx.arc(foliageX + offsetX, foliageY + offsetY, smallRadius, 0, Math.PI * 2)
        ctx.fill()
      }
      
      //
      // Spacing between trees
      //
      const treeSpacing = randomRange(40, 100)
      currentX += treeWidth + treeSpacing
    }
    
    ctx.filter = 'none'
  })
}

/**
 * Preloads city background sprite
 * @param {Object} k - Kaplay instance
 * @param {number} bottomPlatformHeight - Bottom platform height
 * @param {string} [spriteName='city-background'] - Sprite name to use
 * @param {boolean} [showSun=true] - Whether to show the sun
 */
export function preloadCityBackground(k, bottomPlatformHeight, spriteName = 'city-background', showSun = true) {
  const spriteData = createCityBackgroundSprite(k, bottomPlatformHeight, showSun)
  k.loadSprite(spriteName, spriteData)
}
