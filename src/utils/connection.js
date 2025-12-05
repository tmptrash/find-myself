import * as Sound from './sound.js'

const FRAMES_FOR_LIGHTNING = 3;
const MAX_LIGHTING_DELAY = 8.0
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
 * @param {number} [options.heartbeatPhase=0] - Heartbeat phase (0-1) for pulsation
 */
export function drawConnectionWave(k, pos1, pos2, options = {}) {
  const {
    segmentWidth = 8,
    mainWidth = 4,
    opacity = 0.7,
    colors = [k.rgb(255, 165, 0), k.rgb(255, 200, 100), k.rgb(255, 100, 50)],
    heartbeatPhase = 0
  } = options
  //
  // Heartbeat pulsation: stronger when heartbeat is at peak
  //
  const heartbeatIntensity = Math.sin(heartbeatPhase * Math.PI * 2) * 0.5 + 0.5
  const pulseFactor = 0.7 + heartbeatIntensity * 0.6
  
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
    const waveY = (mainWave + harmonic1 + harmonic2 + noise) * amplitude * pulseFactor
    
    connectionSegments.push({ x, y: baseY + waveY })
  }
  //
  // Draw sparks along the connection
  //
  const sparkCount = Math.floor(numConnectionSegments * 0.15)
  const sparks = []
  for (let i = 0; i < sparkCount; i++) {
    if (k.rand(0, 1) > 0.7) {
      const sparkIndex = Math.floor(k.rand(0, connectionSegments.length))
      const segment = connectionSegments[sparkIndex]
      const sparkSize = k.rand(2, 5) * pulseFactor
      const sparkLife = k.rand(0.3, 0.8)
      sparks.push({ x: segment.x, y: segment.y, size: sparkSize, life: sparkLife })
    }
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
      width: mainWidth * pulseFactor,
      color: lineColor,
      opacity: opacity * pulseFactor
    })
    
    // First harmonic
    const offset1 = Math.sin(k.time() * 5 + i * 0.3) * 5 * pulseFactor
    k.drawLine({
      p1: k.vec2(current.x, current.y + offset1),
      p2: k.vec2(next.x, next.y + offset1),
      width: 2 * pulseFactor,
      color: lineColor,
      opacity: opacity * 0.57 * pulseFactor
    })
    
    // Second harmonic
    const offset2 = Math.sin(k.time() * 7 + i * 0.6) * 8 * pulseFactor
    k.drawLine({
      p1: k.vec2(current.x, current.y + offset2),
      p2: k.vec2(next.x, next.y + offset2),
      width: 1 * pulseFactor,
      color: lineColor,
      opacity: opacity * 0.43 * pulseFactor
    })
  }
  //
  // Draw sparks
  //
  sparks.forEach(spark => {
    const sparkColor = k.choose([k.rgb(255, 255, 200), k.rgb(255, 220, 150), k.rgb(255, 180, 100)])
    k.drawCircle({
      pos: k.vec2(spark.x, spark.y),
      radius: spark.size,
      color: sparkColor,
      opacity: spark.life * pulseFactor
    })
  })
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
export function calculateLightningInterval(distance, minDistance = 50, maxDistance = 1000, minInterval = 0.1, maxInterval = MAX_LIGHTING_DELAY) {
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
    lightningFramesLeft: 0
  }
}

/**
 * Update lightning based on distance between heroes
 * @param {Object} inst - Scene instance with k, hero, antiHero, lightningTimer, lightningInterval, lightningFramesLeft
 */
export function updateLightning(inst) {
  const { k, hero, antiHero } = inst
  
  // Stop lightning effects if annihilation or death has started
  if (hero.isAnnihilating || antiHero.isAnnihilating || hero.isDying || antiHero.isDying) {
    inst.lightningFramesLeft = 0
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
  inst.lightningInterval = calculateLightningInterval(distance, 50, maxDistance, 0.1, MAX_LIGHTING_DELAY)
  
  // Update timer
  inst.lightningTimer -= k.dt()
  
  if (inst.lightningTimer <= 0) {
    inst.lightningFramesLeft = FRAMES_FOR_LIGHTNING  // Show lightning for 2 frames
    inst.lightningTimer = inst.lightningInterval
  }
}

/**
 * Draw lightning effect between heroes with sound
 * @param {Object} inst - Scene instance with k, hero, antiHero, lightningFramesLeft, sound (optional)
 */
export function drawLightning(inst) {
  if (inst.lightningFramesLeft <= 0) return
  
  const { k, hero, antiHero, sound } = inst
  
  drawConnectionWave(k, hero.character.pos, antiHero.character.pos)
  
  // Play sound only on first frame
  if (inst.lightningFramesLeft === FRAMES_FOR_LIGHTNING) {
    sound && Sound.playLightningSound(sound)
  }
  
  // Decrease frame counter
  inst.lightningFramesLeft--
}

