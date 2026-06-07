import { CFG } from '../cfg.js'
import { toCanvas, applyBoxBlur } from '../../../utils/helper.js'

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
//
// Level 0-1 tree tuning: higher trunks and denser green foliage
//
const LUSH_LEVEL0_CROWN_WIDTH_MIN = 58
const LUSH_LEVEL0_CROWN_WIDTH_MAX = 108
const LUSH_LEVEL0_TRUNK_HEIGHT_MIN = 88
const LUSH_LEVEL0_TRUNK_HEIGHT_MAX = 162
const LUSH_LEVEL0_TREE_SPACING_MIN = 34
const LUSH_LEVEL0_TREE_SPACING_MAX = 88
const LUSH_LEVEL0_EXTRA_CLUSTERS = 3
const LUSH_LEVEL0_LEAF_COUNT_BOOST = 2.2
const LUSH_LEVEL0_LEAF_SIZE_BOOST = 1.4
const LUSH_LEVEL0_BRANCH_COUNT_MIN = 14
const LUSH_LEVEL0_BRANCH_COUNT_MAX = 22
const LUSH_LEVEL0_BRANCH_LENGTH_MIN = 18
const LUSH_LEVEL0_BRANCH_LENGTH_MAX = 44
//
// Level 0 complementary palette — cool teal sky + buildings vs warm orange
// window accents (pairs with the dynamic orange sun in time-day-night.js).
//
const COMP_SKY_TOP = '#8AACB8'
const COMP_SKY_UPPER = '#6A9098'
const COMP_SKY_MID = '#4A6870'
const COMP_SKY_LOWER = '#354850'
const COMP_SKY_BOTTOM = '#243840'
const COMP_WINDOW_WARM_R = 255
const COMP_WINDOW_WARM_G = 148
const COMP_WINDOW_WARM_B = 48
//
// Celestial positions — keep aligned with time-day-night.js sun/moon placement
//
const CELESTIAL_Y_FACTOR = 0.20
const CELESTIAL_Y_OFFSET = 150
const SUN_X_FACTOR = 0.85
const SUN_X_OFFSET = -50
const MOON_X_FACTOR = 0.72
const SUN_RADIUS = 112
const MOON_RADIUS = 44
const MOON_GLOW_MAX_FACTOR = 1.4
const SUN_GLOW_EXTENT = SUN_RADIUS * 5 * 0.144
const CELESTIAL_CLEARANCE = 240
const CELESTIAL_ZONE_MARGIN = 48
const MIN_BUILDING_HEIGHT = 40

export function createCityBackgroundSprite(k, bottomPlatformHeight, showSun = true, autumnLeaves = false, showCars = true, deepBuildingHeightMultiplier = 0.25, capBySun = showSun, showTrees = true, complementaryPalette = false) {
  const screenWidth = CFG.visual.screen.width
  const screenHeight = CFG.visual.screen.height
  //
  // Collect foreground building window positions for night glow
  //
  const windows = []
  const dataUrl = toCanvas({ width: screenWidth, height: screenHeight, pixelRatio: 1 }, (ctx) => {
    //
    // Draw gradient background
    // Light gray goes to top of screen, dark gray goes to bottom
    //
    const gradient = ctx.createLinearGradient(0, 0, 0, screenHeight)
    if (complementaryPalette) {
      gradient.addColorStop(0, COMP_SKY_TOP)
      gradient.addColorStop(0.3, COMP_SKY_UPPER)
      gradient.addColorStop(0.5, COMP_SKY_MID)
      gradient.addColorStop(0.8, COMP_SKY_LOWER)
      gradient.addColorStop(1, COMP_SKY_BOTTOM)
    } else {
      gradient.addColorStop(0, '#9a9a9a')    // Light sky at top
      gradient.addColorStop(0.3, '#7a7a7a')
      gradient.addColorStop(0.5, '#5a5a5a')
      gradient.addColorStop(0.8, '#3a3a3a')  // Dark city
      gradient.addColorStop(1, '#2a2a2a')    // Darkest at bottom
    }
    
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, screenWidth, screenHeight)
    
    //
    // Calculate sun position (needed for building height calculation)
    //
    const sunX = screenWidth * 0.85 - 50
    const sunY = screenHeight * 0.2 + 150  // Moved down by 150px
    const sunRadius = 112
    const pulse = 1.0  // Static pulse for static image
    
    //
    // Draw sun (larger, brighter, more to the right) - only if showSun is true
    //
    if (showSun) {
      
      // Blurred glow (multiple circles, brighter)
      for (let i = 5; i > 0; i--) {
        const sunGradient = ctx.createRadialGradient(
          sunX, sunY, 0,
          sunX, sunY, sunRadius * i * 0.144 * pulse
        )
        
        const opacity = 0.06 / i  // Increased brightness (was 0.03 / i)
        sunGradient.addColorStop(0, `rgba(255, 255, 255, ${opacity * 2})`)
        sunGradient.addColorStop(1, `rgba(255, 255, 255, 0)`)
        
        ctx.fillStyle = sunGradient
        ctx.beginPath()
        ctx.arc(sunX, sunY, sunRadius * i * 0.144 * pulse, 0, Math.PI * 2)
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
    // Buildings start from bottom platform and go only upward.
    // No ctx.filter — blur is applied programmatically after all drawing
    // via applyBoxBlur, which avoids GPU framebuffer allocation and keeps
    // rendering on the fast GPU path.
    //

    const randomRange = (min, max) => Math.random() * (max - min) + min
    const randomInt = (min, max) => Math.floor(randomRange(min, max))
    
    //
    // Calculate bottom platform Y position (houses start from here)
    //
    const bottomPlatformY = screenHeight - bottomPlatformHeight
    //
    // Cap all building tops below the sun and moon (including glow halos)
    //
    const maxBuildingHeight = computeMaxBuildingHeight(screenHeight, bottomPlatformY, capBySun)
    
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
      const deepRgb = randomBuildingRgb(complementaryPalette, 22, 38)
      
      deepestBuildings.push({
        x: currentX,
        y: deepBuildingY,
        width: deepWidth,
        height: deepHeight,
        rgb: deepRgb
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
      const { r, g, b } = deep.rgb
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`
      ctx.fillRect(deep.x, deep.y, deep.width, deep.height)
      
      ctx.strokeStyle = `rgb(${Math.max(0, r - 5)}, ${Math.max(0, g - 5)}, ${Math.max(0, b - 5)})`
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
            if (complementaryPalette) {
              const warm = 0.75 + Math.random() * 0.25
              const wr = Math.round(COMP_WINDOW_WARM_R * warm)
              const wg = Math.round(COMP_WINDOW_WARM_G * warm)
              const wb = Math.round(COMP_WINDOW_WARM_B * warm)
              ctx.shadowBlur = 8
              ctx.shadowColor = `rgba(${wr}, ${wg}, ${wb}, 0.55)`
              ctx.fillStyle = `rgb(${wr}, ${wg}, ${wb})`
            } else {
              const brightness = 50 + Math.random() * 10  // Darkest windows
              ctx.shadowBlur = 8
              ctx.shadowColor = `rgba(${brightness}, ${brightness}, ${brightness}, 0.6)`
              ctx.fillStyle = `rgb(${brightness}, ${brightness}, ${brightness})`
            }
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
      const bgRgb = randomBuildingRgb(complementaryPalette, 36, 54)
      
      backgroundBuildings.push({
        x: currentX,
        y: bgBuildingY,
        width: bgWidth,
        height: bgHeight,
        rgb: bgRgb
      })
      
      const bgSpacing = randomRange(20, 60)
      currentX += bgWidth + bgSpacing
    }
    
    //
    // Draw background buildings first (they will appear behind foreground buildings)
    //
    backgroundBuildings.forEach(bg => {
      const { r, g, b } = bg.rgb
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`
      ctx.fillRect(bg.x, bg.y, bg.width, bg.height)
      
      ctx.strokeStyle = `rgb(${Math.max(0, r - 8)}, ${Math.max(0, g - 8)}, ${Math.max(0, b - 8)})`
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
            if (complementaryPalette) {
              const warm = 0.8 + Math.random() * 0.2
              const wr = Math.round(COMP_WINDOW_WARM_R * warm)
              const wg = Math.round(COMP_WINDOW_WARM_G * warm)
              const wb = Math.round(COMP_WINDOW_WARM_B * warm)
              ctx.shadowBlur = 6
              ctx.shadowColor = `rgba(${wr}, ${wg}, ${wb}, 0.5)`
              ctx.fillStyle = `rgb(${wr}, ${wg}, ${wb})`
            } else {
              const brightness = 80 + Math.random() * 15  // Darker windows
              ctx.shadowBlur = 6
              ctx.shadowColor = `rgba(${brightness}, ${brightness}, ${brightness}, 0.5)`
              ctx.fillStyle = `rgb(${brightness}, ${brightness}, ${brightness})`
            }
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
      height = Math.min(height, maxBuildingHeight)
      height = capHeightForCelestialZones(currentX, width, height, bottomPlatformY, screenWidth, screenHeight, capBySun)
      const finalBuildingY = bottomPlatformY - height
      const windowRows = Math.floor(height / 25)
      const windowCols = Math.floor(width / 20)
      const fgRgb = randomBuildingRgb(complementaryPalette, 50, 72)
      const { r, g, b } = fgRgb
      
      // Building
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`
      ctx.fillRect(currentX, finalBuildingY, width, height)
      
      ctx.strokeStyle = `rgb(${Math.max(0, r - 10)}, ${Math.max(0, g - 10)}, ${Math.max(0, b - 10)})`
      ctx.lineWidth = 2
      ctx.strokeRect(currentX, finalBuildingY, width, height)
      
      // Windows
      for (let row = 0; row < windowRows; row++) {
        for (let col = 0; col < windowCols; col++) {
          if (Math.random() > 0.3) {
            const windowX = currentX + (col + 0.5) * (width / windowCols)
            const windowY = finalBuildingY + (row + 0.5) * (height / windowRows)
            const windowSize = 6
            if (complementaryPalette) {
              const warm = 0.85 + Math.random() * 0.15
              const wr = Math.round(COMP_WINDOW_WARM_R * warm)
              const wg = Math.round(COMP_WINDOW_WARM_G * warm)
              const wb = Math.round(COMP_WINDOW_WARM_B * warm)
              ctx.fillStyle = `rgb(${wr}, ${wg}, ${wb})`
            } else {
              const brightness = 158
              ctx.fillStyle = `rgb(${brightness}, ${brightness}, ${brightness})`
            }
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
    showTrees && drawBlurredOrganicTrees(ctx, {
      screenWidth,
      bottomPlatformY,
      autumnLeaves,
      lushGreenTrees: !autumnLeaves,
      complementaryPalette
    })
  })
  return { dataUrl, windows }
}

function drawBlurredOrganicTrees(ctx, cfg) {
  const { screenWidth, bottomPlatformY, autumnLeaves, lushGreenTrees = false, complementaryPalette = false } = cfg
  let currentX = 0
  while (currentX < screenWidth * 1.2) {
    const lushTrees = lushGreenTrees || autumnLeaves
    const crownWidth = lushTrees
      ? randomRange(LUSH_LEVEL0_CROWN_WIDTH_MIN, LUSH_LEVEL0_CROWN_WIDTH_MAX)
      : randomRange(44, 92)
    const treeX = currentX + randomRange(0, crownWidth * 0.28)
    const trunkHeight = lushTrees
      ? randomRange(LUSH_LEVEL0_TRUNK_HEIGHT_MIN, LUSH_LEVEL0_TRUNK_HEIGHT_MAX)
      : randomRange(56, 125)
    drawOrganicTrunk(ctx, treeX + crownWidth * 0.5, bottomPlatformY, trunkHeight, complementaryPalette)
    lushTrees && drawOrganicBranches(ctx, treeX + crownWidth * 0.5, bottomPlatformY, trunkHeight, complementaryPalette)
    const crownY = bottomPlatformY - trunkHeight - randomRange(14, 24)
    const leafCountBoost = lushTrees
      ? (autumnLeaves ? LUSH_LEVEL0_LEAF_COUNT_BOOST * 1.08 : LUSH_LEVEL0_LEAF_COUNT_BOOST)
      : 1
    const leafSizeBoost = lushTrees
      ? (autumnLeaves ? LUSH_LEVEL0_LEAF_SIZE_BOOST * 1.06 : LUSH_LEVEL0_LEAF_SIZE_BOOST)
      : 1
    drawOrganicLeafCluster(
      ctx,
      treeX + crownWidth * 0.5,
      crownY,
      crownWidth,
      autumnLeaves,
      leafCountBoost,
      leafSizeBoost,
      complementaryPalette
    )
    if (lushTrees) {
      for (let i = 0; i < LUSH_LEVEL0_EXTRA_CLUSTERS; i++) {
        const sideSign = i % 2 === 0 ? -1 : 1
        drawOrganicLeafCluster(
          ctx,
          treeX + crownWidth * (0.5 + sideSign * randomRange(0.08, 0.14)),
          crownY - randomRange(8, 18),
          crownWidth * randomRange(0.72, 0.86),
          autumnLeaves,
          leafCountBoost * 0.82,
          leafSizeBoost,
          complementaryPalette
        )
      }
    }
    const treeSpacing = lushTrees
      ? randomRange(LUSH_LEVEL0_TREE_SPACING_MIN, LUSH_LEVEL0_TREE_SPACING_MAX)
      : randomRange(52, 118)
    currentX += crownWidth + treeSpacing
  }
}

function drawOrganicTrunk(ctx, centerX, bottomY, trunkHeight, complementaryPalette = false) {
  const segmentCount = 7 + Math.floor(Math.random() * 4)
  const stepY = trunkHeight / segmentCount
  const trunkR = complementaryPalette ? randomInt(88, 108) : randomInt(28, 45)
  const trunkG = complementaryPalette ? randomInt(52, 68) : trunkR - randomInt(2, 5)
  const trunkB = complementaryPalette ? randomInt(28, 40) : trunkR - randomInt(8, 12)
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
//
// Extra branch strokes for lush trees (levels 0, 1 and autumn level 2)
//
function drawOrganicBranches(ctx, centerX, bottomY, trunkHeight, complementaryPalette = false) {
  const branchCount = randomInt(LUSH_LEVEL0_BRANCH_COUNT_MIN, LUSH_LEVEL0_BRANCH_COUNT_MAX)
  const branchR = complementaryPalette ? randomInt(96, 118) : randomInt(34, 52)
  const branchG = complementaryPalette ? randomInt(58, 72) : branchR - 4
  const branchB = complementaryPalette ? randomInt(32, 44) : branchR - 10
  ctx.strokeStyle = `rgba(${branchR}, ${branchG}, ${branchB}, 0.86)`
  ctx.lineCap = 'round'
  for (let i = 0; i < branchCount; i++) {
    const t = randomRange(0.22, 0.84)
    const branchY = bottomY - trunkHeight * t
    const dir = Math.random() > 0.5 ? 1 : -1
    const branchLen = randomRange(LUSH_LEVEL0_BRANCH_LENGTH_MIN, LUSH_LEVEL0_BRANCH_LENGTH_MAX) * (1 - t * 0.35)
    const rise = branchLen * randomRange(0.22, 0.45)
    const branchStartX = centerX + dir * randomRange(0.6, 2.2)
    const branchEndX = branchStartX + dir * branchLen
    const branchEndY = branchY - rise
    ctx.lineWidth = randomRange(1.2, 2.6)
    ctx.beginPath()
    ctx.moveTo(branchStartX, branchY)
    ctx.lineTo(branchEndX, branchEndY)
    ctx.stroke()
    //
    // Add a small secondary twig to make branch structure richer
    //
    if (Math.random() < 0.65) {
      const twigDir = Math.random() > 0.5 ? 1 : -1
      const twigLen = branchLen * randomRange(0.24, 0.42)
      const twigRise = twigLen * randomRange(0.32, 0.56)
      ctx.lineWidth = Math.max(0.8, ctx.lineWidth * 0.58)
      ctx.beginPath()
      ctx.moveTo(
        branchStartX + (branchEndX - branchStartX) * randomRange(0.35, 0.72),
        branchY + (branchEndY - branchY) * randomRange(0.35, 0.72)
      )
      ctx.lineTo(
        branchEndX + twigDir * twigLen,
        branchEndY - twigRise
      )
      ctx.stroke()
    }
  }
}

function drawOrganicLeafCluster(ctx, centerX, crownCenterY, crownWidth, autumnLeaves, leafCountBoost = 1, leafSizeBoost = 1, complementaryPalette = false) {
  const leafCount = Math.floor((28 + Math.floor(Math.random() * 24)) * leafCountBoost)
  const spreadX = crownWidth * randomRange(0.4, 0.58)
  const spreadY = crownWidth * randomRange(0.3, 0.42)
  //
  // Draw all leaves as plain filled circles batched into a single beginPath/fill
  // call per cluster. The programmatic box blur applied later makes the exact leaf
  // shape (complex bezier vs circle) completely imperceptible, while the batching
  // reduces Canvas API calls from ~14 per leaf (save, translate, rotate, 2×
  // quadraticCurveTo, fill, stroke, restore …) to ~2 (arc + implicit close).
  // One fillStyle set per cluster instead of per leaf also avoids per-leaf GPU
  // state flushes, keeping the drawing phase fast on the GPU path.
  //
  const leafColor = pickLeafColor(autumnLeaves, complementaryPalette)
  ctx.fillStyle = `rgba(${leafColor.r}, ${leafColor.g}, ${leafColor.b}, ${leafColor.a})`
  ctx.beginPath()
  for (let i = 0; i < leafCount; i++) {
    const angle = randomRange(0, Math.PI * 2)
    const dist = Math.random()
    const lx = centerX + Math.cos(angle) * spreadX * dist
    const ly = crownCenterY + Math.sin(angle) * spreadY * dist * 0.8
    const size = randomRange(4.4, 8.8) * leafSizeBoost
    ctx.arc(lx, ly, size, 0, Math.PI * 2)
  }
  ctx.fill()
}

function pickLeafColor(autumnLeaves, complementaryPalette = false) {
  //
  // Autumn takes priority over complementary palette: level 2 (snow) shows
  // red and yellow foliage even though buildings use the complementary teal scheme.
  //
  if (autumnLeaves) {
    const palette = [
      [210, 50, 30],
      [200, 70, 25],
      [235, 150, 20],
      [230, 185, 30],
      [220, 110, 35],
      [185, 45, 25]
    ]
    const base = palette[Math.floor(Math.random() * palette.length)]
    return {
      r: base[0] + randomInt(-12, 12),
      g: base[1] + randomInt(-12, 12),
      b: base[2] + randomInt(-10, 10),
      a: randomRange(0.68, 0.92)
    }
  }
  if (complementaryPalette) {
    const tealPalette = [
      [32, 60, 68],
      [48, 88, 96],
      [70, 105, 112],
      [90, 136, 148]
    ]
    const base = tealPalette[Math.floor(Math.random() * tealPalette.length)]
    return {
      r: base[0] + randomInt(-10, 10),
      g: base[1] + randomInt(-10, 10),
      b: base[2] + randomInt(-10, 10),
      a: randomRange(0.66, 0.9)
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


function randomRange(min, max) {
  return Math.random() * (max - min) + min
}

function randomInt(min, max) {
  return Math.floor(randomRange(min, max))
}
//
// Building fill: neutral gray (default) or cool teal tint (level 0 complementary).
//
function randomBuildingRgb(complementaryPalette, minGray, maxGray) {
  const base = randomInt(minGray, maxGray)
  return complementaryPalette
    ? { r: Math.max(0, base - 10), g: base + 8, b: base + 16 }
    : { r: base, g: base, b: base }
}
//
// Shared sky ceiling — buildings must stay below sun/moon discs and glow
//
function computeMaxBuildingHeight(screenHeight, bottomPlatformY, capBySun) {
  if (!capBySun) return bottomPlatformY
  const celestialY = screenHeight * CELESTIAL_Y_FACTOR + CELESTIAL_Y_OFFSET
  const sunTop = celestialY - SUN_RADIUS - SUN_GLOW_EXTENT
  const moonTop = celestialY - MOON_RADIUS * MOON_GLOW_MAX_FACTOR - CELESTIAL_ZONE_MARGIN
  const skyCeilingY = Math.min(sunTop, moonTop)
  return Math.max(MIN_BUILDING_HEIGHT, bottomPlatformY - skyCeilingY - CELESTIAL_CLEARANCE)
}
//
// Extra per-building cap when a tower overlaps the sun or moon horizontally
//
function capHeightForCelestialZones(buildingX, buildingWidth, height, bottomPlatformY, screenWidth, screenHeight, capBySun) {
  if (!capBySun) return height
  const celestialY = screenHeight * CELESTIAL_Y_FACTOR + CELESTIAL_Y_OFFSET
  const zones = [
    { cx: screenWidth * SUN_X_FACTOR + SUN_X_OFFSET, reach: SUN_RADIUS + SUN_GLOW_EXTENT + CELESTIAL_ZONE_MARGIN },
    { cx: screenWidth * MOON_X_FACTOR, reach: MOON_RADIUS * MOON_GLOW_MAX_FACTOR + CELESTIAL_ZONE_MARGIN + 24 }
  ]
  let capped = height
  const bLeft = buildingX
  const bRight = buildingX + buildingWidth
  zones.forEach(({ cx, reach }) => {
    const zLeft = cx - reach
    const zRight = cx + reach
    if (bLeft < zRight && bRight > zLeft) {
      const maxTopY = celestialY - reach - CELESTIAL_ZONE_MARGIN
      capped = Math.min(capped, bottomPlatformY - maxTopY)
    }
  })
  return Math.max(MIN_BUILDING_HEIGHT, capped)
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
 * @param {boolean} [capBySun=showSun] - Whether to cap building height by sun position
 * @param {boolean} [showTrees=true] - Whether to render trees
 * @param {Function} [onProgress] - Optional async callback(pct) called between heavy phases
 * @param {boolean} [complementaryPalette=false] - Teal sky + warm window accents (level 0)
 */
export async function preloadCityBackground(k, bottomPlatformHeight, spriteName = 'city-background', showSun = true, autumnLeaves = false, showCars = true, deepBuildingHeightMultiplier = 0.25, capBySun = showSun, showTrees = true, onProgress = null, complementaryPalette = false) {
  const { dataUrl: canvas, windows } = createCityBackgroundSprite(k, bottomPlatformHeight, showSun, autumnLeaves, showCars, deepBuildingHeightMultiplier, capBySun, showTrees, complementaryPalette)
  //
  // Yield after synchronous GPU drawing so the loader bar can repaint.
  // getImageData + box blur run next — they take ~130 ms in total but are
  // bounded operations that do not trigger "page not responding".
  //
  onProgress && await onProgress(55)
  //
  // Apply programmatic box blur to the fully-drawn canvas. This replaces
  // ctx.filter which would allocate an ~8 MB GPU framebuffer on the 1920×1080
  // surface and risk WebGL context loss. The sliding-window algorithm runs in
  // O(width × height) regardless of radius and does two passes to approximate
  // a Gaussian. The one-time getImageData read-back costs ~20–40 ms.
  //
  const ctx = canvas.getContext('2d')
  applyBoxBlur(ctx, canvas.width, canvas.height)
  onProgress && await onProgress(85)
  k.loadSprite(spriteName, canvas)
  //
  // Release the HTMLCanvasElement's 2D backing store immediately after Kaplay
  // uploads the pixels to a WebGL texture. Without this, the large canvas stays
  // alive (and holds GPU memory) until GC runs, which can push total GPU allocation
  // past the browser budget and trigger WebGL context loss.
  //
  canvas.width = 0
  canvas.height = 0
  windowsPerSprite[spriteName] = windows
}
