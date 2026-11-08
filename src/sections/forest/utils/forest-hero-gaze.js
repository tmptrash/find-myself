import * as Hero from '../../../components/hero.js'
import * as ChainBuoy from './forest-chain-buoy.js'
//
// The forest hero's only gaze guide: whenever he stands still within
// LOOK_REACH of a stalk-eye (chain buoy), he looks at the eye of the nearest
// one for LOOK_EYE_SEC, then straight at the player for LOOK_PLAYER_SEC, and
// repeats that while he stays. Anywhere else his eyes wander on their own.
//
const LOOK_REACH = 360             // Hero to stalk-eye cap (world px)
const LOOK_EYE_SEC = 4             // Looking at the nearest stalk-eye
const LOOK_PLAYER_SEC = 1          // Then straight at the player
const LOOK_CYCLE_SEC = LOOK_EYE_SEC + LOOK_PLAYER_SEC

/**
 * Creates the gaze guide.
 * @param {Object} cfg
 * @param {Object|null} cfg.buoys - Chain-buoy (stalk-eye) inst
 * @returns {Object} Gaze inst
 */
export function create(cfg) {
  return {
    buoys: cfg.buoys,
    timer: 0,
    playerSpot: { x: 0, y: 0 }
  }
}

/**
 * Points the hero's eyes for this frame: at the nearest stalk-eye in reach
 * and at the player in turn while he stands still, free otherwise. The
 * cycle starts over (at the stalk-eye) every time he stops near one.
 * @param {Object} inst - Gaze inst
 * @param {Object} hero - Hero inst
 * @param {boolean} still - Whether the hero stands still on a surface this frame
 */
export function onUpdate(inst, hero, still) {
  const pos = hero.character?.pos
  const eye = still && pos ? nearestStalkEye(inst, pos) : null
  inst.timer = eye ? (inst.timer + hero.k.dt()) % LOOK_CYCLE_SEC : 0
  Hero.setLookAtPos(hero, eye && lookSpot(inst, eye, pos))
}
//
// The stalk-eye while its share of the cycle lasts, then the hero's own
// position — the pupils centre, facing the player.
//
function lookSpot(inst, eye, pos) {
  if (inst.timer < LOOK_EYE_SEC) return eye
  inst.playerSpot.x = pos.x
  inst.playerSpot.y = pos.y
  return inst.playerSpot
}
//
// The swaying eye cap of the stalk-eye nearest the hero, if one is in reach.
//
function nearestStalkEye(inst, pos) {
  let best = null
  let bestDist = LOOK_REACH
  for (const buoy of inst.buoys?.buoys ?? []) {
    const eye = ChainBuoy.getChainBuoyEyePos(buoy, inst.buoys.time)
    const dist = Math.hypot(eye.x - pos.x, eye.y - pos.y)
    if (dist >= bestDist) continue
    best = eye
    bestDist = dist
  }
  return best
}
