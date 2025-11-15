/**
 * Trembling particles background effect
 * Creates atmosphere of "chaos in the head" with flickering pixels
 */

/**
 * Creates trembling particles background
 * @param {Object} k - Kaplay instance
 * @param {Object} config - Configuration
 * @param {number} [config.particleCount=150] - Number of particles
 * @param {string} [config.color='#8B5A3C'] - Particle color (gray-orange)
 * @param {number} [config.baseOpacity=0.3] - Base opacity
 * @param {number} [config.flickerSpeed=2] - Flicker speed
 * @param {number} [config.trembleRadius=2] - Tremble radius in pixels
 * @param {number} [config.mouseInfluence=150] - Mouse influence radius
 * @param {Object} [config.bounds] - Bounds for particles {x, y, width, height}
 * @param {number} [config.gaussianFactor=0.15] - Concentration factor (0.15=center, 0.5=spread, 1.0=uniform)
 * @returns {Object} Particle system instance
 */
export function create(config = {}) {
  const {
    k,
    particleCount = 150,
    color = '#8B5A3C',
    baseOpacity = 0.3,
    flickerSpeed = 2,
    trembleRadius = 2,
    mouseInfluence = 150,
    bounds = null,  // If null, use full screen
    gaussianFactor = 0.15,  // Concentration factor
    boundsMargin = 50
  } = config
  
  //
  // Determine bounds
  //
  const effectiveBounds = bounds || {
    x: 0,
    y: 0,
    width: k.width(),
    height: k.height()
  }
  
  //
  // Create particles with random positions within bounds
  // Use gaussian distribution to concentrate particles in center
  //
  const particles = []
  for (let i = 0; i < particleCount; i++) {
    //
    // Generate position with gaussian distribution (bell curve)
    // This makes particles more concentrated in center, fewer at edges
    //
    const randomGaussian = () => {
      // Box-Muller transform for gaussian distribution
      const u1 = Math.random()
      const u2 = Math.random()
      return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
    }
    
    //
    // Generate position with bias toward center
    // gaussianFactor controls concentration: 0.15=tight center, 0.5=spread, 1.0=uniform
    //
    const baseX = effectiveBounds.x + effectiveBounds.width / 2 + 
                  randomGaussian() * effectiveBounds.width * gaussianFactor
    const baseY = effectiveBounds.y + effectiveBounds.height / 2 + 
                  randomGaussian() * effectiveBounds.height * gaussianFactor
    
    //
    // Clamp to bounds (keep particles inside, but distribution creates soft edges)
    //
    const clampedX = Math.max(effectiveBounds.x, Math.min(effectiveBounds.x + effectiveBounds.width, baseX))
    const clampedY = Math.max(effectiveBounds.y, Math.min(effectiveBounds.y + effectiveBounds.height, baseY))
    
    particles.push({
      baseX: clampedX,
      baseY: clampedY,
      x: clampedX,
      y: clampedY,
      flickerPhase: Math.random() * Math.PI * 2,
      tremblePhase: Math.random() * Math.PI * 2,
      trembleSpeed: 0.8 + Math.random() * 0.4,  // Random speed multiplier (0.8-1.2)
      fleeSpeed: 0.7 + Math.random() * 0.6,     // Random flee speed multiplier (0.7-1.3)
      opacity: baseOpacity,
      isFleeing: false,      // Is currently fleeing from mouse
      isAutoFleeing: false,  // Is fleeing automatically (not from mouse)
      fleeStartX: clampedX,     // Start position when fleeing begins
      fleeStartY: clampedY,
      fleeTargetX: clampedX,    // Target position when fleeing
      fleeTargetY: clampedY,
      fleeProgress: 0,       // Progress of flee animation (0-1)
      justLanded: false,     // Just finished fleeing (pause floating)
      landedTimer: 0,        // Timer for landing pause
      floatFadeIn: 0         // Fade-in progress for floating after landing (0-1)
    })
  }
  
  const inst = {
    k,
    particles,
    color,
    baseOpacity,
    flickerSpeed,
    trembleRadius,
    mouseInfluence,
    bounds: effectiveBounds,
    boundsMargin,
    disableMouseInteraction: config.disableMouseInteraction,
    time: 0
  }
  
  return inst
}

/**
 * Update particles (call in k.onUpdate)
 * @param {Object} inst - Particle system instance
 */
export function onUpdate(inst) {
  const { k, particles, flickerSpeed, trembleRadius, mouseInfluence, bounds } = inst
  
  inst.time += k.dt()
  
  //
  // If mouse interaction is disabled, skip all flee logic
  //
  const enableMouseInteraction = !inst.disableMouseInteraction
  
  let threatX = 0
  let threatY = 0
  let threatActive = false
  let threatInfluence = 0
  let fleeDistanceDefault = 80
  
  if (enableMouseInteraction) {
    const mousePos = k.mousePos()
    
    threatX = mousePos.x
    threatY = mousePos.y
    threatActive = inst.isCursorVisible ? inst.isCursorVisible() : true
    threatInfluence = inst.threatInfluence ?? mouseInfluence
    fleeDistanceDefault = inst.fleeDistance ?? 80
    
    if (inst.getThreatPosition) {
      const threat = inst.getThreatPosition()
      if (threat && threat.active !== false) {
        threatX = threat.x
        threatY = threat.y
        threatActive = true
        if (typeof threat.influence === 'number') {
          threatInfluence = threat.influence
        }
        if (typeof threat.fleeDistance === 'number') {
          fleeDistanceDefault = threat.fleeDistance
        }
      } else {
        threatActive = false
      }
    }
  }
  
  const trembleRadiusAfterFlee = inst.trembleRadiusAfterFlee || trembleRadius
  
  particles.forEach(particle => {
    //
    // Update flicker animation
    //
    particle.flickerPhase += flickerSpeed * k.dt()
    const phase = particle.flickerPhase % (Math.PI * 2)
    let flickerValue
    if (phase < Math.PI * 0.3) {
      flickerValue = Math.sin(phase / 0.3)
    } else {
      flickerValue = Math.pow(Math.sin((phase - Math.PI * 0.3) / 1.7 + Math.PI / 2), 2)
    }
    //
    // Ensure flickerValue stays in range 0.5 to 1.0 for better visibility
    //
    flickerValue = 0.5 + flickerValue * 0.5
    particle.opacity = inst.baseOpacity * flickerValue
    particle.tremblePhase += (1 + Math.random() * 0.5) * k.dt() * particle.trembleSpeed
    
    //
    // Calculate distance to threat using current particle position (not base position)
    // This ensures particles flee correctly regardless of their base position
    //
    const dx = threatX - particle.x
    const dy = threatY - particle.y
    const distToThreat = Math.sqrt(dx * dx + dy * dy)
    
    const fleeDistance = fleeDistanceDefault
    
    if (threatActive && !particle.isFleeing && distToThreat < fleeDistance && distToThreat > 0) {
      particle.isFleeing = true
      particle.fleeProgress = 0
      particle.fleeStartX = particle.x
      particle.fleeStartY = particle.y
      particle.hasEverFled = true
      
      const baseAngle = Math.atan2(particle.y - threatY, particle.x - threatX)
      const randomDeviation = (Math.random() - 0.5) * (Math.PI * 0.8)
      const finalAngle = baseAngle + randomDeviation
      const dirX = Math.cos(finalAngle)
      const dirY = Math.sin(finalAngle)
      const fleeDistanceAmount = 100 + Math.random() * 150
      let targetX = particle.x + dirX * fleeDistanceAmount
      let targetY = particle.y + dirY * fleeDistanceAmount
      
      if (bounds) {
        const marginBase = typeof inst.boundsMargin === 'number'
          ? inst.boundsMargin
          : Math.max(inst.boundsMargin.horizontal ?? 0, inst.boundsMargin.vertical ?? 0)
        const marginX = typeof inst.boundsMargin === 'number'
          ? inst.boundsMargin
          : inst.boundsMargin.horizontal ?? marginBase
        const marginY = typeof inst.boundsMargin === 'number'
          ? inst.boundsMargin
          : inst.boundsMargin.vertical ?? marginBase
        const centerX = bounds.x + bounds.width / 2
        const centerY = bounds.y + bounds.height / 2
        const distFromCenterX = Math.abs(targetX - centerX) / (bounds.width / 2)
        const distFromCenterY = Math.abs(targetY - centerY) / (bounds.height / 2)
        const edgeThreshold = 0.5
        if (distFromCenterX > edgeThreshold) {
          const pullStrength = (distFromCenterX - edgeThreshold) / (1 - edgeThreshold)
          targetX = targetX - (targetX - centerX) * pullStrength * 0.7
        }
        if (distFromCenterY > edgeThreshold) {
          const pullStrength = (distFromCenterY - edgeThreshold) / (1 - edgeThreshold)
          targetY = targetY - (targetY - centerY) * pullStrength * 0.7
        }
        particle.fleeTargetX = Math.max(bounds.x + marginX, Math.min(bounds.x + bounds.width - marginX, targetX))
        particle.fleeTargetY = Math.max(bounds.y + marginY, Math.min(bounds.y + bounds.height - marginY, targetY))
      } else {
        particle.fleeTargetX = targetX
        particle.fleeTargetY = targetY
      }
    }
    
    if (particle.isFleeing) {
      const baseSpeed = particle.isAutoFleeing ? 0.55 : 0.46
      particle.fleeProgress += k.dt() * baseSpeed * particle.fleeSpeed
      
      if (particle.fleeProgress >= 1) {
        particle.isFleeing = false
        particle.isAutoFleeing = false
        particle.baseX = particle.fleeTargetX
        particle.baseY = particle.fleeTargetY
        particle.x = particle.fleeTargetX
        particle.y = particle.fleeTargetY
        particle.fleeProgress = 0
        particle.floatFadeIn = 0
        particle.fleeCurveX = 0
        particle.fleeCurveY = 0
      } else {
        const t = particle.fleeProgress
        const easedStart = t * t
        const easedEnd = easedStart * (3 - 2 * easedStart)
        const startX = particle.fleeStartX
        const startY = particle.fleeStartY
        const endX = particle.fleeTargetX
        const endY = particle.fleeTargetY
        const sinFactor = Math.sin(easedStart * Math.PI) * (particle.fleeCurveIntensity || 1)
        
        const curveX = particle.fleeCurveX * sinFactor
        const curveY = particle.fleeCurveY * sinFactor
        
        particle.x = startX + (endX - startX) * easedEnd + curveX
        particle.y = startY + (endY - startY) * easedEnd + curveY
      }
    } else {
      const trembleAmount = particle.hasEverFled ? trembleRadiusAfterFlee : trembleRadius
      const offsetX = Math.cos(particle.tremblePhase) * trembleAmount +
                      Math.sin(particle.tremblePhase * 0.7) * trembleAmount * 0.5
      const offsetY = Math.sin(particle.tremblePhase * 1.3) * trembleAmount +
                      Math.cos(particle.tremblePhase * 0.5) * trembleAmount * 0.5
      if (particle.floatFadeIn < 1) {
        particle.floatFadeIn = Math.min(1, particle.floatFadeIn + k.dt() * 0.5)
      }
      const fadeMultiplier = particle.floatFadeIn
      particle.x = particle.baseX + offsetX * fadeMultiplier
      particle.y = particle.baseY + offsetY * fadeMultiplier
      
      //
      // Keep particles visible on screen (add margin to prevent edge clipping)
      //
      const margin = 20
      particle.x = Math.max(margin, Math.min(k.width() - margin, particle.x))
      particle.y = Math.max(margin, Math.min(k.height() - margin, particle.y))
    }
  })
}

/**
 * Draw particles (optimized with Kaplay API - simplified rendering)
 * @param {Object} inst - Particle system instance
 */
export function draw(inst) {
  const { k, particles, color } = inst
  
  const r = parseInt(color.slice(1, 3), 16)
  const g = parseInt(color.slice(3, 5), 16)
  const b = parseInt(color.slice(5, 7), 16)
  const glowColor = k.rgb(r, g, b)
  const coreColor = k.rgb(255, 255, 200)
  const tmpVec = k.vec2(0, 0)
  
  for (let i = 0; i < particles.length; i++) {
    const particle = particles[i]
    const opacity = particle.opacity
    
    //
    // Skip only completely transparent particles (lower threshold for better visibility)
    //
    if (opacity < 0.001) continue
    
    tmpVec.x = particle.x
    tmpVec.y = particle.y
    
    k.drawCircle({
      pos: tmpVec,
      radius: 4,
      color: glowColor,
      opacity: opacity * 0.25,
      fixed: true
    })
    
    k.drawCircle({
      pos: tmpVec,
      radius: 1.5,
      color: coreColor,
      opacity,
      fixed: true
    })
  }
}

