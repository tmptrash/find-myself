/**
 * Fragment shadows effect - ghostly silhouettes of the hero
 * Metaphor for "lost parts of yourself"
 */

import * as Hero from '../components/hero.js'

/**
 * Creates fragment shadows system
 * @param {Object} config - Configuration
 * @param {Object} config.k - Kaplay instance
 * @param {number} [config.fragmentCount=5] - Number of fragments
 * @param {number} [config.speed=2] - Movement speed (pixels per second)
 * @param {number} [config.baseOpacity=0.15] - Base opacity
 * @param {number} [config.fadeSpeed=0.5] - Fade in/out speed
 * @returns {Object} Fragment system instance
 */
export function create(config = {}) {
  const {
    k,
    fragmentCount = 5,
    speed = 2,
    baseOpacity = 0.15,
    fadeSpeed = 0.5
  } = config
  
  const fragments = []
  
  //
  // Create fragments with random positions and properties
  //
  for (let i = 0; i < fragmentCount; i++) {
    const scale = 0.8 + Math.random() * 0.6  // 0.8 to 1.4
    const startX = Math.random() * k.width()
    const startY = Math.random() * k.height()
    
    //
    // Create hero sprite for fragment
    //
    const fragment = Hero.create({
      k,
      x: startX,
      y: startY,
      type: 'hero',
      controllable: false
    })
    
    //
    // Set fragment properties
    //
    fragment.character.opacity = 0  // Start invisible
    fragment.character.scale = k.vec2(scale, scale)
    fragment.character.z = -10  // Behind everything
    
    //
    // Disable physics
    //
    fragment.character.gravityScale = 0
    fragment.character.paused = true
    
    //
    // Gray color (different shades)
    //
    const grayShade = 60 + Math.floor(Math.random() * 80)  // 60-140
    fragment.character.color = k.rgb(grayShade, grayShade, grayShade)
    
    fragments.push({
      character: fragment.character,
      velocityX: (Math.random() - 0.5) * speed * 2,  // -speed to +speed
      velocityY: (Math.random() - 0.5) * speed * 2,
      targetOpacity: baseOpacity * (0.5 + Math.random() * 0.5),
      currentOpacity: 0,
      fadePhase: Math.random() * Math.PI * 2,  // Random start phase
      scale
    })
  }
  
  const inst = {
    k,
    fragments,
    speed,
    baseOpacity,
    fadeSpeed,
    time: 0
  }
  
  return inst
}

/**
 * Update fragments (call in k.onUpdate)
 * @param {Object} inst - Fragment system instance
 */
export function onUpdate(inst) {
  const { k, fragments, fadeSpeed } = inst
  
  inst.time += k.dt()
  
  fragments.forEach(fragment => {
    //
    // Update fade phase
    //
    fragment.fadePhase += fadeSpeed * k.dt()
    
    //
    // Calculate opacity (slow fade in/out)
    //
    const fadeValue = Math.sin(fragment.fadePhase) * 0.5 + 0.5
    fragment.targetOpacity = inst.baseOpacity * fadeValue
    
    //
    // Smooth opacity transition
    //
    const opacityDiff = fragment.targetOpacity - fragment.currentOpacity
    fragment.currentOpacity += opacityDiff * 0.02
    fragment.character.opacity = fragment.currentOpacity
    
    //
    // Move fragment slowly
    //
    fragment.character.pos.x += fragment.velocityX * k.dt() * 60
    fragment.character.pos.y += fragment.velocityY * k.dt() * 60
    
    //
    // Wrap around screen edges
    //
    const margin = 100
    if (fragment.character.pos.x < -margin) {
      fragment.character.pos.x = k.width() + margin
    } else if (fragment.character.pos.x > k.width() + margin) {
      fragment.character.pos.x = -margin
    }
    
    if (fragment.character.pos.y < -margin) {
      fragment.character.pos.y = k.height() + margin
    } else if (fragment.character.pos.y > k.height() + margin) {
      fragment.character.pos.y = -margin
    }
  })
}

/**
 * Destroy all fragments (call when leaving scene)
 * @param {Object} inst - Fragment system instance
 */
export function destroy(inst) {
  inst.fragments.forEach(fragment => {
    fragment.character.destroy()
  })
  inst.fragments = []
}

