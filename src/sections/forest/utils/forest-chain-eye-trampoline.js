import { CFG } from '../../../cfg.js'
import { getChainBuoyEyePos, triggerBuoyLandBlink } from './forest-chain-buoy.js'
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
 * Syncs cap pads to the live stalk-eye positions.
 * @param {Object} inst - Forest level inst
 */
export function syncChainEyeTrampPads(inst) {
  const chain = inst.chainEyeTramp
  if (!chain || !inst.chainBuoys) return
  const char = inst.heroInst?.character
  if (inst.chainEyeBounceAir && char?.isGrounded?.()) {
    const platform = char.curPlatform?.()
    platform !== chain.secondPad && platform !== chain.firstPad && (inst.chainEyeBounceAir = null)
  }
  syncOneChainEyePad(inst, chain.second, chain.secondPad, CHAIN_EYE_ROLE_SECOND)
  syncOneChainEyePad(inst, chain.first, chain.firstPad, CHAIN_EYE_ROLE_FIRST)
  updateStalkEyeLandBlinks(inst)
}

/**
 * Late-pass bounce attempts for both stalk-eye caps.
 * @param {Object} inst - Forest level inst
 * @returns {boolean} True if a bounce fired this frame
 */
export function tryChainEyeTrampBounces(inst) {
  const chain = inst.chainEyeTramp
  if (!chain || !inst.chainBuoys) return false
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
 * @returns {Object}
 */
export function createChainEyeTrampStates() {
  return {
    second: { role: CHAIN_EYE_ROLE_SECOND, active: true, cooldown: 0, x: 0, capTopY: 0, wasOnCap: false },
    first: { role: CHAIN_EYE_ROLE_FIRST, active: true, cooldown: 0, x: 0, capTopY: 0, wasOnCap: false }
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
  inst.sound && !inst.sound._forestSfxMuted && Sound.playJumpSound(inst.sound)
  return true
}

function parkPad(char, pad) {
  if (!pad) return
  const platform = char?.curPlatform?.()
  platform === pad && char.jump?.(1)
  pad.pos.x = PLATFORM_HIDE_X
  pad.pos.y = PLATFORM_HIDE_Y
}
//
// Closes stalk-eyes when the hero's feet first touch the cap (chain tramp
// pair and the tall prize eye east of the mushroom).
//
function updateStalkEyeLandBlinks(inst) {
  const char = inst.heroInst?.character
  if (!char?.pos || !inst.chainBuoys) return
  const heroX = char.pos.x
  const footY = char.pos.y + CHAIN_EYE_FOOT_DETECT_Y
  const time = inst.chainBuoys.time ?? 0
  const chain = inst.chainEyeTramp
  chain && tryStalkEyeLandBlink(findChainBuoy(inst, CHAIN_EYE_ROLE_SECOND), chain.secondPad, chain.second, heroX, footY, char, time)
  chain && tryStalkEyeLandBlink(findChainBuoy(inst, CHAIN_EYE_ROLE_FIRST), chain.firstPad, chain.first, heroX, footY, char, time)
  const prize = inst.chainBuoys.buoys?.find(b => b.prizeEye)
  prize && tryStalkEyeLandBlink(prize, null, prize, heroX, footY, char, time)
}
function tryStalkEyeLandBlink(buoy, pad, latch, heroX, footY, char, time) {
  if (!buoy || !latch) return
  const cap = buoyCapState(buoy, time)
  const onCap = isHeroAtChainEyeCap(heroX, footY, cap, char, pad)
  const was = latch.wasOnCap ?? latch.wasHeroOnCap ?? false
  if (latch.wasOnCap !== undefined) latch.wasOnCap = onCap
  else latch.wasHeroOnCap = onCap
  onCap && !was && triggerBuoyLandBlink(buoy)
}
function buoyCapState(buoy, time) {
  const eye = getChainBuoyEyePos(buoy, time)
  return { active: true, x: eye.x, capTopY: eye.y - 4 }
}
