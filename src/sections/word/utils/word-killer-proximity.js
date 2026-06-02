import * as Sound from '../../../utils/sound.js'

//
// Killer flying words — same metallic rattle and stretch as AAA blade letters
//
const DEFAULT_PROXIMITY_RANGE = 140
const DEFAULT_RATTLE_COOLDOWN = 0.32
const PROXIMITY_LERP_SPEED = 9
const PROXIMITY_STRETCH_Y = 0.22
const PROXIMITY_STRETCH_X = 0.1
const KILLER_VISIBLE_OPACITY = 0.5

/**
 * Tracks hero distance to killer flying words: plays rattle and drives stretch visual
 * @param {Object} config - Configuration
 * @param {Object} config.k - Kaplay instance
 * @param {Object} config.hero - Hero instance
 * @param {Array<Object>} config.killerLetters - Killer word entries from FlyingWords
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
    killerLetters,
    sound = null,
    proximityRange = DEFAULT_PROXIMITY_RANGE,
    rattleCooldown = DEFAULT_RATTLE_COOLDOWN,
    volumeScale = 1
  } = config
  const inst = {
    k,
    hero,
    killerLetters,
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
// Per-killer proximity drives stretch; loudest rattle uses peak proximity
//
function onUpdate(inst) {
  const heroPos = inst.hero?.character?.pos
  if (!heroPos) return
  let peakProximity = 0
  for (const letter of inst.killerLetters) {
    if (!letter?.textObj?.exists?.()) continue
    if (letter.spawnDelay > 0) continue
    const dx = heroPos.x - letter.textObj.pos.x
    const dy = heroPos.y - letter.textObj.pos.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const prox = dist < inst.proximityRange ? 1 - dist / inst.proximityRange : 0
    updateKillerProximityVisual(letter, prox, inst.k)
    prox > peakProximity && (peakProximity = prox)
  }
  if (!inst.sound || peakProximity <= 0) return
  inst.cooldown -= inst.k.dt()
  if (inst.cooldown > 0) return
  Sound.playBladeProximityRattle(inst.sound, peakProximity, inst.volumeScale)
  inst.cooldown = inst.rattleCooldown
}

//
// Smoothly approaches target proximity (0 far, 1 at word) for stretch visual
//
function updateKillerProximityVisual(letter, targetProximity, k) {
  const dt = k.dt()
  const t = Math.min(1, PROXIMITY_LERP_SPEED * dt)
  letter.proximityLevel = (letter.proximityLevel ?? 0) + (targetProximity - (letter.proximityLevel ?? 0)) * t
  const textObj = letter.textObj
  if (!textObj?.exists?.()) return
  const baseScale = letter.baseScale ?? 1
  if (textObj.opacity < KILLER_VISIBLE_OPACITY) {
    textObj.scale = k.vec2(baseScale, baseScale)
    letter.outlineTexts?.forEach((outline) => {
      outline.exists?.() && (outline.scale = k.vec2(baseScale, baseScale))
    })
    return
  }
  const p = letter.proximityLevel
  const sx = baseScale * (1 + p * PROXIMITY_STRETCH_X)
  const sy = baseScale * (1 + p * PROXIMITY_STRETCH_Y)
  textObj.scale = k.vec2(sx, sy)
  letter.outlineTexts?.forEach((outline) => {
    outline.exists?.() && (outline.scale = k.vec2(sx, sy))
  })
}
