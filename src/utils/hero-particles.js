import { CFG } from '../cfg.js'
import { parseHex, getRGB } from './helper.js'

/**
 * Create sparkle particles around hero for color change effect
 * @param {Object} inst - Hero instance
 * @param {string} color - New body color (hex)
 */
export function createColorChangeSparkles(inst, color) {
  const { k, character } = inst
  const centerX = character.pos.x
  const centerY = character.pos.y
  //
  // Parse hex color to RGB
  //
  const colorValue = parseInt(color.replace('#', ''), 16)
  const r = (colorValue >> 16) & 0xFF
  const g = (colorValue >> 8) & 0xFF
  const b = colorValue & 0xFF
  //
  // Create circle particles flying outward (similar to heart particles for small hero)
  //
  const particleCount = 12
  for (let i = 0; i < particleCount; i++) {
    const angle = (Math.PI * 2 * i) / particleCount
    const speed = 80 + Math.random() * 40
    const lifetime = 0.6 + Math.random() * 0.4
    const circleSize = 8 + Math.random() * 6
    //
    // Create black outline circles (8 directions)
    //
    const outlineOffset = 1.5
    const outlineOffsets = [
      [-outlineOffset, -outlineOffset],
      [0, -outlineOffset],
      [outlineOffset, -outlineOffset],
      [-outlineOffset, 0],
      [outlineOffset, 0],
      [-outlineOffset, outlineOffset],
      [0, outlineOffset],
      [outlineOffset, outlineOffset]
    ]
    outlineOffsets.forEach(([dx, dy]) => {
      const outlineParticle = k.add([
        k.circle(circleSize),
        k.pos(centerX + dx, centerY + dy),
        k.color(0, 0, 0),
        k.opacity(1),
        k.z(50)
      ])
      //
      // Animate outline particle
      //
      const startTime = k.time()
      outlineParticle.onUpdate(() => onUpdateColorSparkleParticle(outlineParticle, k, startTime, lifetime, angle, speed))
    })
    //
    // Create main colored circle
    //
    const particle = k.add([
      k.circle(circleSize),
      k.pos(centerX, centerY),
      k.color(r, g, b),
      k.opacity(1),
      k.z(51)
    ])
    //
    // Animate particle outward with fade
    //
    const startTime = k.time()
    particle.onUpdate(() => onUpdateColorSparkleParticle(particle, k, startTime, lifetime, angle, speed))
  }
}

/**
 * Create sparkle particles around hero's mouth
 * @param {Object} inst - Hero instance
 */
export function createMouthSparkles(inst) {
  const { k, character } = inst
  const centerX = character.pos.x
  const centerY = character.pos.y
  //
  // Create small sparkle particles
  //
  const sparkleCount = 12
  const sparkles = []
  for (let i = 0; i < sparkleCount; i++) {
    //
    // Position sparkles in a small area around the mouth (lower part of face)
    //
    const angle = (Math.PI * 2 * i) / sparkleCount
    const distance = 15 + Math.random() * 10
    const offsetX = Math.cos(angle) * distance
    const offsetY = 5 + Math.sin(angle) * distance * 0.5
    //
    // Sparkle colors (bright yellow/white)
    //
    const colors = [
      k.rgb(255, 255, 200),
      k.rgb(255, 255, 255),
      k.rgb(255, 240, 150),
      k.rgb(200, 255, 255)
    ]
    const sparkleColor = colors[Math.floor(Math.random() * colors.length)]
    //
    // Create sparkle particle (small circle)
    //
    const size = 2 + Math.random() * 3
    const sparkle = k.add([
      k.circle(size),
      k.pos(centerX + offsetX, centerY + offsetY),
      k.color(sparkleColor),
      k.opacity(0.8),
      k.z(CFG.visual.zIndex.player + 1)
    ])
    //
    // Store sparkle data
    //
    sparkle.vx = (Math.random() - 0.5) * 40
    sparkle.vy = -20 - Math.random() * 30
    sparkle.lifetime = 0
    sparkle.maxLifetime = 0.8 + Math.random() * 0.4
    sparkles.push(sparkle)
  }
  //
  // Animate sparkles
  //
  const sparkleInterval = k.onUpdate(() => onUpdateMouthSparkles(k, sparkles, sparkleInterval))
}

/**
 * Create particles around hero when a new body part is added
 * @param {Object} inst - Hero instance
 */
export function createBodyPartParticles(inst) {
  const k = inst.k
  const heroX = inst.character.pos.x
  const heroY = inst.character.pos.y
  const particleCount = 12
  const bodyColor = inst.bodyColor || CFG.visual.colors.hero.body
  //
  // Create heart particles flying outward (hero body color with black outline)
  //
  for (let i = 0; i < particleCount; i++) {
    const angle = (Math.PI * 2 * i) / particleCount
    const speed = 80 + Math.random() * 40
    const lifetime = 0.6 + Math.random() * 0.4
    const heartSize = 20 + Math.random() * 10
    //
    // Create black outline hearts (8 directions)
    //
    const outlineOffset = 1.5
    const outlineOffsets = [
      [-outlineOffset, -outlineOffset],
      [0, -outlineOffset],
      [outlineOffset, -outlineOffset],
      [-outlineOffset, 0],
      [outlineOffset, 0],
      [-outlineOffset, outlineOffset],
      [0, outlineOffset],
      [outlineOffset, outlineOffset]
    ]
    outlineOffsets.forEach(([dx, dy]) => {
      const outlineParticle = k.add([
        k.text('♥', { size: heartSize }),
        k.pos(heroX + dx, heroY + dy),
        k.color(0, 0, 0),
        k.opacity(1),
        k.z(50)
      ])
      //
      // Animate outline particle
      //
      const startTime = k.time()
      outlineParticle.onUpdate(() => onUpdateHeartParticle(outlineParticle, k, startTime, lifetime, angle, speed))
    })
    //
    // Create main colored heart
    //
    const colorClean = String(bodyColor).replace('#', '')
    const r = parseInt(colorClean.substring(0, 2), 16)
    const g = parseInt(colorClean.substring(2, 4), 16)
    const b = parseInt(colorClean.substring(4, 6), 16)
    const particle = k.add([
      k.text('♥', { size: heartSize }),
      k.pos(heroX, heroY),
      k.color(r, g, b),
      k.opacity(1),
      k.z(51)
    ])
    //
    // Animate particle outward with fade
    //
    const startTime = k.time()
    particle.onUpdate(() => onUpdateHeartParticle(particle, k, startTime, lifetime, angle, speed))
  }
}

/**
 * Creates a filled particle with outline for annihilation / VFX bursts
 * @param {Object} k - Kaplay inst
 * @param {number} x
 * @param {number} y
 * @param {string} colorHex
 * @param {string} shapeType
 * @param {number} rotation
 * @param {number} particleSize
 * @param {number} scale
 * @returns {Object}
 */
export function createParticleWithOutline(k, x, y, colorHex, shapeType, rotation, particleSize, scale) {
  const [r, g, b] = parseHex(colorHex)
  const { pWidth, pHeight, oWidth, oHeight } = getParticleDimensions(k, shapeType, particleSize, scale)
  const isCircle = shapeType === 'circle'
  return k.add([
    k.pos(x, y),
    k.anchor('center'),
    k.rotate(rotation),
    k.z(CFG.visual.zIndex.assemblyParticles),
    {
      draw() {
        if (isCircle) {
          //
          // Draw outline circle behind, colored circle on top
          //
          k.drawCircle({
            radius: oWidth / 2,
            pos: k.vec2(0, 0),
            color: getRGB(k, CFG.visual.colors.outline)
          })
          k.drawCircle({
            radius: pWidth / 2,
            pos: k.vec2(0, 0),
            color: k.rgb(r, g, b)
          })
        } else {
          //
          // Draw outline rect behind, colored rect on top
          //
          k.drawRect({
            width: oWidth,
            height: oHeight,
            pos: k.vec2(0, 0),
            anchor: 'center',
            color: getRGB(k, CFG.visual.colors.outline)
          })
          k.drawRect({
            width: pWidth,
            height: pHeight,
            pos: k.vec2(0, 0),
            anchor: 'center',
            color: k.rgb(r, g, b)
          })
        }
      }
    }
  ])
}
//
// Helper function to calculate particle dimensions based on shape type
//
function getParticleDimensions(k, shapeType, particleSize, scale) {
  const outlineSize = particleSize + 1
  let pWidth, pHeight, oWidth, oHeight
  if (shapeType === 'square') {
    pWidth = pHeight = particleSize * scale
    oWidth = oHeight = outlineSize * scale
  } else if (shapeType === 'rect_h') {
    pWidth = particleSize * scale * k.rand(1.3, 1.8)
    pHeight = particleSize * scale * k.rand(0.6, 0.8)
    oWidth = pWidth + 1 * scale
    oHeight = pHeight + 1 * scale
  } else if (shapeType === 'rect_v') {
    pWidth = particleSize * scale * k.rand(0.6, 0.8)
    pHeight = particleSize * scale * k.rand(1.3, 1.8)
    oWidth = pWidth + 1 * scale
    oHeight = pHeight + 1 * scale
  } else if (shapeType === 'circle') {
    //
    // For circles pWidth/pHeight store the diameter; radius = pWidth / 2
    //
    const diameter = particleSize * scale * k.rand(0.7, 1.1)
    pWidth = pHeight = diameter
    oWidth = oHeight = diameter + 2 * scale
  } else {
    pWidth = pHeight = particleSize * scale * k.rand(0.7, 0.9)
    oWidth = oHeight = pWidth + 1 * scale
  }
  return { pWidth, pHeight, oWidth, oHeight }
}
//
// Private sparkle / heart particle updates
//
function onUpdateColorSparkleParticle(particle, k, startTime, lifetime, angle, speed) {
  const elapsed = k.time() - startTime
  if (elapsed > lifetime) {
    k.destroy(particle)
    return
  }
  particle.moveBy(Math.cos(angle) * speed * k.dt(), Math.sin(angle) * speed * k.dt())
  particle.opacity = 1 - (elapsed / lifetime)
}
function onUpdateHeartParticle(particle, k, startTime, lifetime, angle, speed) {
  const elapsed = k.time() - startTime
  if (elapsed > lifetime) {
    k.destroy(particle)
    return
  }
  particle.moveBy(Math.cos(angle) * speed * k.dt(), Math.sin(angle) * speed * k.dt())
  particle.opacity = 1 - (elapsed / lifetime)
}
function onUpdateMouthSparkles(k, sparkles, sparkleInterval) {
  sparkles.forEach(sparkle => {
    if (!sparkle.exists()) return
    sparkle.lifetime += k.dt()
    //
    // Move sparkle
    //
    sparkle.moveBy(sparkle.vx * k.dt(), sparkle.vy * k.dt())
    //
    // Apply upward drift and slow down
    //
    sparkle.vy -= 80 * k.dt()
    sparkle.vx *= 0.95
    //
    // Fade out based on lifetime
    //
    const progress = sparkle.lifetime / sparkle.maxLifetime
    sparkle.opacity = 0.8 * (1 - progress)
    sparkle.lifetime >= sparkle.maxLifetime && k.destroy(sparkle)
  })
  sparkles.every(s => !s.exists()) && sparkleInterval.cancel()
}
