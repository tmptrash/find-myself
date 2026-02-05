import { CFG } from '../cfg.js'
import * as Hero from '../../../components/hero.js'
import * as Sound from '../../../utils/sound.js'
import { get, set } from '../../../utils/progress.js'
//
// Spike parameters
//
const DIGIT_COUNT = 40
const FAKE_DIGIT_COUNT = 4  // Last 4 digits are fake (no collision)
const FONT_SIZE = 36
const MIN_Y_OFFSET = -3
const MAX_Y_OFFSET = 3
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
 * @param {string} config.currentLevel - Current level name for restart
 * @param {number} [config.digitCount] - Number of digits to create (default: DIGIT_COUNT)
 * @param {number} [config.fakeDigitCount] - Number of fake digits at the end (default: FAKE_DIGIT_COUNT)
 * @param {Object} [config.sfx] - Sound instance for glint effects
 * @returns {Object} Time spikes instance
 */
export function create(config) {
  const { k, startX, endX, y, hero, currentLevel, digitCount = DIGIT_COUNT, fakeDigitCount = FAKE_DIGIT_COUNT, sfx = null, levelIndicator = null } = config
  
  const spacing = (endX - startX) / (digitCount - 1)
  const spikes = []
  const fakeSpikes = []
  //
  // Create spikes along the line
  //
  for (let i = 0; i < digitCount; i++) {
    const x = startX + i * spacing
    const yOffset = MIN_Y_OFFSET + Math.random() * (MAX_Y_OFFSET - MIN_Y_OFFSET)
    const rotation = MIN_ROTATION + Math.random() * (MAX_ROTATION - MIN_ROTATION)
    //
    // Last fakeDigitCount digits are fake (no collision, drawn in front)
    //
    const isFake = i >= digitCount - fakeDigitCount
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
    hero,
    currentLevel,
    levelIndicator
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
      outlineComponents.push(k.z(16))
    } else {
      outlineComponents.push(k.z(16))
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
    k.color(135, 169, 189)  // Steel blue color
  ]
  //
  // Real spikes have collision and are in front of city background
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
      k.z(16),  // In front of city background (15.5) but behind hero (20)
      SPIKE_TAG
    )
  } else {
    //
    // Fake spikes have no collision and are in front of city background
    //
    components.push(
      k.z(16)  // In front of city background (15.5) but behind hero (20)
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
    k.z(17),  // Above spike (16) but below hero (20)
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
  // Save references before death animation
  //
  const savedSfx = inst.hero.sfx
  const savedLevelIndicator = inst.levelIndicator
  const savedK = inst.k
  const savedCurrentLevel = inst.currentLevel
  //
  // 1. Stop subtitle sound immediately if playing
  //
  Sound.stopSubtitleSound()
  //
  // 2. Trigger death animation
  //
  Hero.death(inst.hero, () => {
    //
    // 3. After death particles dispersed, minimal pause before life effects
    //
    savedK.wait(0.1, () => {
      //
      // 4. Lower all level sounds (ambient, background music)
      //
      if (savedSfx && savedSfx.audioContext) {
        const ctx = savedSfx.audioContext
        //
        // Fade out ambient and other sounds quickly
        //
        if (savedSfx.ambientGain) {
          savedSfx.ambientGain.gain.setValueAtTime(savedSfx.ambientGain.gain.value, ctx.currentTime)
          savedSfx.ambientGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2)
        }
      }
      //
      // Stop or fade all background music tracks
      //
      Sound.fadeOutAllMusic()
      //
      // 5. Increment life score and show all effects
      //
      const currentScore = get('lifeScore', 0)
      const newScore = currentScore + 1
      set('lifeScore', newScore)
      
      if (savedLevelIndicator && savedLevelIndicator.lifeImage && savedLevelIndicator.lifeImage.sprite && savedLevelIndicator.lifeImage.sprite.exists()) {
        //
        // Update score text and remove old outline
        //
        if (savedLevelIndicator.updateLifeScore) {
          savedLevelIndicator.updateLifeScore(newScore)
        }
        //
        // Play life sound
        //
        Sound.playLifeSound(savedK)
        //
        // Flash life image red aggressively (20 flashes = 1 second, faster)
        //
        const originalColor = savedLevelIndicator.lifeImage.sprite.color
        flashLifeImageSaved(savedK, savedLevelIndicator, originalColor, 0)
        //
        // Create particles around life score
        //
        createLifeScoreParticles(savedK, savedLevelIndicator)
      }
      //
      // 6. Wait 0.8 seconds for effects to be visible, then reload
      //
      savedK.wait(0.8, () => {
        savedK.go(savedCurrentLevel)
      })
    })
  })
}
function flashLifeImageSaved(k, levelIndicator, originalColor, count) {
  if (!levelIndicator || !levelIndicator.lifeImage || !levelIndicator.lifeImage.sprite || !levelIndicator.lifeImage.sprite.exists()) {
    return
  }
  if (count >= 20) {
    levelIndicator.lifeImage.sprite.color = originalColor
    return
  }
  //
  // Aggressive flashing - bright red to white
  //
  levelIndicator.lifeImage.sprite.color = count % 2 === 0 ? k.rgb(255, 0, 0) : k.rgb(255, 255, 255)
  k.wait(0.05, () => flashLifeImageSaved(k, levelIndicator, originalColor, count + 1))
}
function createLifeScoreParticles(k, levelIndicator) {
  if (!levelIndicator || !levelIndicator.lifeImage || !levelIndicator.lifeImage.sprite || !levelIndicator.lifeImage.sprite.exists()) {
    return
  }
  
  const lifeImageX = levelIndicator.lifeImage.sprite.pos.x
  const lifeImageY = levelIndicator.lifeImage.sprite.pos.y
  const particleCount = 15
  
  for (let i = 0; i < particleCount; i++) {
    const angle = (Math.PI * 2 * i) / particleCount
    const speed = 80 + Math.random() * 40
    const lifetime = 0.8 + Math.random() * 0.4
    const size = 4 + Math.random() * 4
    
    const particle = k.add([
      k.rect(size, size),
      k.pos(lifeImageX, lifeImageY),
      k.color(255, 0, 0),
      k.opacity(1),
      k.z(CFG.visual.zIndex.ui + 10),
      k.anchor('center'),
      k.fixed()
    ])
    
    const velocityX = Math.cos(angle) * speed
    const velocityY = Math.sin(angle) * speed
    let age = 0
    
    particle.onUpdate(() => {
      const dt = k.dt()
      age += dt
      
      particle.pos.x += velocityX * dt
      particle.pos.y += velocityY * dt
      particle.opacity = 1 - (age / lifetime)
      
      if (age >= lifetime && particle.exists && particle.exists()) {
        k.destroy(particle)
      }
    })
  }
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

