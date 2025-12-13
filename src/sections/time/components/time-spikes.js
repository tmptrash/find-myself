import { CFG } from '../cfg.js'
import * as Hero from '../../../components/hero.js'
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
 * @returns {Object} Time spikes instance
 */
export function create(config) {
  const { k, startX, endX, y, hero } = config
  
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
  // Create components based on whether spike is fake or real
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
    k.color(192, 192, 192),  // Light gray
    k.outline(2, k.rgb(0, 0, 0))  // Black outline
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
    // Fake spikes have no collision and are in front of hero
    //
    components.push(
      k.z(25)  // Above hero (20) and platforms (15)
    )
  }
  
  const spike = k.add(components)
  
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

