import { CFG } from '../cfg.js'
import { parseHex } from '../../../utils/helper.js'
import * as Hero from '../../../components/hero.js'
import * as Sound from '../../../utils/sound.js'

//
// Touch level 3 ending: outer arms hang down, then arc inward from below into a V clasp.
// Shoulder / leg-junction offsets match idle hero sprite (96px canvas, center anchor).
//
const HAND_HOLD_PAUSE = 3.0
const HAND_REACH_DURATION = 0.85
const ARM_THICKNESS = 10
const ARM_RADIUS = 4
const OUTLINE_THICKNESS = 2
const OUTER_SHOULDER_X_OFFSET = 20
const SHOULDER_Y_OFFSET = -8
const LEG_JUNCTION_Y_OFFSET = 18
const ARM_HANG_LENGTH = 34
const CLASP_HAND_RADIUS = 6
const HEART_SIZE = 16
const HEART_Y_ABOVE_CLASP = 18
const HEART_COLOR_HEX = '#E84855'
const HEART_PULSE_SPEED = 5.0
const HEART_PULSE_AMP = 0.16
const HEART_OUTLINE = 1.5
const HEARTBEAT_INTERVAL = 1.0
const HAND_DRAW_Z = CFG.visual.zIndex.ui + 5
const ARC_SAMPLE_COUNT = 20
const REACH_CONTROL_X_BLEND = 0.42
const REACH_CONTROL_Y_BLEND = 0.72

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
  Hero.setEyesLookingAtPartner(heroInst, antiChar.pos.x, antiChar.pos.y)
  Hero.setEyesLookingAtPartner(antiInst, heroChar.pos.x, heroChar.pos.y)
  const state = { timer: 0, phase: 'reach', drawObj: null, updateLoop: null, lastHeartbeatTime: 0 }
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
  antiChar?.exists?.() && Hero.setEyesLookingAtPartner(antiInst, heroChar.pos.x, heroChar.pos.y)
  Hero.setEyesLookingAtPartner(heroInst, antiChar?.pos?.x ?? targetPos.x, antiChar?.pos?.y ?? targetPos.y)
  if (state.phase === 'reach' && state.timer >= HAND_REACH_DURATION) {
    state.phase = 'hold'
    state.timer = 0
    playHandHoldHeartbeat(heroInst, state, true)
  } else if (state.phase === 'hold') {
    playHandHoldHeartbeat(heroInst, state, false)
  }
  if (state.phase === 'hold' && state.timer >= HAND_HOLD_PAUSE) {
    state.updateLoop?.cancel?.()
    state.drawObj?.destroy?.()
    antiChar?.exists?.() && antiChar.destroy()
    onComplete?.(targetPos)
  }
}
//
// Menu-style heartbeat while the clasped heart is visible (same interval as menu hover).
//
function playHandHoldHeartbeat(heroInst, state, force) {
  const sfx = heroInst.sfx
  if (!sfx) return
  const now = heroInst.k.time()
  if (!force && now - state.lastHeartbeatTime < HEARTBEAT_INTERVAL) return
  Sound.playHeartbeatSound(sfx)
  state.lastHeartbeatTime = now
}
//
// Player-facing outer arms: left arm when hero is on the left, mirrored when on the right.
//
function getVArmLayout(heroPos, antiPos) {
  const heroLeftOfAnti = heroPos.x < antiPos.x
  //
  // Each character reaches with the outer arm on the camera/player side
  //
  const heroUsesLeftArm = heroLeftOfAnti
  const antiUsesLeftArm = !heroLeftOfAnti
  const heroShoulder = getOuterShoulder(heroPos, heroUsesLeftArm)
  const antiShoulder = getOuterShoulder(antiPos, antiUsesLeftArm)
  const claspX = (heroPos.x + antiPos.x) / 2
  const claspY = (heroPos.y + antiPos.y) / 2 + LEG_JUNCTION_Y_OFFSET
  return { heroShoulder, antiShoulder, claspX, claspY, heroLeftOfAnti, heroUsesLeftArm, antiUsesLeftArm }
}
//
// Outer shoulder on the player-facing side (left side for hero when hero is on the left).
//
function getOuterShoulder(charPos, useLeftShoulder) {
  return {
    x: charPos.x + (useLeftShoulder ? -OUTER_SHOULDER_X_OFFSET : OUTER_SHOULDER_X_OFFSET),
    y: charPos.y + SHOULDER_Y_OFFSET
  }
}
//
// Quadratic bezier point at parameter t (0–1).
//
function sampleQuadratic(p0, p1, p2, t) {
  const u = 1 - t
  return {
    x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
    y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y
  }
}
//
// Hang point straight below the shoulder; clasp sits at the V vertex between bodies.
//
function getArmHangEnd(shoulder, usesLeftArm) {
  return {
    x: shoulder.x + (usesLeftArm ? -3 : 3),
    y: shoulder.y + ARM_HANG_LENGTH
  }
}
//
// Blends hang pose (progress 0) into an inward reach arc (progress 1).
//
function getReachArmGeometry(shoulder, hangEnd, claspX, claspY, progress) {
  const clasp = { x: claspX, y: claspY }
  const end = {
    x: hangEnd.x + (clasp.x - hangEnd.x) * progress,
    y: hangEnd.y + (clasp.y - hangEnd.y) * progress
  }
  const hangControl = { x: shoulder.x, y: shoulder.y + ARM_HANG_LENGTH * 0.58 }
  const reachControl = {
    x: shoulder.x + (clasp.x - shoulder.x) * REACH_CONTROL_X_BLEND,
    y: shoulder.y + (clasp.y - shoulder.y) * REACH_CONTROL_Y_BLEND
  }
  const control = {
    x: hangControl.x + (reachControl.x - hangControl.x) * progress,
    y: hangControl.y + (reachControl.y - hangControl.y) * progress
  }
  return { start: shoulder, control, end }
}
//
// Draws a smooth arced arm by chaining rounded pill segments along a bezier.
//
function drawReachArm(k, geometry, bodyHex) {
  const { start, control, end } = geometry
  const steps = ARC_SAMPLE_COUNT
  let prev = sampleQuadratic(start, control, end, 0)
  for (let i = 1; i <= steps; i++) {
    const t = i / steps
    const curr = sampleQuadratic(start, control, end, t)
    drawPillArm(k, prev.x, prev.y, curr.x, curr.y, bodyHex)
    prev = curr
  }
}
//
// Outer arms start lowered, then pull toward each other from below into a V clasp.
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
  const { heroShoulder, antiShoulder, claspX, claspY, heroLeftOfAnti, heroUsesLeftArm, antiUsesLeftArm } = getVArmLayout(heroPos, antiPos)
  const heroColor = heroInst.bodyColor || CFG.visual.colors.hero.body
  const antiColor = antiInst.bodyColor || CFG.visual.colors.antiHero.body
  const heroHang = getArmHangEnd(heroShoulder, heroUsesLeftArm)
  const antiHang = getArmHangEnd(antiShoulder, antiUsesLeftArm)
  drawReachArm(k, getReachArmGeometry(heroShoulder, heroHang, claspX, claspY, progress), heroColor)
  drawReachArm(k, getReachArmGeometry(antiShoulder, antiHang, claspX, claspY, progress), antiColor)
  if (progress >= 1) {
    drawClaspHands(k, claspX, claspY, heroColor, antiColor, heroLeftOfAnti)
    drawHeart(k, claspX, claspY - HEART_Y_ABOVE_CLASP, HEART_SIZE, k.time())
  }
}
//
// Rounded pill arm segment with black outline (matches hero sprite arm style).
//
function drawPillArm(k, x1, y1, x2, y2, bodyHex) {
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.max(2, Math.sqrt(dx * dx + dy * dy))
  if (len < 1.5) return
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
//
// Small joined hands at the clasp point (outline + two-tone fill).
//
function drawClaspHands(k, claspX, claspY, heroColorHex, antiColorHex, heroLeftOfAnti) {
  const [hr, hg, hb] = parseHex(heroColorHex)
  const [ar, ag, ab] = parseHex(antiColorHex)
  const heroHandX = claspX - CLASP_HAND_RADIUS * 0.35
  const antiHandX = claspX + CLASP_HAND_RADIUS * 0.35
  const leftHandColor = heroLeftOfAnti ? k.rgb(hr, hg, hb) : k.rgb(ar, ag, ab)
  const rightHandColor = heroLeftOfAnti ? k.rgb(ar, ag, ab) : k.rgb(hr, hg, hb)
  k.drawCircle({
    pos: k.vec2(claspX, claspY),
    radius: CLASP_HAND_RADIUS + OUTLINE_THICKNESS,
    color: k.rgb(0, 0, 0)
  })
  k.drawCircle({
    pos: k.vec2(heroLeftOfAnti ? heroHandX : antiHandX, claspY),
    radius: CLASP_HAND_RADIUS * 0.85,
    color: leftHandColor
  })
  k.drawCircle({
    pos: k.vec2(heroLeftOfAnti ? antiHandX : heroHandX, claspY),
    radius: CLASP_HAND_RADIUS * 0.85,
    color: rightHandColor
  })
}
//
// Red heart with a black outline layer behind the fill (no interior stripe).
//
function drawHeart(k, x, y, baseSize, pulseTime) {
  const [r, g, b] = parseHex(HEART_COLOR_HEX)
  const fill = k.rgb(r, g, b)
  const black = k.rgb(0, 0, 0)
  const pulse = 1 + HEART_PULSE_AMP * Math.sin(pulseTime * HEART_PULSE_SPEED)
  const size = baseSize * pulse
  const lobeR = size * 0.36
  const lobeY = y - size * 0.1
  const lobeX = size * 0.22
  const tipY = y + size * 0.44
  const wedgeTopY = lobeY + lobeR * 0.35
  //
  // Outline — slightly larger shapes behind the fill
  //
  k.drawCircle({
    pos: k.vec2(x - lobeX, lobeY),
    radius: lobeR + HEART_OUTLINE,
    color: black
  })
  k.drawCircle({
    pos: k.vec2(x + lobeX, lobeY),
    radius: lobeR + HEART_OUTLINE,
    color: black
  })
  k.drawPolygon({
    pts: [
      k.vec2(x, tipY + HEART_OUTLINE),
      k.vec2(x - size * 0.5 - HEART_OUTLINE, wedgeTopY),
      k.vec2(x + size * 0.5 + HEART_OUTLINE, wedgeTopY)
    ],
    color: black
  })
  //
  // Solid red fill — wedge overlaps lobe bottoms so nothing shows through
  //
  k.drawCircle({
    pos: k.vec2(x - lobeX, lobeY),
    radius: lobeR,
    color: fill
  })
  k.drawCircle({
    pos: k.vec2(x + lobeX, lobeY),
    radius: lobeR,
    color: fill
  })
  k.drawPolygon({
    pts: [
      k.vec2(x, tipY),
      k.vec2(x - size * 0.46, wedgeTopY),
      k.vec2(x + size * 0.46, wedgeTopY)
    ],
    color: fill
  })
}
