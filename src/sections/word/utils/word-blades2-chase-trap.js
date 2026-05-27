import { CFG } from '../cfg.js'
import * as Blades from '../components/blades.js'
import * as BonusHero from '../../touch/components/bonus-hero.js'
import * as TouchControls from '../../../utils/touch-controls.js'
import { isAnyKeyDown } from '../../../utils/helper.js'
import { get } from '../../../utils/progress.js'

//
// Blades2 horizontal chase trap — word level 0 life deduction trap
//
const STAND_TIME = 1
const MOVE_VEL_THRESHOLD = 18
const MOVE_DIST_THRESHOLD = 24
const RUSH_SPEED = 820
const KILL_DIST = 42
const RUSH_ARRIVE_DIST = 8
//
// Hero feet offset — matches bonus-hero.js standing detection
//
const HERO_FEET_OFFSET = 38
const BLADE_REACH_TOLERANCE = 6

/**
 * Creates blades2 chase trap: AAA block rushes toward hero after standing still
 * @param {Object} config - Configuration
 * @param {Object} config.k - Kaplay instance
 * @param {Object} config.hero - Hero instance
 * @param {Object} config.bladesInst - Existing blades2 instance to move
 * @param {string} config.deductFlag - localStorage key set when life trap is active
 * @param {number} config.minX - Left bound for rush target
 * @param {number} config.maxX - Right bound for rush target
 * @param {Object} [config.bonusHeroInst] - Hidden bonus platform inst for safe-zone detection
 * @param {Function} config.onHit - Death callback when rush connects
 * @returns {Object} Chase trap instance
 */
export function create(config) {
  const { k, hero, bladesInst, deductFlag, minX, maxX, bonusHeroInst, onHit } = config
  const inst = {
    k,
    hero,
    bladesInst,
    deductFlag,
    minX,
    maxX,
    bonusHeroInst,
    onHit,
    hasRun: false,
    standTimer: 0,
    phase: 'idle',
    rushTargetX: 0,
    frozen: false,
    lastHeroX: hero.character?.pos?.x ?? 0
  }
  k.onUpdate(() => onUpdate(inst))
  return inst
}

//
// Drives idle stand timer and horizontal rush toward hero snapshot position
//
function onUpdate(inst) {
  const { hero, bladesInst } = inst
  if (!hero?.character?.pos || !bladesInst?.blade?.exists?.()) return
  if (!isTrapActive(inst)) {
    bladesInst.collisionEnabled = true
    return
  }
  const heroChar = hero.character
  const heroX = heroChar.pos.x
  const onBonus = isHeroOnBonusPlatform(inst)
  //
  // Bonus block is above floor blades — disable collision and cancel rush while hero stands there
  //
  bladesInst.collisionEnabled = !onBonus
  if (inst.frozen || hero.isDying) {
    bladesInst.isRushing = false
    Blades.resetBladeGlint(bladesInst)
    return
  }
  if (!canTrackTrap(inst)) {
    inst.standTimer = 0
    if (inst.phase === 'rush') {
      inst.phase = 'idle'
      bladesInst.isRushing = false
      Blades.resetBladeGlint(bladesInst)
    }
    return
  }
  const dt = inst.k.dt()
  markHeroHasRun(inst, heroX)
  if (onBonus) {
    bladesInst.isRushing = false
    Blades.resetBladeGlint(bladesInst)
    if (inst.phase === 'rush') {
      inst.phase = 'idle'
      inst.standTimer = 0
    }
    inst.lastHeroX = heroX
    return
  }
  //
  // Running resets the stand timer and cancels an in-progress rush
  //
  if (isHeroMoving(inst)) {
    inst.standTimer = 0
    if (inst.phase === 'rush') {
      inst.phase = 'idle'
      bladesInst.isRushing = false
      Blades.resetBladeGlint(bladesInst)
    }
    inst.lastHeroX = heroX
    return
  }
  //
  // Rush toward the spot where the hero stood when the timer expired
  //
  if (inst.phase === 'rush') {
    bladesInst.isRushing = true
    const bladeX = bladesInst.baseX
    const dir = inst.rushTargetX >= bladeX ? 1 : -1
    const nextX = bladeX + dir * RUSH_SPEED * dt
    bladesInst.baseX = dir > 0
      ? Math.min(nextX, inst.rushTargetX)
      : Math.max(nextX, inst.rushTargetX)
    syncBladeRushPosition(bladesInst)
    const heroGrounded = heroChar.isGrounded?.()
    heroGrounded
      && isHeroWithinBladeReach(heroChar, bladesInst)
      && Math.abs(heroX - bladesInst.baseX) < KILL_DIST
      && onRushHit(inst)
    if (inst.frozen || hero.isDying) return
    if (Math.abs(bladesInst.baseX - inst.rushTargetX) <= RUSH_ARRIVE_DIST) {
      finishRush(inst)
    }
    inst.lastHeroX = heroX
    return
  }
  //
  // Standing still after the first run — accumulate timer; blades stay idle
  //
  if (!inst.hasRun) {
    inst.lastHeroX = heroX
    return
  }
  bladesInst.isRushing = false
  Blades.resetBladeGlint(bladesInst)
  if (!isHeroStandingStill(inst)) {
    inst.standTimer = 0
    inst.lastHeroX = heroX
    return
  }
  inst.standTimer += dt
  inst.lastHeroX = heroX
  if (inst.standTimer >= STAND_TIME) {
    inst.phase = 'rush'
    inst.rushTargetX = Math.max(inst.minX, Math.min(heroX, inst.maxX))
    inst.standTimer = 0
  }
}

//
// Trap is armed once life deduction flag is set (matches red badge on life icon)
//
function isTrapActive(inst) {
  return !!get(inst.deductFlag, false)
}

//
// Hero must be spawned, grounded-capable, and not locked by intro UI
//
function canTrackTrap(inst) {
  const ch = inst.hero?.character
  if (!ch?.exists?.() || !inst.hero.isSpawned || inst.hero.isAnnihilating || inst.hero.isDying) return false
  if (inst.hero.controlsDisabled) return false
  return true
}

//
// Marks that the hero has started moving (required before the stand timer runs)
//
function markHeroHasRun(inst, heroX) {
  if (inst.hasRun) return
  if (isHeroMoving(inst)) {
    inst.hasRun = true
    return
  }
  Math.abs(heroX - inst.lastHeroX) >= MOVE_DIST_THRESHOLD && (inst.hasRun = true)
}

//
// True when the hero stands on the revealed bonus block
//
function isHeroOnBonusPlatform(inst) {
  return BonusHero.isHeroStandingOn(inst.bonusHeroInst, inst.hero)
}

//
// Floor AAA can only hit when hero feet are near the blade height
//
function isHeroWithinBladeReach(heroChar, bladesInst) {
  const heroFeetY = heroChar.pos.y + HERO_FEET_OFFSET
  const bladeStrikeY = bladesInst.baseY - Blades.getFloorBladeTopOffset()
  return heroFeetY >= bladeStrikeY - BLADE_REACH_TOLERANCE
}

//
// Movement via velocity, virtual buttons, keyboard, or jump squash resets idle
//
function isHeroMoving(inst) {
  const ch = inst.hero.character
  if (Math.abs(ch.vel?.x || 0) >= MOVE_VEL_THRESHOLD || inst.hero.isSquashing) return true
  if (TouchControls.needsTouchControls()) {
    return TouchControls.isMoveLeftHeld()
      || TouchControls.isMoveRightHeld()
      || isAnyKeyDown(inst.k, CFG.controls.moveLeft)
      || isAnyKeyDown(inst.k, CFG.controls.moveRight)
  }
  return isAnyKeyDown(inst.k, CFG.controls.moveLeft) || isAnyKeyDown(inst.k, CFG.controls.moveRight)
}

//
// True when the hero is grounded and not moving horizontally
//
function isHeroStandingStill(inst) {
  if (isHeroMoving(inst)) return false
  return inst.hero.character?.isGrounded?.() ?? false
}

//
// Rush reached the hero's snapshot position — stop and reset the cycle
//
function finishRush(inst) {
  inst.phase = 'idle'
  inst.standTimer = 0
  inst.bladesInst.isRushing = false
  Blades.resetBladeGlint(inst.bladesInst)
}

//
// Rush connects with a standing hero — freeze blades and trigger death
//
function onRushHit(inst) {
  const { hero, bladesInst } = inst
  if (hero.isDying || inst.frozen) return
  if (!hero.character?.isGrounded?.()) return
  if (isHeroOnBonusPlatform(inst)) return
  if (!isHeroWithinBladeReach(hero.character, bladesInst)) return
  inst.frozen = true
  inst.phase = 'idle'
  inst.standTimer = 0
  bladesInst.isRushing = false
  Blades.resetBladeGlint(bladesInst)
  syncBladeRushPosition(bladesInst)
  inst.onHit?.()
}

//
// Keeps blade and glint drawer aligned during rush movement
//
function syncBladeRushPosition(bladesInst) {
  bladesInst.blade.pos.x = bladesInst.baseX
  bladesInst.blade.pos.y = bladesInst.baseY
  if (!bladesInst.glintDrawer) return
  bladesInst.glintDrawer.pos.x = bladesInst.baseX
  bladesInst.glintDrawer.pos.y = bladesInst.baseY
}
