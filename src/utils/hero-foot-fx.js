import { CFG } from '../cfg.js'
import { getRGB, parseHex } from './helper.js'
import * as Sound from './sound.js'

//
// Default landing / run-start dust used by platformer sections (not glow).
//
const DUST_PARTICLE_COUNT = 8
const DUST_PARTICLE_SIZE = 4
const DUST_PARTICLE_SPEED = 200
const DUST_PARTICLE_LIFETIME = 0.4
const FOOTPRINT_LIFETIME = 2.5
const FOOTPRINT_OFFSET_X = 4
const FOOTPRINT_OFFSET_Y = 2
const COLLISION_HEIGHT = 69
const COLLISION_OFFSET_Y = 3
const RUN_FRAME_COUNT = 8

/**
 * Foot Y in world space from hero inst collision box.
 * @param {Object} inst - Hero inst
 * @returns {number}
 */
export function heroFootWorldY(inst) {
  return inst.character.pos.y + (COLLISION_HEIGHT / 2) + COLLISION_OFFSET_Y
}

/**
 * Landing dust burst at the hero's feet.
 * @param {Object} inst - Hero inst
 */
export function spawnHeroLandingDust(inst) {
  spawnHeroDustParticles(inst, inst.character.pos.x, heroFootWorldY(inst), 'splash')
}

/**
 * Run-start dust burst behind the hero.
 * @param {Object} inst - Hero inst
 * @param {number} direction - -1 left, 1 right
 */
export function spawnHeroRunStartDust(inst, direction) {
  spawnHeroDustParticles(inst, inst.character.pos.x, heroFootWorldY(inst), 'run', direction)
}

/**
 * Shared dust particle spawn for landing and run-start.
 * @param {Object} inst - Hero inst
 * @param {number} footX
 * @param {number} footY
 * @param {'splash'|'run'} type
 * @param {number} [direction=1]
 */
export function spawnHeroDustParticles(inst, footX, footY, type = 'splash', direction = 1) {
  const { k } = inst
  for (let i = 0; i < DUST_PARTICLE_COUNT; i++) {
    let side
    if (type === 'splash') {
      side = i < DUST_PARTICLE_COUNT / 2 ? -1 : 1
    } else {
      side = -direction
    }
    const angle = k.rand(5, 30) * (Math.PI / 180)
    const speed = k.rand(DUST_PARTICLE_SPEED * 0.8, DUST_PARTICLE_SPEED * 1.5)
    const vx = Math.cos(angle) * speed * side
    const vy = -Math.sin(angle) * speed
    const offsetX = side * k.rand(5, 15)
    const outlineColor = getRGB(k, CFG.visual.colors.outline)
    let particleR
    let particleG
    let particleB
    if (inst.dustColor) {
      const [baseR, baseG, baseB] = parseHex(inst.dustColor)
      particleR = Math.max(0, Math.min(255, baseR + k.rand(-5, 5)))
      particleG = Math.max(0, Math.min(255, baseG + k.rand(-8, 8)))
      particleB = Math.max(0, Math.min(255, baseB + k.rand(-10, 5)))
    } else {
      particleR = 150
      particleG = 150
      particleB = 150
    }
    const particle = k.add([
      k.rect(DUST_PARTICLE_SIZE, DUST_PARTICLE_SIZE),
      k.pos(footX + offsetX, footY - 2),
      k.color(particleR, particleG, particleB),
      k.outline(1.5, k.rgb(outlineColor.r, outlineColor.g, outlineColor.b)),
      k.opacity(0.9),
      k.anchor('center'),
      k.z(50)
    ])
    particle.vx = vx
    particle.vy = vy
    particle.lifetime = 0
    particle.maxLifetime = DUST_PARTICLE_LIFETIME
    particle.onUpdate(() => onUpdateDustParticle(particle, k))
  }
}

/**
 * Alternating footprint at the hero's current foot position.
 * @param {Object} inst - Hero inst
 */
export function spawnHeroFootprint(inst) {
  if (inst.suppressFootprints) return
  if (!inst.character?.pos) return
  if (!inst.footprints) inst.footprints = []
  const footY = heroFootWorldY(inst) + FOOTPRINT_OFFSET_Y
  inst.lastFootprintFoot = -inst.lastFootprintFoot
  const footX = inst.character.pos.x + inst.lastFootprintFoot * FOOTPRINT_OFFSET_X
  inst.footprints.push({
    x: footX,
    y: footY,
    life: FOOTPRINT_LIFETIME
  })
}

/**
 * Ages footprint trail entries.
 * @param {Object} inst - Hero inst
 */
export function updateHeroFootprints(inst) {
  const dt = inst.k.dt()
  const arr = inst.footprints
  if (!arr?.length) return
  for (let i = arr.length - 1; i >= 0; i--) {
    arr[i].life -= dt
    arr[i].life <= 0 && arr.splice(i, 1)
  }
}

/**
 * Draws fading footprint ellipses.
 * @param {Object} k - Kaplay inst
 * @param {Object} inst - Hero inst
 */
export function drawHeroFootprints(k, inst) {
  const arr = inst.footprints
  if (!arr?.length) return
  const outline = getRGB(k, CFG.visual.colors.outline)
  for (const fp of arr) {
    const alpha = Math.max(0, fp.life / FOOTPRINT_LIFETIME) * 0.35
    k.drawEllipse({
      pos: k.vec2(fp.x, fp.y),
      radiusX: 5,
      radiusY: 2,
      color: k.rgb(outline.r, outline.g, outline.b),
      opacity: alpha
    })
  }
}

/**
 * Default run contact frame step sound + footprint.
 * @param {Object} inst - Hero inst
 * @param {number} runFrame
 */
export function playHeroRunStepFx(inst, runFrame) {
  if (runFrame % (RUN_FRAME_COUNT / 2) !== 0) return
  inst.sfx && inst.onPlayStepSound?.(inst)
  inst.onSpawnFootprint?.(inst)
}

/**
 * Default platform landing audio + dust.
 * @param {Object} inst - Hero inst
 * @param {boolean} playJumpLandSound
 */
export function playHeroLandFx(inst, playJumpLandSound) {
  inst.onPlayLandSound?.(inst)
  playJumpLandSound && inst.onPlayJumpLandSound?.(inst)
  !inst.suppressDust && inst.onSpawnLandingDust?.(inst)
}

//
// Private dust particle update
//
function onUpdateDustParticle(particle, k) {
  particle.lifetime += k.dt()
  particle.moveBy(particle.vx * k.dt(), particle.vy * k.dt())
  particle.vy += 600 * k.dt()
  particle.vx *= 0.97
  const progress = particle.lifetime / particle.maxLifetime
  particle.opacity = 0.9 * (1 - progress)
  particle.lifetime >= particle.maxLifetime && k.destroy(particle)
}

/**
 * Wires default foot callbacks when the hero opts into built-in foot FX.
 * @param {Object} inst - Hero inst
 * @param {Object} cfg - create() config slice
 */
export function bindDefaultHeroFootFx(inst, cfg) {
  if (cfg.footFx === false) {
    inst.onSpawnLandingDust = null
    inst.onSpawnRunStartDust = null
    inst.onSpawnFootprint = null
    inst.onPlayStepSound = null
    inst.onPlayLandSound = null
    inst.onPlayJumpLandSound = null
    return
  }
  inst.onSpawnLandingDust = inst.onSpawnLandingDust || (h => spawnHeroLandingDust(h))
  inst.onSpawnRunStartDust = inst.onSpawnRunStartDust || ((h, dir) => spawnHeroRunStartDust(h, dir))
  inst.onSpawnFootprint = inst.onSpawnFootprint || (h => spawnHeroFootprint(h))
  inst.onPlayStepSound = inst.onPlayStepSound || (h => {
    h.sfx && Sound.playStepSound(h.sfx, h.stepSoundScene)
  })
  inst.onPlayLandSound = inst.onPlayLandSound || (h => {
    h.sfx && Sound.playLandSound(h.sfx, h.stepSoundScene)
  })
  inst.onPlayJumpLandSound = inst.onPlayJumpLandSound || (h => {
    h.sfx && Sound.playJumpSound(h.sfx, h.stepSoundScene)
  })
}
