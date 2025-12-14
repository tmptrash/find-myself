import { CFG } from '../cfg.js'
import * as Hero from '../../../components/hero.js'
import * as Sound from '../../../utils/sound.js'
//
// Spike parameters
//
const DIGIT_COUNT = 40
const FAKE_DIGIT_COUNT = 4  // Last 4 digits are fake (no collision)
const FONT_SIZE = 36
const MIN_Y_OFFSET = -10
const MAX_Y_OFFSET = 10
const MIN_ROTATION = -3
const MAX_ROTATION = 3
const SPIKE_TAG = "time-spike"

/**
 * Creates time spikes with digit "1"
 * @param {Object} config - Configuration
 * @param {Object} config.k - Kaplay instance
 * @param {number} config.startX - Start X position
 * @param {number} config.endX - End X position
 * @param {number} config.y - Y position (base line)
 * @param {Object} config.hero - Hero instance for collision detection
 * @param {Object} [config.sfx] - Sound instance for glint effects
 * @returns {Object} Time spikes instance
 */
export function create(config) {
  const { k, startX, endX, y, hero, sfx = null } = config
  
  const spacing = (endX - startX) / (DIGIT_COUNT - 1)
  const spikes = []
  const fakeSpikes = []
  //
  // Create spikes along the line
  //
  for (let i = 0; i < DIGIT_COUNT; i++) {
    const x = startX + i * spacing
    const yOffset = MIN_Y_OFFSET + Math.random() * (MAX_Y_OFFSET - MIN_Y_OFFSET)
    const rotation = MIN_ROTATION + Math.random() * (MAX_ROTATION - MIN_ROTATION)
    //
    // Last 4 digits are fake (no collision, drawn in front)
    //
    const isFake = i >= DIGIT_COUNT - FAKE_DIGIT_COUNT
    const spike = createSingleSpike(k, x, y + yOffset, rotation, isFake)
    
    if (isFake) {
      fakeSpikes.push(spike)
    } else {
      spikes.push(spike)
    }
  }
  
  const inst = {
    k,
    spikes,
    fakeSpikes,
    hero
  }
  //
  // Setup collision detection with hero character (only for real spikes)
  //
  if (hero && hero.character) {
    spikes.forEach(spike => {
      hero.character.onCollide(SPIKE_TAG, () => onSpikeHit(inst))
    })
  }
  //
  // Setup glint animation for all spikes (real and fake)
  //
  const allSpikes = [...spikes, ...fakeSpikes]
  allSpikes.forEach(spike => {
    //
    // Initialize glint state for each spike
    //
    spike.glintTimer = Math.random() * CFG.visual.spikeGlint.intervalMax
    spike.isGlinting = false
    spike.glintProgress = 0
    spike.glintSoundPlayed = false
    spike.sfx = sfx
    //
    // Setup update for glint animation
    //
    spike.onUpdate(() => updateGlintAnimation(spike, k))
  })
  
  return inst
}

/**
 * Creates a single spike with digit "1"
 * @param {Object} k - Kaplay instance
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} rotation - Rotation in degrees
 * @param {boolean} isFake - If true, no collision and drawn in front
 * @returns {Object} Spike game object
 */
function createSingleSpike(k, x, y, rotation, isFake = false) {
  //
  // Create outline texts (8 directions for black outline)
  //
  const outlineOffsets = [
    [-2, -2], [0, -2], [2, -2],
    [-2, 0],           [2, 0],
    [-2, 2],  [0, 2],  [2, 2]
  ]
  
  const outlineTexts = outlineOffsets.map(([ox, oy]) => {
    const outlineComponents = [
      k.text("1", {
        size: FONT_SIZE,
        font: CFG.visual.fonts.thinFull.replace(/'/g, ''),
        align: "center"
      }),
      k.pos(x + ox, y + oy),
      k.anchor("center"),
      k.rotate(rotation),
      k.color(0, 0, 0)  // Black outline
    ]
    //
    // Add z-index based on fake/real
    //
    if (!isFake) {
      outlineComponents.push(k.z(14))
    } else {
      outlineComponents.push(k.z(14))
    }
    
    return k.add(outlineComponents)
  })
  //
  // Create main text components
  //
  const components = [
    k.text("1", {
      size: FONT_SIZE,
      font: CFG.visual.fonts.thinFull.replace(/'/g, ''),
      align: "center"
    }),
    k.pos(x, y),
    k.anchor("center"),
    k.rotate(rotation),
    k.color(192, 192, 192)  // Light gray
  ]
  //
  // Real spikes have collision and are behind hero
  //
  if (!isFake) {
    components.push(
      k.area({
        shape: new k.Rect(
          k.vec2(-3, -5),  // Narrow collision box for thin digit, lowered down
          6,               // Very narrow width (6px)
          35               // Smaller height (35px) for smaller font
        )
      }),
      k.z(14),  // Below platforms (15) and hero (20)
      SPIKE_TAG
    )
  } else {
    //
    // Fake spikes have no collision and are behind hero
    //
    components.push(
      k.z(14)  // Behind hero (20), same as real spikes
    )
  }
  
  const spike = k.add(components)
  //
  // Store reference to outline texts in spike object
  //
  spike.outlineTexts = outlineTexts
  //
  // Create glint drawer (invisible object that draws glint on top layer)
  //
  const glintDrawer = k.add([
    k.pos(0, 0),
    k.z(19),  // Above spike but below hero (20)
    {
      draw() {
        drawGlint(spike, k)
      }
    }
  ])
  
  spike.glintDrawer = glintDrawer
  
  return spike
}

/**
 * Called when hero hits a spike
 * @param {Object} inst - Time spikes instance
 */
function onSpikeHit(inst) {
  if (!inst.hero || inst.hero.isDying || inst.hero.isAnnihilating) return
  //
  // Trigger hero death
  //
  Hero.death(inst.hero, () => {
    inst.k.go('level-time.0')  // Restart level
  })
}
/**
 * Update glint animation for a spike
 * @param {Object} spike - Spike game object with glint state
 * @param {Object} k - Kaplay instance
 */
function updateGlintAnimation(spike, k) {
  const dt = k.dt()
  
  spike.glintTimer -= dt
  
  if (spike.glintTimer <= 0 && !spike.isGlinting) {
    //
    // Start new glint
    //
    spike.isGlinting = true
    spike.glintProgress = 0
    spike.glintSoundPlayed = false
    spike.glintTimer = CFG.visual.spikeGlint.intervalMin + Math.random() * (CFG.visual.spikeGlint.intervalMax - CFG.visual.spikeGlint.intervalMin)
  }
  
  if (spike.isGlinting) {
    spike.glintProgress += dt / CFG.visual.spikeGlint.duration
    //
    // Play metal ping sound at glint start
    //
    if (!spike.glintSoundPlayed && spike.glintProgress > 0.05 && spike.sfx) {
      const swishVolume = CFG.audio.spikeGlint.swishVolume
      const ringVolume = CFG.audio.spikeGlint.ringVolume
      Sound.playMetalPingSound(spike.sfx, swishVolume, ringVolume)
      spike.glintSoundPlayed = true
    }
    
    if (spike.glintProgress >= 1) {
      //
      // End glint
      //
      spike.isGlinting = false
      spike.glintProgress = 0
    }
  }
}
/**
 * Draw light glint effect on spike
 * @param {Object} spike - Spike game object
 * @param {Object} k - Kaplay instance
 */
function drawGlint(spike, k) {
  //
  // Only draw when glinting
  //
  if (!spike.isGlinting || spike.glintProgress === 0) return
  
  const { pos, glintProgress } = spike
  //
  // Calculate glint position moving along the digit "1" from top to bottom
  //
  const startY = pos.y - 15  // Top of the "1"
  const endY = pos.y + 15    // Bottom of the "1"
  
  const glintY = startY + (endY - startY) * glintProgress
  //
  // Opacity curve (fade in quickly, fade out slowly)
  //
  let glintOpacity
  if (glintProgress < 0.3) {
    glintOpacity = (glintProgress / 0.3)
  } else {
    glintOpacity = ((1 - glintProgress) / 0.7)
  }
  //
  // Draw central bright core (smaller than blade glint)
  //
  const coreSize = 6
  
  k.drawCircle({
    pos: k.vec2(pos.x, glintY),
    radius: coreSize,
    color: k.rgb(255, 255, 255),
    opacity: glintOpacity * 0.9
  })
  //
  // Draw outer glow
  //
  const glowSize = coreSize * 2
  
  k.drawCircle({
    pos: k.vec2(pos.x, glintY),
    radius: glowSize,
    color: k.rgb(255, 255, 255),
    opacity: glintOpacity * 0.3
  })
  //
  // Draw light rays (smaller and fewer than blade glint)
  //
  const rayLength = 12
  const rayCount = 4
  const rayWidth = 1.5
  
  for (let i = 0; i < rayCount; i++) {
    const angle = (Math.PI * 2 * i) / rayCount + glintProgress * Math.PI * 0.5
    const rayX = pos.x + Math.cos(angle) * rayLength
    const rayY = glintY + Math.sin(angle) * rayLength
    
    k.drawLine({
      p1: k.vec2(pos.x, glintY),
      p2: k.vec2(rayX, rayY),
      width: rayWidth,
      color: k.rgb(255, 255, 255),
      opacity: glintOpacity * 0.6
    })
  }
}

