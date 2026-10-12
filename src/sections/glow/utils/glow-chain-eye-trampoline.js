import { CFG } from '../../../cfg.js'
import { getChainBuoyEyePos } from './glow-chain-buoy.js'
import * as Sound from '../../../utils/sound.js'

//
// Cap colliders for the two leftmost stalk-eyes. A landing bounces the hero
// toward the next step: second eye from the left, then the first, then the
// shore-tree branch.
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
const CHAIN_EYE_CAP_Y_SLACK = 10
const CHAIN_EYE_LAUNCH_MIN_VEL_Y = -40
const PLATFORM_HIDE_X = -500
const PLATFORM_HIDE_Y = -5000

export const CHAIN_EYE_ROLE_SECOND = 'chainTrampSecond'
export const CHAIN_EYE_ROLE_FIRST = 'chainTrampFirst'

/**
 * Invisible pads for the two leftmost stalk-eye trampolines.
 * @param {Object} k - Kaplay inst
 * @returns {{ secondPad: Object, firstPad: Object }}
 */
export function createPads(k) {
  return {
    secondPad: makePad(k),
    firstPad: makePad(k)
  }
}

/**
 * True once the colour world (and the shore-tree branch) is open.
 * @param {Object} zones - Glow zones
 * @returns {boolean}
 */
export function isChainEyeTrampCollidersLive(zones) {
  return Boolean(zones?.colorWorld)
}

/**
 * Syncs cap pads to the live stalk-eye positions.
 * @param {Object} inst - Glow level inst
 */
export function syncChainEyeTrampPads(inst) {
  const chain = inst.chainEyeTramp
  if (!chain || !inst.chainBuoys) return
  const live = isChainEyeTrampCollidersLive(inst.zones)
  chain.second.active = live
  chain.first.active = live
  const char = inst.heroInst?.character
  if (inst.chainEyeBounceAir && char?.isGrounded?.()) {
    const platform = char.curPlatform?.()
    platform !== chain.secondPad && platform !== chain.firstPad && (inst.chainEyeBounceAir = null)
  }
  syncOneChainEyePad(inst, chain.second, chain.secondPad, CHAIN_EYE_ROLE_SECOND)
  syncOneChainEyePad(inst, chain.first, chain.firstPad, CHAIN_EYE_ROLE_FIRST)
}

/**
 * Late-pass bounce attempts for both stalk-eye caps.
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
  bounced = tryOneChainEyeBounce(inst, chain.second, chain.secondPad, hero, char, heroX) || bounced
  bounced = tryOneChainEyeBounce(inst, chain.first, chain.firstPad, hero, char, heroX) || bounced
  return bounced
}

/**
 * Builds runtime state for the two stalk-eye trampolines.
 * @param {Object} zones - Glow zones
 * @returns {Object}
 */
export function createChainEyeTrampStates(zones) {
  const live = isChainEyeTrampCollidersLive(zones)
  return {
    second: { role: CHAIN_EYE_ROLE_SECOND, active: live, cooldown: 0, x: 0, capTopY: 0 },
    first: { role: CHAIN_EYE_ROLE_FIRST, active: live, cooldown: 0, x: 0, capTopY: 0 }
  }
}

function makePad(k) {
  return k.add([
    k.rect(CHAIN_EYE_PAD_W, CHAIN_EYE_PAD_H),
    k.pos(PLATFORM_HIDE_X, PLATFORM_HIDE_Y),
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
  const velY = char?.vel?.y ?? 0
  const onCap = char && isHeroAtChainEyeCap(heroX, footY, state, char, pad)
  const bounceAir = inst.chainEyeBounceAir === role
  //
  // Never park the cap while the hero rises through the eye column from the
  // ground — only when he is on the pad, in post-bounce air, or descending
  // onto the cap from above.
  //
  const descendingOntoCap = shouldChainEyePadCatchHero(heroX, footY, velY, state)
  if (onCap || bounceAir || descendingOntoCap) {
    pad.pos.x = state.x
    pad.pos.y = state.capTopY
    return
  }
  parkPad(char, pad)
}

function shouldChainEyePadCatchHero(heroX, footY, velY, state) {
  if (heroX == null || !state?.capTopY) return false
  if (Math.abs(heroX - state.x) >= CHAIN_EYE_NEAR_X) return false
  if (velY < CHAIN_EYE_LAUNCH_MIN_VEL_Y) return false
  return footY >= state.capTopY - CHAIN_EYE_CAP_Y_SLACK &&
    footY <= state.capTopY + CHAIN_EYE_CAP_SNAP_BELOW
}

function isHeroAtChainEyeCap(heroX, footY, state, char, pad) {
  if (!state?.active || !state.capTopY) return false
  const yOk = footY >= state.capTopY - CHAIN_EYE_CAP_Y_SLACK &&
    footY <= state.capTopY + CHAIN_EYE_CAP_SNAP_BELOW
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
  if ((char.vel?.y ?? 0) < CHAIN_EYE_LAUNCH_MIN_VEL_Y) return false
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
  return true
}

function parkPad(char, pad) {
  if (!pad) return
  const platform = char?.curPlatform?.()
  platform === pad && char.jump?.(1)
  pad.pos.x = PLATFORM_HIDE_X
  pad.pos.y = PLATFORM_HIDE_Y
}
