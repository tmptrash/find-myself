import { CFG } from '../cfg.js'
//
// Dust parameters
//
const DUST_COUNT = 100  // Number of dust particles (increased from 80)
const DUST_FALL_SPEED = 15  // Slow fall speed
const DUST_DRIFT_SPEED = 5  // Slight horizontal drift
const DUST_SIZE_MIN = 1.5  // Minimum size (increased from 1)
const DUST_SIZE_MAX = 4  // Maximum size (increased from 3)
const DUST_OPACITY_MIN = 0.1  // Minimum opacity
const DUST_OPACITY_MAX = 0.4  // Maximum opacity

/**
 * Creates dust system
 * @param {Object} config - Configuration
 * @param {Object} config.k - Kaplay instance
 * @param {Object} config.bounds - Game area bounds {left, right, top, bottom}
 * @returns {Object} Dust instance
 */
export function create(config) {
  const { k, bounds } = config
  
  const particles = []
  //
  // Create initial dust particles distributed across entire screen
  //
  for (let i = 0; i < DUST_COUNT; i++) {
    particles.push(createParticle(k, bounds, true))  // initialSpawn = true
  }
  
  return {
    k,
    particles,
    bounds
  }
}

/**
 * Create a single dust particle
 * @param {Object} k - Kaplay instance
 * @param {Object} bounds - Game area bounds {left, right, top, bottom}
 * @param {boolean} initialSpawn - If true, spawn across entire screen for initial distribution
 * @returns {Object} Dust particle object
 */
function createParticle(k, bounds, initialSpawn = false) {
  const x = bounds.left + Math.random() * (bounds.right - bounds.left)
  const y = initialSpawn 
    ? bounds.top + Math.random() * (bounds.bottom - bounds.top)  // Distribute in game area at start
    : bounds.top - 10 - Math.random() * 50  // Start above game area during normal operation
  const size = DUST_SIZE_MIN + Math.random() * (DUST_SIZE_MAX - DUST_SIZE_MIN)
  const fallSpeed = DUST_FALL_SPEED * (0.5 + Math.random() * 1.0)  // Vary speed
  const driftSpeed = (Math.random() - 0.5) * DUST_DRIFT_SPEED * 2  // Can drift left or right
  const opacity = DUST_OPACITY_MIN + Math.random() * (DUST_OPACITY_MAX - DUST_OPACITY_MIN)
  //
  // Bright blue color like blue bugs (#3498DB) with slight variations
  //
  const baseR = 52
  const baseG = 152
  const baseB = 219
  const variation = Math.random() * 30 - 15  // ±15 variation
  
  return {
    x,
    y,
    size,
    fallSpeed,
    driftSpeed,
    opacity,
    color: {
      r: Math.max(0, Math.min(255, baseR + variation)),
      g: Math.max(0, Math.min(255, baseG + variation)),
      b: Math.max(0, Math.min(255, baseB + variation))
    }
  }
}

/**
 * Update dust particles
 * @param {Object} inst - Dust instance
 * @param {number} dt - Delta time
 */
export function onUpdate(inst, dt) {
  const { k, particles, bounds } = inst
  //
  // Update each particle
  //
  particles.forEach((particle, index) => {
    //
    // Move down and drift
    //
    particle.y += particle.fallSpeed * dt
    particle.x += particle.driftSpeed * dt
    //
    // If particle goes below game area, reset it at top
    //
    if (particle.y > bounds.bottom + 10) {
      particles[index] = createParticle(k, bounds, false)
    }
    //
    // If particle goes outside game area horizontally, reset it
    //
    if (particle.x < bounds.left - 10 || particle.x > bounds.right + 10) {
      particles[index] = createParticle(k, bounds, false)
    }
  })
}

/**
 * Draw dust particles
 * @param {Object} inst - Dust instance
 */
export function draw(inst) {
  const { k, particles } = inst
  
  particles.forEach(particle => {
    //
    // Draw dark outline first (1 pixel larger)
    //
    k.drawCircle({
      pos: k.vec2(particle.x, particle.y),
      radius: particle.size + 1,
      color: k.rgb(30, 30, 30),
      opacity: particle.opacity * 0.8
    })
    //
    // Draw main particle on top with blue color
    //
    k.drawCircle({
      pos: k.vec2(particle.x, particle.y),
      radius: particle.size,
      color: k.rgb(particle.color.r, particle.color.g, particle.color.b),
      opacity: particle.opacity
    })
  })
}

