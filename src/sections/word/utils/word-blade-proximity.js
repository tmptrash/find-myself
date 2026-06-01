import * as Blades from '../components/blades.js'
import * as Sound from '../../../utils/sound.js'

//
// AAA proximity — metallic rattle (existing) plus vertical stretch on each blade
//
const DEFAULT_PROXIMITY_RANGE = 140
const DEFAULT_RATTLE_COOLDOWN = 0.32

/**
 * Tracks hero distance to blade letters: plays rattle and drives stretch visual
 * @param {Object} config - Configuration
 * @param {Object} config.k - Kaplay instance
 * @param {Object} config.hero - Hero instance
 * @param {Array<Object>} config.bladeInsts - Blades instances to watch
 * @param {Object} [config.sound] - Sound instance
 * @param {number} [config.proximityRange] - Distance in pixels for full effect
 * @param {number} [config.rattleCooldown] - Seconds between rattle sounds
 * @param {number} [config.volumeScale=1] - Extra volume multiplier at closest point
 * @returns {Object} Proximity tracker instance
 */
export function create(config) {
  const {
    k,
    hero,
    bladeInsts,
    sound = null,
    proximityRange = DEFAULT_PROXIMITY_RANGE,
    rattleCooldown = DEFAULT_RATTLE_COOLDOWN,
    volumeScale = 1
  } = config
  const inst = {
    k,
    hero,
    bladeInsts,
    sound,
    proximityRange,
    rattleCooldown,
    volumeScale,
    cooldown: 0
  }
  k.onUpdate(() => onUpdate(inst))
  return inst
}

//
// Per-blade proximity drives stretch; loudest rattle uses peak proximity
//
function onUpdate(inst) {
  const heroPos = inst.hero?.character?.pos
  if (!heroPos) return
  let peakProximity = 0
  for (const bladeInst of inst.bladeInsts) {
    if (!bladeInst?.blade?.exists?.()) continue
    const dx = heroPos.x - bladeInst.blade.pos.x
    const dy = heroPos.y - bladeInst.blade.pos.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const prox = dist < inst.proximityRange ? 1 - dist / inst.proximityRange : 0
    Blades.updateProximityVisual(bladeInst, prox)
    prox > peakProximity && (peakProximity = prox)
  }
  if (!inst.sound || peakProximity <= 0) return
  inst.cooldown -= inst.k.dt()
  if (inst.cooldown > 0) return
  Sound.playBladeProximityRattle(inst.sound, peakProximity, inst.volumeScale)
  inst.cooldown = inst.rattleCooldown
}
