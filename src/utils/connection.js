import * as Sound from './sound.js'

/**
 * Draw electric connection wave between two points
 * @param {Object} k - Kaplay instance
 * @param {Object} pos1 - First position {x, y}
 * @param {Object} pos2 - Second position {x, y}
 * @param {Object} [options] - Optional parameters
 * @param {number} [options.segmentWidth=8] - Width of each wave segment
 * @param {number} [options.mainWidth=4] - Width of main wave line
 * @param {number} [options.opacity=0.7] - Opacity of main wave
 * @param {Array} [options.colors] - Array of possible colors
 */
export function drawConnectionWave(k, pos1, pos2, options = {}) {
  const {
    segmentWidth = 8,
    mainWidth = 4,
    opacity = 0.7,
    colors = [k.rgb(255, 165, 0), k.rgb(255, 200, 100), k.rgb(255, 100, 50)]
  } = options
  
  const connectionSegments = []
  const startX = pos1.x
  const startY = pos1.y
  const endX = pos2.x
  const endY = pos2.y
  const lineWidth = Math.abs(endX - startX)
  const numConnectionSegments = Math.ceil(lineWidth / segmentWidth)
  
  for (let i = 0; i <= numConnectionSegments; i++) {
    const t = i / numConnectionSegments
    const x = startX + (endX - startX) * t
    const baseY = startY + (endY - startY) * t
    
    const mainWave = Math.sin(k.time() * 4 + i * 0.5) * 12
    const harmonic1 = Math.sin(k.time() * 8 + i * 1.0) * 6
    const harmonic2 = Math.sin(k.time() * 12 + i * 1.5) * 3
    const amplitude = 0.8 + Math.sin(k.time() * 2) * 0.3
    const noise = (k.rand(0, 1) - 0.5) * 2
    const waveY = (mainWave + harmonic1 + harmonic2 + noise) * amplitude
    
    connectionSegments.push({ x, y: baseY + waveY })
  }
  
  // Draw multiple waves
  for (let i = 0; i < connectionSegments.length - 1; i++) {
    const current = connectionSegments[i]
    const next = connectionSegments[i + 1]
    const lineColor = k.rand(0, 1) > 0.95 
      ? k.choose(colors) 
      : k.rgb(255, 140, 0)
    
    // Main wave
    k.drawLine({
      p1: k.vec2(current.x, current.y),
      p2: k.vec2(next.x, next.y),
      width: mainWidth,
      color: lineColor,
      opacity
    })
    
    // First harmonic
    const offset1 = Math.sin(k.time() * 5 + i * 0.3) * 5
    k.drawLine({
      p1: k.vec2(current.x, current.y + offset1),
      p2: k.vec2(next.x, next.y + offset1),
      width: 2,
      color: lineColor,
      opacity: opacity * 0.57
    })
    
    // Second harmonic
    const offset2 = Math.sin(k.time() * 7 + i * 0.6) * 8
    k.drawLine({
      p1: k.vec2(current.x, current.y + offset2),
      p2: k.vec2(next.x, next.y + offset2),
      width: 1,
      color: lineColor,
      opacity: opacity * 0.43
    })
  }
}

/**
 * Calculate lightning frequency based on distance
 * @param {number} distance - Distance between characters
 * @param {number} minDistance - Minimum distance (constant lightning)
 * @param {number} maxDistance - Maximum distance (rare lightning)
 * @param {number} minInterval - Minimum interval at close range (seconds)
 * @param {number} maxInterval - Maximum interval at far range (seconds)
 * @returns {number} Time interval in seconds
 */
export function calculateLightningInterval(distance, minDistance = 50, maxDistance = 1000, minInterval = 0.1, maxInterval = 5.0) {
  // Clamp distance to valid range
  const clampedDistance = Math.max(minDistance, Math.min(maxDistance, distance))
  
  // Linear interpolation from minInterval to maxInterval
  const t = (clampedDistance - minDistance) / (maxDistance - minDistance)
  return minInterval + t * (maxInterval - minInterval)
}

/**
 * Create lightning state for scene instance
 * @returns {Object} Lightning state object
 */
export function createLightningState() {
  return {
    lightningTimer: 0,
    lightningInterval: 5,
    showLightning: false
  }
}

/**
 * Update lightning based on distance between heroes
 * @param {Object} inst - Scene instance with k, hero, antiHero, lightningTimer, lightningInterval, showLightning
 */
export function updateLightning(inst) {
  const { k, hero, antiHero } = inst
  
  // Stop lightning effects if annihilation or death has started
  if (hero.isAnnihilating || antiHero.isAnnihilating || hero.isDying || antiHero.isDying) {
    inst.showLightning = false
    return
  }
  
  // Calculate distance between heroes
  const distance = Math.sqrt(
    Math.pow(hero.character.pos.x - antiHero.character.pos.x, 2) +
    Math.pow(hero.character.pos.y - antiHero.character.pos.y, 2)
  )
  
  // Calculate lightning interval based on distance
  // Closer = more frequent lightning
  const maxDistance = k.width() // Maximum distance (opposite sides of screen)
  inst.lightningInterval = calculateLightningInterval(distance, 50, maxDistance, 0.1, 5.0)
  
  // Update timer
  inst.lightningTimer -= k.dt()
  
  if (inst.lightningTimer <= 0) {
    inst.showLightning = true
    inst.lightningTimer = inst.lightningInterval
  }
}

/**
 * Draw lightning effect between heroes with sound
 * @param {Object} inst - Scene instance with k, hero, antiHero, showLightning, sound (optional)
 */
export function drawLightning(inst) {
  if (!inst.showLightning) return
  
  const { k, hero, antiHero, sound } = inst
  
  drawConnectionWave(k, hero.character.pos, antiHero.character.pos)
  
  // Play lightning sound if available
  sound && Sound.playLightningSound(sound)
  
  // Lightning shows for one frame only
  inst.showLightning = false
}

