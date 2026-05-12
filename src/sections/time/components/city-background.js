import { CFG } from '../cfg.js'
import { toPng } from '../../../utils/helper.js'

//
// Per-sprite window positions stored during generation.
// Keyed by spriteName so each level can have its own set.
//
const windowsPerSprite = {}

/**
 * Returns window glow positions collected during the last preload of a given sprite.
 * @param {string} spriteName - The sprite name used in preloadCityBackground
 * @returns {Array<{x: number, y: number, size: number, warm: boolean}>}
 */
export function getWindowPositions(spriteName) {
  return windowsPerSprite[spriteName] ?? []
}

/**
 * Creates city background sprite for time section levels
 * @param {Object} k - Kaplay instance
 * @param {number} bottomPlatformHeight - Bottom platform height
 * @param {boolean} [showSun=true] - Whether to show the sun
 * @param {boolean} [autumnLeaves=false] - Whether to use autumn colors for tree leaves
 * @param {boolean} [showCars=true] - Whether to show moving cars
 * @param {number} [deepBuildingHeightMultiplier=0.25] - Height multiplier for deepest buildings (0.15-0.35 by default means 15-35%)
 * @returns {string} Data URL of the background sprite
 */
//
// Upper bound on collected night-glow windows; sampling uses probability so all buildings are covered
//
const MAX_WINDOW_GLOWS = 180
//
// Probability each drawn window is sampled for night glow — keeps coverage even across all buildings
//
const WINDOW_SAMPLE_RATE = 0.18

export function createCityBackgroundSprite(k, bottomPlatformHeight, showSun = true, autumnLeaves = false, showCars = true, deepBuildingHeightMultiplier = 0.25, capBySun = showSun) {
  const screenWidth = CFG.visual.screen.width
  const screenHeight = CFG.visual.screen.height
  //
  // Collect foreground building window positions for night glow
  //
  const windows = []
  const dataUrl = toPng({ width: screenWidth, height: screenHeight, pixelRatio: 1 }, (ctx) => {
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
    const sunX = screenWidth * 0.85 - 50
    const sunY = screenHeight * 0.2 + 150  // Moved down by 150px
    const sunRadius = 52
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
    // Sun is at sunY, leave more space (sunRadius + 200px) below it
    //
    const maxBuildingHeight = capBySun ? (bottomPlatformY - sunY - sunRadius - 200) : bottomPlatformY
    
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
      const deepHeight = randomRange(maxBuildingHeight * 0.1, maxBuildingHeight * deepBuildingHeightMultiplier)
      const deepBuildingY = bottomPlatformY - deepHeight
      const deepColor = randomInt(30, 55)  // Darkest color (20-35)
      
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
      // Very few windows for deepest buildings with blur glow
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
            //
            // Add blur glow for deepest buildings
            //
            ctx.shadowBlur = 8
            ctx.shadowColor = `rgba(${brightness}, ${brightness}, ${brightness}, 0.6)`
            ctx.fillStyle = `rgb(${brightness}, ${brightness}, ${brightness})`
            ctx.fillRect(windowX - windowSize / 2, windowY - windowSize / 2, windowSize, windowSize)
            ctx.shadowBlur = 0
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
      const bgColor = randomInt(50, 70)  // Darker color (35-50 instead of 60-80)
      
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
      // Fewer windows for background buildings with blur glow
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
            //
            // Add blur glow for background buildings
            //
            ctx.shadowBlur = 6
            ctx.shadowColor = `rgba(${brightness}, ${brightness}, ${brightness}, 0.5)`
            ctx.fillStyle = `rgb(${brightness}, ${brightness}, ${brightness})`
            ctx.fillRect(windowX - windowSize / 2, windowY - windowSize / 2, windowSize, windowSize)
            ctx.shadowBlur = 0
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
      // But check if building would overlap with sun
      //
      const availableHeight = bottomPlatformY
      let height = randomRange(availableHeight * 0.4, availableHeight * 0.7)
      const buildingY = bottomPlatformY - height  // Start from platform, go upward
      //
      // Check if this building overlaps with sun horizontally and would be too tall
      //
      if (capBySun) {
        const buildingRight = currentX + width
        const sunLeft = sunX - sunRadius - 50
        const sunRight = sunX + sunRadius + 50
        //
        // If building overlaps with sun/moon area horizontally, cap its height
        //
        if (currentX < sunRight && buildingRight > sunLeft) {
          const maxHeightForSun = bottomPlatformY - sunY - sunRadius - 100
          if (height > maxHeightForSun) {
            height = Math.max(maxHeightForSun, availableHeight * 0.2)
          }
        }
      }
      const finalBuildingY = bottomPlatformY - height
      const windowRows = Math.floor(height / 25)
      const windowCols = Math.floor(width / 20)
      const color = randomInt(65, 80)  // Brighter than background buildings
      
      // Building
      ctx.fillStyle = `rgb(${color}, ${color}, ${color})`
      ctx.fillRect(currentX, finalBuildingY, width, height)
      
      ctx.strokeStyle = `rgb(${color - 10}, ${color - 10}, ${color - 10})`
      ctx.lineWidth = 2
      ctx.strokeRect(currentX, finalBuildingY, width, height)
      
      // Windows
      for (let row = 0; row < windowRows; row++) {
        for (let col = 0; col < windowCols; col++) {
          if (Math.random() > 0.3) {
            const windowX = currentX + (col + 0.5) * (width / windowCols)
            const windowY = finalBuildingY + (row + 0.5) * (height / windowRows)
            const windowSize = 6
            //
            // Uniform brightness so all daytime windows look the same shade
            //
            const brightness = 158
            ctx.fillStyle = `rgb(${brightness}, ${brightness}, ${brightness})`
            ctx.fillRect(windowX - windowSize / 2, windowY - windowSize / 2, windowSize, windowSize)
            //
            // Sample ~18% of drawn windows across all buildings for night glow — ensures even
            // coverage rather than filling the buffer with only the first building's windows
            //
            if (windows.length < MAX_WINDOW_GLOWS && Math.random() < WINDOW_SAMPLE_RATE) {
              windows.push({ x: windowX, y: windowY, size: windowSize, warm: Math.random() > 0.3 })
            }
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
    // Third pass: blurred organic trees (touch-like silhouette with uneven trunks + leaf clusters)
    //
    drawBlurredOrganicTrees(ctx, {
      screenWidth,
      bottomPlatformY,
      autumnLeaves
    })
  })
  return { dataUrl, windows }
}

function drawBlurredOrganicTrees(ctx, cfg) {
  const { screenWidth, bottomPlatformY, autumnLeaves } = cfg
  ctx.filter = 'blur(7px)'
  let currentX = 0
  while (currentX < screenWidth * 1.2) {
    const crownWidth = randomRange(44, 92)
    const treeX = currentX + randomRange(0, crownWidth * 0.28)
    const trunkHeight = randomRange(56, 125)
    drawOrganicTrunk(ctx, treeX + crownWidth * 0.5, bottomPlatformY, trunkHeight)
    const crownY = bottomPlatformY - trunkHeight - randomRange(14, 24)
    drawOrganicLeafCluster(ctx, treeX + crownWidth * 0.5, crownY, crownWidth, autumnLeaves)
    const treeSpacing = randomRange(52, 118)
    currentX += crownWidth + treeSpacing
  }
  ctx.filter = 'none'
}

function drawOrganicTrunk(ctx, centerX, bottomY, trunkHeight) {
  const segmentCount = 7 + Math.floor(Math.random() * 4)
  const stepY = trunkHeight / segmentCount
  const trunkColor = randomInt(28, 45)
  const trunkR = trunkColor
  const trunkG = trunkColor - randomInt(2, 5)
  const trunkB = trunkColor - randomInt(8, 12)
  ctx.strokeStyle = `rgba(${trunkR}, ${trunkG}, ${trunkB}, 0.9)`
  ctx.lineCap = 'round'
  let prevX = centerX + randomRange(-2.5, 2.5)
  let prevY = bottomY
  for (let i = 0; i < segmentCount; i++) {
    const t = i / Math.max(1, segmentCount - 1)
    const trunkW = 5.5 - t * 2.3 + randomRange(-0.35, 0.35)
    const nextX = prevX + randomRange(-3.6, 3.6)
    const nextY = bottomY - (i + 1) * stepY
    ctx.lineWidth = Math.max(2.2, trunkW)
    ctx.beginPath()
    ctx.moveTo(prevX, prevY)
    ctx.lineTo(nextX, nextY)
    ctx.stroke()
    prevX = nextX
    prevY = nextY
  }
}

function drawOrganicLeafCluster(ctx, centerX, crownCenterY, crownWidth, autumnLeaves) {
  const leafCount = 28 + Math.floor(Math.random() * 24)
  const spreadX = crownWidth * randomRange(0.4, 0.58)
  const spreadY = crownWidth * randomRange(0.3, 0.42)
  for (let i = 0; i < leafCount; i++) {
    const angle = randomRange(0, Math.PI * 2)
    const dist = Math.random()
    const lx = centerX + Math.cos(angle) * spreadX * dist
    const ly = crownCenterY + Math.sin(angle) * spreadY * dist * 0.8
    const size = randomRange(4.4, 8.8)
    const rot = randomRange(-Math.PI, Math.PI)
    const leafColor = pickLeafColor(autumnLeaves)
    drawLeafShape(ctx, lx, ly, size, rot, leafColor)
  }
}

function pickLeafColor(autumnLeaves) {
  if (autumnLeaves) {
    const palette = [
      [188, 78, 45],
      [208, 112, 54],
      [218, 154, 66],
      [180, 66, 44],
      [206, 132, 46]
    ]
    const base = palette[Math.floor(Math.random() * palette.length)]
    return {
      r: base[0] + randomInt(-12, 12),
      g: base[1] + randomInt(-12, 12),
      b: base[2] + randomInt(-10, 10),
      a: randomRange(0.68, 0.92)
    }
  }
  const greenPalette = [
    [48, 106, 46],
    [56, 122, 52],
    [42, 92, 40],
    [66, 132, 58]
  ]
  const base = greenPalette[Math.floor(Math.random() * greenPalette.length)]
  return {
    r: base[0] + randomInt(-10, 10),
    g: base[1] + randomInt(-10, 10),
    b: base[2] + randomInt(-10, 10),
    a: randomRange(0.66, 0.9)
  }
}

function drawLeafShape(ctx, x, y, size, angle, color) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.quadraticCurveTo(-size * 0.62, -size * 0.35, 0, -size)
  ctx.quadraticCurveTo(size * 0.62, -size * 0.35, 0, 0)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = `rgba(${Math.max(0, color.r - 36)}, ${Math.max(0, color.g - 42)}, ${Math.max(0, color.b - 36)}, ${Math.min(0.35, color.a * 0.46)})`
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(0, -size)
  ctx.stroke()
  ctx.restore()
}

function randomRange(min, max) {
  return Math.random() * (max - min) + min
}

function randomInt(min, max) {
  return Math.floor(randomRange(min, max))
}

/**
 * Preloads city background sprite
 * @param {Object} k - Kaplay instance
 * @param {number} bottomPlatformHeight - Bottom platform height
 * @param {string} [spriteName='city-background'] - Sprite name to use
 * @param {boolean} [showSun=true] - Whether to show the sun
 * @param {boolean} [autumnLeaves=false] - Whether to use autumn colors for tree leaves
 * @param {boolean} [showCars=true] - Whether to show moving cars
 * @param {number} [deepBuildingHeightMultiplier=0.25] - Height multiplier for deepest buildings
 */
export function preloadCityBackground(k, bottomPlatformHeight, spriteName = 'city-background', showSun = true, autumnLeaves = false, showCars = true, deepBuildingHeightMultiplier = 0.25, capBySun = showSun) {
  const { dataUrl, windows } = createCityBackgroundSprite(k, bottomPlatformHeight, showSun, autumnLeaves, showCars, deepBuildingHeightMultiplier, capBySun)
  k.loadSprite(spriteName, dataUrl)
  windowsPerSprite[spriteName] = windows
}
