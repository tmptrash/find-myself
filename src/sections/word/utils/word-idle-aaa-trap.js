import { CFG } from '../cfg.js'
import * as Blades from '../components/blades.js'
import * as Hero from '../../../components/hero.js'
import * as Sound from '../../../utils/sound.js'
import * as TouchControls from '../../../utils/touch-controls.js'
import { isAnyKeyDown } from '../../../utils/helper.js'

//
// Idle AAA rise trap — word level 1
//
const IDLE_STAND_THRESHOLD = 1
const MOVE_VEL_THRESHOLD = 20
const AAA_RISE_SPEED = 380
const AAA_FADE_IN = 0.05
const AAA_BURY_DEPTH = 28
const AAA_HOLD_DURATION = 0.45
const AAA_Z = CFG.visual.zIndex.player + 2
const HERO_COLLISION_WIDTH = 30
const HERO_COLLISION_HEIGHT = 69
const HERO_COLLISION_OFFSET_Y = 3

/**
 * Creates idle stand trap: AAA rises from under the hero after standing still
 * @param {Object} config - Configuration
 * @param {Object} config.k - Kaplay instance
 * @param {Object} config.hero - Hero instance
 * @param {number} config.floorY - Floor platform top Y
 * @param {Function} config.onHit - Death callback when AAA hits the hero (receives blades inst)
 * @param {Object} [config.sfx] - Sound instance
 * @param {boolean} [config.enabled=true] - Whether the trap is active; pass false to delay activation
 * @returns {Object} Trap instance
 */
export function create(config) {
  const { k, hero, floorY, onHit, sfx, enabled = true } = config
  const inst = {
    k,
    hero,
    floorY,
    onHit,
    sfx,
    enabled,
    idleTimer: 0,
    attackBlades: null,
    riseDistance: 0,
    riseMax: 0,
    fadeTimer: 0,
    holdTimer: 0,
    attackActive: false,
    hitTriggered: false,
    rising: false,
    frozen: false
  }
  k.onUpdate(() => onUpdate(inst))
  return inst
}

/**
 * Activates a previously disabled AAA trap
 * @param {Object} inst - Trap instance returned by create()
 */
export function enable(inst) {
  inst.enabled = true
}

//
// Tracks idle time and drives the rising AAA attack
//
function onUpdate(inst) {
  if (!inst.enabled) return
  if (inst.frozen) return
  if (inst.attackActive) {
    onUpdateAttack(inst)
    return
  }
  if (!canTrackIdle(inst)) {
    inst.idleTimer = 0
    return
  }
  if (isHeroMoving(inst)) {
    inst.idleTimer = 0
    return
  }
  inst.idleTimer += inst.k.dt()
  inst.idleTimer >= IDLE_STAND_THRESHOLD && startAttack(inst)
}

//
// Hero must be spawned, grounded, and not in a terminal state
//
function canTrackIdle(inst) {
  const ch = inst.hero?.character
  if (!ch?.exists?.() || !inst.hero.isSpawned || inst.hero.isAnnihilating || inst.hero.isDying) return false
  if (inst.hero.controlsDisabled) return false
  return ch.isGrounded?.()
}

//
// Movement via velocity, virtual buttons, or keyboard resets the idle timer
//
function isHeroMoving(inst) {
  const ch = inst.hero.character
  if (Math.abs(ch.vel?.x || 0) > MOVE_VEL_THRESHOLD || inst.hero.isSquashing) return true
  if (TouchControls.needsTouchControls()) {
    return TouchControls.isMoveLeftHeld()
      || TouchControls.isMoveRightHeld()
      || isAnyKeyDown(inst.k, CFG.controls.moveLeft)
      || isAnyKeyDown(inst.k, CFG.controls.moveRight)
  }
  return isAnyKeyDown(inst.k, CFG.controls.moveLeft) || isAnyKeyDown(inst.k, CFG.controls.moveRight)
}

//
// Spawns floor AAA blades under the hero and begins the rise animation
//
function startAttack(inst) {
  inst.idleTimer = 0
  inst.attackActive = true
  inst.riseDistance = 0
  inst.fadeTimer = 0
  inst.holdTimer = 0
  inst.hitTriggered = false
  inst.rising = true
  const hx = inst.hero.character.pos.x
  inst.attackBlades = Blades.create({
    k: inst.k,
    x: hx,
    y: getBladeStartCenterY(inst.floorY),
    hero: inst.hero,
    orientation: Blades.ORIENTATIONS.FLOOR,
    onHit: () => onAttackHit(inst),
    sfx: inst.sfx,
    color: CFG.visual.colors.blades,
    bladeCount: 3,
    disableAnimation: true,
    zIndex: AAA_Z
  })
  inst.riseMax = AAA_BURY_DEPTH
  inst.attackBlades.blade.opacity = 1
  inst.attackBlades.isVisible = true
  inst.attackBlades.collisionEnabled = true
  syncBladeDrawer(inst.attackBlades)
  inst.sfx && Sound.playPyramidStackSound(inst.sfx)
  inst.sfx && Sound.playBladeSound(inst.sfx)
}

//
// Rises AAA toward the hero; overlap is checked every frame during the rise
//
function onUpdateAttack(inst) {
  const blades = inst.attackBlades
  if (!blades?.blade?.exists?.()) {
    endAttack(inst)
    return
  }
  const dt = inst.k.dt()
  if (inst.rising) {
    inst.fadeTimer += dt
    const fadeT = Math.min(1, inst.fadeTimer / AAA_FADE_IN)
    blades.blade.opacity = fadeT
    inst.riseDistance += AAA_RISE_SPEED * dt
    const progress = Math.min(1, inst.riseDistance / inst.riseMax)
    const centerY = getBladeStartCenterY(inst.floorY) - progress * inst.riseMax
    blades.blade.pos.y = centerY
    blades.baseY = centerY
    syncBladeDrawer(blades)
    checkHeroOverlap(inst)
    if (inst.riseDistance >= inst.riseMax) {
      inst.rising = false
      blades.blade.opacity = 1
      blades.blade.pos.y = getBladeRestCenterY(inst.floorY)
      blades.baseY = blades.blade.pos.y
      syncBladeDrawer(blades)
      inst.holdTimer = 0
    }
    return
  }
  blades.blade.opacity = 1
  inst.holdTimer += dt
  checkHeroOverlap(inst)
  inst.holdTimer >= AAA_HOLD_DURATION && endAttack(inst)
}

//
// Keeps the glint drawer aligned with the moving blade
//
function syncBladeDrawer(blades) {
  if (!blades?.glintDrawer) return
  blades.glintDrawer.pos.x = blades.blade.pos.x
  blades.glintDrawer.pos.y = blades.blade.pos.y
}

//
// Kills the hero when AAA connects
//
function onAttackHit(inst) {
  if (inst.hitTriggered || inst.hero?.isAnnihilating || inst.hero?.isDying) return
  inst.hitTriggered = true
  freezeBladeAtRest(inst)
  Hero.death(inst.hero, () => {})
  inst.onHit?.(inst.attackBlades)
}

//
// Snaps AAA so its bottom rests on the platform and keeps it visible after death
//
function freezeBladeAtRest(inst) {
  inst.rising = false
  inst.attackActive = false
  inst.frozen = true
  const blades = inst.attackBlades
  if (!blades?.blade?.exists?.()) return
  const centerY = getBladeRestCenterY(inst.floorY)
  blades.blade.pos.x = inst.hero.character.pos.x
  blades.blade.pos.y = centerY
  blades.baseX = blades.blade.pos.x
  blades.baseY = centerY
  blades.blade.opacity = 1
  blades.isVisible = true
  blades.wasShownOnDeath = true
  blades.collisionEnabled = false
  syncBladeDrawer(blades)
  Blades.show(blades)
}

//
// Resting center Y — letter baseline sits on the platform top
//
function getBladeRestCenterY(floorY) {
  return Blades.getFloorBladeRestCenterY(floorY)
}

//
// Buried start center Y — mostly hidden below the platform top
//
function getBladeStartCenterY(floorY) {
  return Blades.getFloorBladeRestCenterY(floorY) + AAA_BURY_DEPTH
}

//
// Manual overlap pass — rise finishes before Kaplay fade/collide would trigger
//
function checkHeroOverlap(inst) {
  if (inst.hitTriggered) return
  const ch = inst.hero?.character
  if (!ch?.exists?.() || inst.hero?.isAnnihilating || inst.hero?.isDying) return
  const blades = inst.attackBlades
  const heroLeft = ch.pos.x - HERO_COLLISION_WIDTH / 2
  const heroRight = ch.pos.x + HERO_COLLISION_WIDTH / 2
  const heroTop = ch.pos.y - HERO_COLLISION_HEIGHT / 2 + HERO_COLLISION_OFFSET_Y
  const heroBottom = ch.pos.y + HERO_COLLISION_HEIGHT / 2 + HERO_COLLISION_OFFSET_Y
  const bx = blades.blade.pos.x
  const by = blades.blade.pos.y
  const bladeHalfW = blades.bladeWidth / 2
  const bladeLeft = bx - bladeHalfW
  const bladeRight = bx + bladeHalfW
  const bladeTop = by - Blades.getFloorBladeTopOffset()
  const bladeBottom = by + Blades.getFloorBladeBottomOffset() * 0.2
  const overlapsX = heroRight > bladeLeft && heroLeft < bladeRight
  const overlapsY = heroBottom > bladeTop && heroTop < bladeBottom
  overlapsX && overlapsY && onAttackHit(inst)
}

//
// Clears the active AAA attack so idle tracking can resume
//
function endAttack(inst) {
  inst.attackBlades?.blade?.exists?.() && inst.k.destroy(inst.attackBlades.blade)
  inst.attackBlades?.glintDrawer?.exists?.() && inst.k.destroy(inst.attackBlades.glintDrawer)
  inst.attackBlades = null
  inst.attackActive = false
  inst.riseDistance = 0
  inst.riseMax = 0
  inst.fadeTimer = 0
  inst.holdTimer = 0
  inst.hitTriggered = false
  inst.rising = false
}
