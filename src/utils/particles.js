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
    bounds = null  // If null, use full screen
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
    // gaussianFactor of 0.15 means strong concentration in center, very few at edges
    //
    const gaussianFactor = 0.15
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
  
  const mousePos = k.mousePos()
  
  //
  // Get trembleRadiusAfterFlee if available, otherwise use trembleRadius
  //
  const trembleRadiusAfterFlee = inst.trembleRadiusAfterFlee || trembleRadius
  
  particles.forEach(particle => {
    //
    // Update flicker phase
    //
    particle.flickerPhase += flickerSpeed * k.dt()
    
    //
    // Calculate opacity (firefly-like flicker - quick flash, slow fade)
    //
    const phase = particle.flickerPhase % (Math.PI * 2)
    let flickerValue
    
    if (phase < Math.PI * 0.3) {
      // Quick rise (flash)
      flickerValue = Math.sin(phase / 0.3) 
    } else {
      // Slow fade
      flickerValue = Math.pow(Math.sin((phase - Math.PI * 0.3) / 1.7 + Math.PI / 2), 2)
    }
    
    particle.opacity = inst.baseOpacity * flickerValue  // 0 to baseOpacity
    
    //
    // Update tremble phase (slower, more organic) with individual speed
    //
    particle.tremblePhase += (1 + Math.random() * 0.5) * k.dt() * particle.trembleSpeed
    
    //
    // Calculate distance to mouse
    //
    const dx = mousePos.x - particle.baseX
    const dy = mousePos.y - particle.baseY
    const distToMouse = Math.sqrt(dx * dx + dy * dy)
    
    //
    // Check if cursor is visible (if isCursorVisible function exists)
    //
    const isCursorVisible = inst.isCursorVisible ? inst.isCursorVisible() : true
    
    //
    // Calculate mouse influence (closer = stronger effect)
    // Only if cursor is visible
    //
    const mouseEffect = (isCursorVisible && distToMouse < mouseInfluence)
      ? 1 - (distToMouse / mouseInfluence)
      : 0
    
    //
    // Check if mouse is close and firefly should start fleeing
    // Only if cursor is visible
    //
    const fleeDistance = 80  // Distance at which firefly starts to flee
    
    if (isCursorVisible && !particle.isFleeing && distToMouse < fleeDistance && distToMouse > 0) {
      //
      // Start fleeing - save current position and calculate new target
      //
      particle.isFleeing = true
      particle.fleeProgress = 0
      particle.fleeStartX = particle.x  // Save current position
      particle.fleeStartY = particle.y
      particle.hasEverFled = true  // Mark that this particle has fled at least once
      
      //
      // Direction away from mouse with random angle deviation
      //
      const baseAngle = Math.atan2(particle.y - mousePos.y, particle.x - mousePos.x)
      
      //
      // Add significant random deviation for more chaotic scatter
      // Each particle gets its own random direction
      //
      const randomDeviation = (Math.random() - 0.5) * (Math.PI * 0.8)  // -72° to +72°
      const finalAngle = baseAngle + randomDeviation
      
      //
      // Calculate direction with randomized angle
      //
      const dirX = Math.cos(finalAngle)
      const dirY = Math.sin(finalAngle)
      
      //
      // Also randomize the flee distance for more variety
      //
      const fleeDistanceAmount = 100 + Math.random() * 150  // 100-250 pixels
      let targetX = particle.x + dirX * fleeDistanceAmount
      let targetY = particle.y + dirY * fleeDistanceAmount
      
      //
      // Apply soft boundary repulsion if bounds are set
      //
      if (bounds) {
        const centerX = bounds.x + bounds.width / 2
        const centerY = bounds.y + bounds.height / 2
        
        //
        // Calculate how far target is from center (normalized 0-1)
        //
        const distFromCenterX = Math.abs(targetX - centerX) / (bounds.width / 2)
        const distFromCenterY = Math.abs(targetY - centerY) / (bounds.height / 2)
        
        //
        // If target is near edge, pull it back toward center more aggressively
        //
        const edgeThreshold = 0.5  // Start pulling back when 50% toward edge (was 70%)
        if (distFromCenterX > edgeThreshold) {
          const pullStrength = (distFromCenterX - edgeThreshold) / (1 - edgeThreshold)
          targetX = targetX - (targetX - centerX) * pullStrength * 0.7  // Stronger pull (was 0.5)
        }
        if (distFromCenterY > edgeThreshold) {
          const pullStrength = (distFromCenterY - edgeThreshold) / (1 - edgeThreshold)
          targetY = targetY - (targetY - centerY) * pullStrength * 0.7  // Stronger pull (was 0.5)
        }
        
        //
        // Keep within bounds (hard limit with larger margin)
        //
        const margin = 50  // Larger margin (was 30)
        particle.fleeTargetX = Math.max(bounds.x + margin, Math.min(bounds.x + bounds.width - margin, targetX))
        particle.fleeTargetY = Math.max(bounds.y + margin, Math.min(bounds.y + bounds.height - margin, targetY))
      } else {
        //
        // No bounds - particles can fly anywhere
        //
        particle.fleeTargetX = targetX
        particle.fleeTargetY = targetY
      }
    }
    
    //
    // Update position based on state
    //
    if (particle.isFleeing) {
      //
      // Fleeing animation - slow, smooth movement like random floating
      // Each particle has individual flee speed
      //
      particle.fleeProgress += k.dt() * 0.4 * particle.fleeSpeed  // Even faster speed (was 0.25)
      
      if (particle.fleeProgress >= 1) {
        //
        // Finished fleeing - smoothly transition to new base position
        //
        particle.isFleeing = false
        particle.baseX = particle.fleeTargetX
        particle.baseY = particle.fleeTargetY
        particle.x = particle.fleeTargetX
        particle.y = particle.fleeTargetY
        particle.fleeProgress = 0
        particle.floatFadeIn = 0  // Start floating from 0 amplitude
      } else {
        // Linear interpolation
        const t = particle.fleeProgress
        
        const startX = particle.fleeStartX
        const startY = particle.fleeStartY
        const endX = particle.fleeTargetX
        const endY = particle.fleeTargetY
        
        // Add perpendicular offset for arc
        const perpX = -(endY - startY) * 0.15
        const perpY = (endX - startX) * 0.15
        
        // Smooth arc using sine wave
        const arcFactor = Math.sin(t * Math.PI)
        
        // Movement with arc offset
        particle.x = startX + (endX - startX) * t + perpX * arcFactor
        particle.y = startY + (endY - startY) * t + perpY * arcFactor
      }
    } else {
      //
      // Normal floating movement around base position
      //
      const trembleAmount = particle.hasEverFled ? trembleRadiusAfterFlee : trembleRadius
      
      //
      // Use multiple sin waves for organic movement
      //
      const offsetX = Math.cos(particle.tremblePhase) * trembleAmount + 
                      Math.sin(particle.tremblePhase * 0.7) * trembleAmount * 0.5
      const offsetY = Math.sin(particle.tremblePhase * 1.3) * trembleAmount + 
                      Math.cos(particle.tremblePhase * 0.5) * trembleAmount * 0.5
      
      //
      // Smooth fade-in of floating amplitude after fleeing
      //
      if (particle.floatFadeIn < 1) {
        particle.floatFadeIn += k.dt() * 3  // Fade in quickly over ~0.33 seconds
        particle.floatFadeIn = Math.min(1, particle.floatFadeIn)
      }
      
      //
      // Apply fade-in multiplier to offset
      //
      const fadeMultiplier = particle.floatFadeIn
      
      particle.x = particle.baseX + offsetX * fadeMultiplier
      particle.y = particle.baseY + offsetY * fadeMultiplier
    }
  })
}

/**
 * Draw particles (optimized with Kaplay API)
 * @param {Object} inst - Particle system instance
 */
export function draw(inst) {
  const { k, particles, color } = inst
  
  //
  // Parse color once
  //
  const r = parseInt(color.slice(1, 3), 16)
  const g = parseInt(color.slice(3, 5), 16)
  const b = parseInt(color.slice(5, 7), 16)
  const colorObj = k.rgb(r, g, b)
  const coreColor = k.rgb(255, 255, 200)
  
  //
  // Draw all particles
  //
  particles.forEach(particle => {
    const opacity = particle.opacity
    
    if (opacity < 0.01) return  // Skip invisible particles
    
    const pos = k.vec2(particle.x, particle.y)
    
    //
    // Draw glow layers
    //
    
    // Outer glow
    k.drawCircle({
      pos,
      radius: 8,
      color: colorObj,
      opacity: opacity * 0.1,
      fixed: true
    })
    
    // Middle glow
    k.drawCircle({
      pos,
      radius: 5,
      color: colorObj,
      opacity: opacity * 0.3,
      fixed: true
    })
    
    // Inner glow
    k.drawCircle({
      pos,
      radius: 3,
      color: colorObj,
      opacity: opacity * 0.6,
      fixed: true
    })
    
    // Core (brightest)
    k.drawCircle({
      pos,
      radius: 2,
      color: coreColor,
      opacity: opacity,
      fixed: true
    })
  })
}

