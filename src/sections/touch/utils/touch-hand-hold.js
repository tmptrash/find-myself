import { CFG } from '../cfg.js'
import { parseHex } from '../../../utils/helper.js'
import * as Hero from '../../../components/hero.js'

//
// Touch level 3 ending: heroes reach for each other, hold hands, then annihilate.
//
const HAND_HOLD_PAUSE = 3.0
const HAND_REACH_DURATION = 0.55
const ARM_THICKNESS = 10
const ARM_RADIUS = 4
const OUTLINE_THICKNESS = 2
const SHOULDER_OFFSET_X = 15
const SHOULDER_OFFSET_Y = 8
const HAND_MEET_Y_OFFSET = 10
const HAND_DRAW_Z = CFG.visual.zIndex.ui + 5

/**
 * Runs the touch L3 hand-hold sequence before annihilation particles.
 * @param {Object} heroInst - Playable hero instance
 * @param {Function} onComplete - Called with frozen anti-hero world position after the hold
 */
export function begin(heroInst, onComplete) {
  const antiInst = heroInst.antiHero
  const heroChar = heroInst.character
  const antiChar = antiInst?.character
  if (!heroChar?.exists?.() || !antiChar?.exists?.()) {
    onComplete?.(null)
    return
  }
  const { k } = heroInst
  const targetPos = k.vec2(antiChar.pos.x, antiChar.pos.y)
  heroInst.controlsDisabled = true
  antiChar.paused = true
  heroChar.vel && (heroChar.vel.x = 0)
  heroInst.isRunning = false
  heroInst.wasJumping = false
  heroInst.jumpPhase = 'none'
  Hero.setArmsHidden(heroInst, true)
  Hero.setArmsHidden(antiInst, true)
  Hero.forceIdleFacingPartner(heroInst, antiChar.pos.x)
  Hero.forceIdleFacingPartner(antiInst, heroChar.pos.x)
  const state = { timer: 0, phase: 'reach', drawObj: null, updateLoop: null }
  state.drawObj = k.add([
    k.z(HAND_DRAW_Z),
    {
      draw() {
        onDrawHandHold(heroInst, antiInst, state)
      }
    }
  ])
  state.updateLoop = k.onUpdate(() => onUpdateHandHold(heroInst, antiInst, state, targetPos, onComplete))
}
//
// Advances reach/hold timing and finishes by destroying the anti-hero.
//
function onUpdateHandHold(heroInst, antiInst, state, targetPos, onComplete) {
  const heroChar = heroInst.character
  const antiChar = antiInst?.character
  if (!heroChar?.exists?.()) return
  state.timer += heroInst.k.dt()
  antiChar?.exists?.() && Hero.setEyesLookingAt(antiInst, heroChar.pos.x, heroChar.pos.y)
  Hero.setEyesLookingAt(heroInst, antiChar?.pos?.x ?? targetPos.x, antiChar?.pos?.y ?? targetPos.y)
  if (state.phase === 'reach' && state.timer >= HAND_REACH_DURATION) {
    state.phase = 'hold'
    state.timer = 0
  } else if (state.phase === 'hold' && state.timer >= HAND_HOLD_PAUSE) {
    state.updateLoop?.cancel?.()
    state.drawObj?.destroy?.()
    antiChar?.exists?.() && kDestroy(antiChar)
    onComplete?.(targetPos)
  }
}
//
// Safe destroy wrapper
//
function kDestroy(obj) {
  obj.destroy?.()
}
//
// Draws reaching arms between hero and anti-hero in hero sprite style.
//
function onDrawHandHold(heroInst, antiInst, state) {
  const heroChar = heroInst.character
  const antiChar = antiInst?.character
  if (!heroChar?.exists?.()) return
  const k = heroInst.k
  const heroPos = heroChar.pos
  const antiPos = antiChar?.exists?.() ? antiChar.pos : heroPos
  const progress = state.phase === 'hold'
    ? 1
    : Math.min(1, state.timer / HAND_REACH_DURATION)
  const heroLeft = heroPos.x < antiPos.x
  const meetX = heroPos.x + (antiPos.x - heroPos.x) * 0.55
  const meetY = (heroPos.y + antiPos.y) / 2 + HAND_MEET_Y_OFFSET
  const heroShoulderX = heroPos.x + (heroLeft ? SHOULDER_OFFSET_X : -SHOULDER_OFFSET_X)
  const antiShoulderX = antiPos.x + (heroLeft ? -SHOULDER_OFFSET_X : SHOULDER_OFFSET_X)
  const heroShoulderY = heroPos.y + SHOULDER_OFFSET_Y
  const antiShoulderY = antiPos.y + SHOULDER_OFFSET_Y
  const heroReachX = heroShoulderX + (meetX - heroShoulderX) * progress
  const antiReachX = antiShoulderX + (meetX - antiShoulderX) * progress
  const heroColor = heroInst.bodyColor || CFG.visual.colors.hero.body
  const antiColor = antiInst.bodyColor || CFG.visual.colors.antiHero.body
  drawReachArm(k, heroShoulderX, heroShoulderY, heroReachX, meetY, heroColor)
  drawReachArm(k, antiShoulderX, antiShoulderY, antiReachX, meetY, antiColor)
}
//
// One horizontal reaching arm: black outline pill + body fill (hero proportions).
//
function drawReachArm(k, x1, y1, x2, y2, bodyHex) {
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.max(4, Math.sqrt(dx * dx + dy * dy))
  const angle = Math.atan2(dy, dx) * (180 / Math.PI)
  const [r, g, b] = parseHex(bodyHex)
  k.drawRect({
    pos: k.vec2(x1, y1),
    width: len + OUTLINE_THICKNESS,
    height: ARM_THICKNESS + OUTLINE_THICKNESS * 2,
    anchor: 'left',
    angle,
    color: k.rgb(0, 0, 0),
    radius: ARM_RADIUS + OUTLINE_THICKNESS
  })
  k.drawRect({
    pos: k.vec2(x1, y1),
    width: len,
    height: ARM_THICKNESS,
    anchor: 'left',
    angle,
    color: k.rgb(r, g, b),
    radius: ARM_RADIUS
  })
}
