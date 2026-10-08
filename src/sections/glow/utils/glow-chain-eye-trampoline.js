import { CFG } from '../../../cfg.js'
import { getChainBuoyEyePos } from './glow-chain-buoy.js'
import * as Sound from '../../../utils/sound.js'

//
// Chain-eye cap colliders — smaller than mushroom trampolines.
//
const CHAIN_EYE_PAD_W = 22
const CHAIN_EYE_PAD_HALF = CHAIN_EYE_PAD_W / 2
const CHAIN_EYE_HERO_HALF = 15
const CHAIN_EYE_CAP_STAND_HALF = CHAIN_EYE_PAD_HALF + CHAIN_EYE_HERO_HALF
const CHAIN_EYE_CAP_SNAP_BELOW = 44
const CHAIN_EYE_PAD_H = 10
const CHAIN_EYE_TRAMP_COOLDOWN = 0.4
const CHAIN_EYE_TRAMP_BOOST_MULT = 1.85
const CHAIN_EYE_FOOT_DETECT_Y = 38
const CHAIN_EYE_NEAR_X = 72
const PLATFORM_HIDE_Y = -5000

export const CHAIN_EYE_ROLE_MIDDLE = 'chainTrampMiddle'
export const CHAIN_EYE_ROLE_LEFT = 'chainTrampLeft'

/**
 * Invisible pads for the two fixed chain-eye trampolines (middle + left).
 * @param {Object} k - Kaplay inst
 */
export function createPads(k) {
  return {
    middlePad: makePad(k),
    leftPad: makePad(k)
  }
}

/**
 * True when the right mushroom trampoline is on screen — chain-eye caps bounce too.
 * @param {Object} zones - Glow zones
 */
export function isChainEyeTrampCollidersLive(zones) {
  return Boolean(zones?.colorWorld || (zones?.eyesCollected && zones?.rightTrampRevealed))
}

/**
 * Fixed L-chain layout: left eye (high) — eyeStep — middle eye (lower) — mushStep — right tramp.
 * @param {number} trampX - Right mushroom trampoline centre X
 * @param {number} floorY - Main ground line
 * @param {number} eyeStepX - Horizontal gap between the two chain-eye caps
 * @param {number} leftEyeExtraLeft - Extra west offset for the left cap only
 * @param {number} mushStepX - Gap from middle eye to the right mushroom cap
 * @param {number} pairShiftLeft - Extra west offset for both eyes (mushroom stays put)
 * @param {number} segmentLen - Stalk segment length (must match buoy bake)
 * @param {number} leftSegments - Left stalk segments (more = higher eye)
 * @param {number} middleSegments - Middle stalk segments
 * @param {number} platAboveEye - L log Y offset above left eye cap
 * @param {number} platLeftGap - L log X gap left of left eye
 * @param {number} platShiftLeft - Extra west offset for L log + spikes
 * @param {number} logW - L log width
 */
export function computeGlowChainTrampLayout(
  trampX,
  floorY,
  eyeStepX,
  leftEyeExtraLeft,
  mushStepX,
  pairShiftLeft,
  segmentLen,
  leftSegments,
  middleSegments,
  platAboveEye,
  platLeftGap,
  platShiftLeft,
  logW
) {
  const middleX = trampX - mushStepX - pairShiftLeft
  const leftX = middleX - eyeStepX - leftEyeExtraLeft
  const middleEyeY = floorY - middleSegments * segmentLen
  const leftEyeY = floorY - leftSegments * segmentLen
  const lPlatY = leftEyeY - platAboveEye
  const lPlatX = leftX - platLeftGap - logW - platShiftLeft
  return { middleX, leftX, middleEyeY, leftEyeY, lPlatX, lPlatY }
}

/**
 * Syncs cap pads to the live chain-buoy eye positions.
 * @param {Object} inst - Glow level inst
 */
export function syncChainEyeTrampPads(inst) {
  const chain = inst.chainEyeTramp
  if (!chain || !inst.chainBuoys) return
  syncOneChainEyePad(inst, chain.middle, chain.middlePad, CHAIN_EYE_ROLE_MIDDLE)
  syncOneChainEyePad(inst, chain.left, chain.leftPad, CHAIN_EYE_ROLE_LEFT)
}

/**
 * Late-pass bounce attempts for both chain-eye caps.
 * @param {Object} inst - Glow level inst
 * @returns {boolean} True if a bounce fired this frame
 */
export function tryChainEyeTrampBounces(inst) {
  const chain = inst.chainEyeTramp
  if (!chain || !inst.chainBuoys) return false
  if (!isChainEyeTrampCollidersLive(inst.zones)) return false
  const hero = inst.heroInst
  const char = hero?.character
  if (!char?.pos) return false
  const heroX = char.pos.x
  let bounced = false
  bounced = tryOneChainEyeBounce(inst, chain.middle, chain.middlePad, hero, char, heroX) || bounced
  bounced = tryOneChainEyeBounce(inst, chain.left, chain.leftPad, hero, char, heroX) || bounced
  return bounced
}

/**
 * Reveal L log + spikes when the hero touches the left chain-eye cap on the valid chain.
 * @param {Object} inst - Glow level inst
 * @param {number} heroX - Hero X
 * @param {number} footY - Hero foot Y
 */
export function maybeRevealLPlatOnLeftChainEyeTouch(inst, heroX, footY) {
  const chain = inst.chainEyeTramp?.left
  if (!chain?.active || inst.zones.lPlatRevealed) return
  if (!inst.lChainFromMiddleEye) return
  if (!isHeroAtChainEyeCap(heroX, footY, chain, inst.heroInst?.character, inst.chainEyeTramp?.leftPad)) return
  inst.onLeftChainEyeTouchForLPlat?.()
}

//
// Private helpers
//
function makePad(k) {
  return k.add([
    k.rect(CHAIN_EYE_PAD_W, CHAIN_EYE_PAD_H),
    k.pos(-500, PLATFORM_HIDE_Y),
    k.anchor('center'),
    k.area(),
    k.body({ isStatic: true }),
    k.opacity(0),
    CFG.game.platformName
  ])
}

function findChainBuoy(inst, role) {
  return inst.chainBuoys?.buoys?.find(b => b.chainTrampRole === role) ?? null
}

function syncOneChainEyePad(inst, state, pad, role) {
  if (!state || !pad) return
  const buoy = findChainBuoy(inst, role)
  const char = inst.heroInst?.character
  if (!buoy || !state.active) {
    state.capTopY = 0
    parkPad(char, pad)
    return
  }
  const eye = getChainBuoyEyePos(buoy, inst.chainBuoys.time ?? 0)
  state.x = eye.x
  state.capTopY = eye.y - 4
  const heroX = char?.pos?.x
  const footY = char ? char.pos.y + CHAIN_EYE_FOOT_DETECT_Y : 0
  const onCap = char && isHeroAtChainEyeCap(heroX, footY, state, char, pad)
  const near = heroX != null && Math.abs(heroX - state.x) < CHAIN_EYE_NEAR_X
  if (onCap || near || inst.chainEyeBounceAir === role) {
    pad.pos.x = state.x
    pad.pos.y = state.capTopY
    return
  }
  parkPad(char, pad)
}

function isHeroAtChainEyeCap(heroX, footY, state, char, pad) {
  if (!state?.active || !state.capTopY) return false
  const capTopY = state.capTopY
  const yOk = footY >= capTopY - 10 && footY <= capTopY + CHAIN_EYE_CAP_SNAP_BELOW
  if (!yOk) return false
  //
  // Standing anywhere on the invisible pad counts — the hero hitbox overhangs
  // the eye, so an X test narrower than pad-half + body-half leaves a dead edge.
  //
  if (pad && char?.curPlatform?.() === pad) return true
  return Math.abs(heroX - state.x) < CHAIN_EYE_CAP_STAND_HALF
}

function tryOneChainEyeBounce(inst, state, pad, hero, char, heroX) {
  if (!state?.active) return false
  if (state.cooldown > 0) {
    state.cooldown -= inst.k.dt()
    return false
  }
  const footY = char.pos.y + CHAIN_EYE_FOOT_DETECT_Y
  if (!isHeroAtChainEyeCap(heroX, footY, state, char, pad)) return false
  if ((char.vel?.y ?? 0) < -40) return false
  const launch = Math.round(CFG.game.jumpForce * CHAIN_EYE_TRAMP_BOOST_MULT)
  if (typeof char.jump === 'function') char.jump(launch)
  else char.vel.y = -launch
  char.vel.x = 0
  state.cooldown = CHAIN_EYE_TRAMP_COOLDOWN
  inst.chainEyeBounceAir = state.role
  hero.wasJumping = true
  hero.jumpPhase = 'jumping'
  hero.jumpCeilingBonk = false
  hero.postLandAirLock = 0
  hero.landSquashTimer = 0
  hero.isSquashing = false
  hero.squashTimer = 0
  hero.canJump = false
  inst.sound && !inst.sound._glowSfxMuted && Sound.playJumpSound(inst.sound)
  if (state.role === CHAIN_EYE_ROLE_MIDDLE) {
    inst.lChainFromMiddleEye = true
    inst.zones.chainMiddleEyeStepped = true
    inst.onChainMiddleEyeStepped?.()
  }
  if (state.role === CHAIN_EYE_ROLE_LEFT) {
    inst.zones.chainLeftEyeStepped = true
    inst.onChainLeftEyeStepped?.()
    maybeRevealLPlatOnLeftChainEyeTouch(inst, heroX, footY)
  }
  return true
}

function parkPad(char, pad) {
  if (!pad) return
  const platform = char?.curPlatform?.()
  platform === pad && char.jump?.(1)
  pad.pos.x = -500
  pad.pos.y = PLATFORM_HIDE_Y
}

/**
 * Builds runtime state objects for middle/left chain-eye trampolines.
 * @param {Object} zones - Glow zones
 */
export function createChainEyeTrampStates(zones) {
  const live = isChainEyeTrampCollidersLive(zones)
  return {
    middle: { role: CHAIN_EYE_ROLE_MIDDLE, active: live, cooldown: 0, x: 0, capTopY: 0 },
    left: { role: CHAIN_EYE_ROLE_LEFT, active: live, cooldown: 0, x: 0, capTopY: 0 }
  }
}

export function refreshChainEyeTrampActiveFlags(inst) {
  const chain = inst.chainEyeTramp
  if (!chain) return
  const live = isChainEyeTrampCollidersLive(inst.zones)
  chain.middle.active = live
  chain.left.active = live
}
