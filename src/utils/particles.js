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
    mouseInfluence = 150
  } = config
  
  //
  // Create particles with random positions
  //
  const particles = []
  for (let i = 0; i < particleCount; i++) {
    const baseX = Math.random() * k.width()
    const baseY = Math.random() * k.height()
    
    particles.push({
      baseX,
      baseY,
      x: baseX,
      y: baseY,
      flickerPhase: Math.random() * Math.PI * 2,
      tremblePhase: Math.random() * Math.PI * 2,
      opacity: baseOpacity,
      isFleeing: false,      // Is currently fleeing from mouse
      fleeStartX: baseX,     // Start position when fleeing begins
      fleeStartY: baseY,
      fleeTargetX: baseX,    // Target position when fleeing
      fleeTargetY: baseY,
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
    time: 0
  }
  
  return inst
}

/**
 * Update particles (call in k.onUpdate)
 * @param {Object} inst - Particle system instance
 */
export function onUpdate(inst) {
  const { k, particles, flickerSpeed, trembleRadius, mouseInfluence } = inst
  
  inst.time += k.dt()
  
  const mousePos = k.mousePos()
  
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
    // Update tremble phase (slower, more organic)
    //
    particle.tremblePhase += (1 + Math.random() * 0.5) * k.dt()
    
    //
    // Calculate distance to mouse
    //
    const dx = mousePos.x - particle.baseX
    const dy = mousePos.y - particle.baseY
    const distToMouse = Math.sqrt(dx * dx + dy * dy)
    
    //
    // Calculate mouse influence (closer = stronger effect)
    //
    const mouseEffect = distToMouse < mouseInfluence 
      ? 1 - (distToMouse / mouseInfluence)
      : 0
    
    //
    // Check if mouse is close and firefly should start fleeing
    //
    const fleeDistance = 80  // Distance at which firefly starts to flee
    
    if (!particle.isFleeing && distToMouse < fleeDistance && distToMouse > 0) {
      //
      // Start fleeing - save current position and calculate new target
      //
      particle.isFleeing = true
      particle.fleeProgress = 0
      particle.fleeStartX = particle.x  // Save current position
      particle.fleeStartY = particle.y
      
      // Direction away from mouse
      const dirX = (particle.x - mousePos.x) / distToMouse
      const dirY = (particle.y - mousePos.y) / distToMouse
      
      // New position: 150-200 pixels away from current position
      const fleeDistanceAmount = 150 + Math.random() * 50
      particle.fleeTargetX = particle.x + dirX * fleeDistanceAmount
      particle.fleeTargetY = particle.y + dirY * fleeDistanceAmount
      
      // Keep within screen bounds
      particle.fleeTargetX = Math.max(50, Math.min(k.width() - 50, particle.fleeTargetX))
      particle.fleeTargetY = Math.max(50, Math.min(k.height() - 50, particle.fleeTargetY))
    }
    
    //
    // Update position based on state
    //
    if (particle.isFleeing) {
      //
      // Fleeing animation - smooth arc movement at constant speed
      //
      particle.fleeProgress += k.dt() * 0.8  // Slower, more natural speed
      
      if (particle.fleeProgress >= 1) {
        // Finished fleeing - smoothly transition to new base position
        particle.isFleeing = false
        particle.baseX = particle.fleeTargetX
        particle.baseY = particle.fleeTargetY
        particle.x = particle.fleeTargetX  // Set exact position (no jump)
        particle.y = particle.fleeTargetY
        particle.fleeProgress = 0
        particle.justLanded = true  // Pause floating briefly
        particle.landedTimer = 0
      } else {
        // Linear interpolation - constant speed throughout
        const t = particle.fleeProgress
        
        // Calculate arc (slight curve in movement)
        const startX = particle.fleeStartX
        const startY = particle.fleeStartY
        const endX = particle.fleeTargetX
        const endY = particle.fleeTargetY
        
        // Add perpendicular offset for arc (smaller for gentler curve)
        const midX = (startX + endX) / 2
        const midY = (startY + endY) / 2
        const perpX = -(endY - startY) * 0.15
        const perpY = (endX - startX) * 0.15
        
        // Smooth arc using sine wave
        const arcFactor = Math.sin(t * Math.PI)
        
        // Movement with arc offset at constant speed
        particle.x = startX + (endX - startX) * t + perpX * arcFactor
        particle.y = startY + (endY - startY) * t + perpY * arcFactor
      }
    } else {
      //
      // Check if just landed (pause floating briefly)
      //
      if (particle.justLanded) {
        particle.landedTimer += k.dt()
        
        if (particle.landedTimer > 0.3) {
          // Resume floating after 0.3 seconds
          particle.justLanded = false
          particle.landedTimer = 0
          particle.floatFadeIn = 0  // Start fade-in from 0
        } else {
          // Stay still at landing position
          particle.x = particle.baseX
          particle.y = particle.baseY
        }
      } else {
        //
        // Normal floating movement around base position
        //
        const trembleAmount = trembleRadius
        
        // Use multiple sin waves for organic movement
        const offsetX = Math.cos(particle.tremblePhase) * trembleAmount + 
                        Math.sin(particle.tremblePhase * 0.7) * trembleAmount * 0.5
        const offsetY = Math.sin(particle.tremblePhase * 1.3) * trembleAmount + 
                        Math.cos(particle.tremblePhase * 0.5) * trembleAmount * 0.5
        
        //
        // Fade-in floating amplitude after landing
        //
        if (particle.floatFadeIn < 1) {
          particle.floatFadeIn += k.dt() * 2  // Fade in over 0.5 seconds
          particle.floatFadeIn = Math.min(1, particle.floatFadeIn)
        }
        
        // Apply fade-in multiplier to offset
        const fadeMultiplier = particle.floatFadeIn
        
        particle.x = particle.baseX + offsetX * fadeMultiplier
        particle.y = particle.baseY + offsetY * fadeMultiplier
      }
    }
  })
}

/**
 * Draw particles (call in k.onDraw)
 * @param {Object} inst - Particle system instance
 */
export function draw(inst) {
  const { k, particles, color } = inst
  
  //
  // Parse color
  //
  const r = parseInt(color.slice(1, 3), 16)
  const g = parseInt(color.slice(3, 5), 16)
  const b = parseInt(color.slice(5, 7), 16)
  
  particles.forEach(particle => {
    const x = Math.floor(particle.x)
    const y = Math.floor(particle.y)
    const opacity = particle.opacity
    
    //
    // Draw glow layers (firefly effect)
    //
    
    // Outer glow (largest, faintest)
    k.drawCircle({
      pos: k.vec2(x, y),
      radius: 8,
      color: k.rgb(r, g, b),
      opacity: opacity * 0.1,
      fixed: true
    })
    
    // Middle glow
    k.drawCircle({
      pos: k.vec2(x, y),
      radius: 5,
      color: k.rgb(r, g, b),
      opacity: opacity * 0.3,
      fixed: true
    })
    
    // Inner glow
    k.drawCircle({
      pos: k.vec2(x, y),
      radius: 3,
      color: k.rgb(r, g, b),
      opacity: opacity * 0.6,
      fixed: true
    })
    
    // Core (brightest)
    k.drawCircle({
      pos: k.vec2(x, y),
      radius: 2,
      color: k.rgb(255, 255, 200),  // Warm white center
      opacity: opacity,
      fixed: true
    })
  })
}

