import { CFG } from '../../../cfg.js'
import * as Tooltip from '../../../utils/tooltip.js'
import { drawMushroomToCanvas } from '../../../utils/draw-mushroom.js'
import { parseHex } from '../../../utils/helper.js'
import { GLOW_PAL, isGlowGrayExploreBeforeL } from './glow-palette.js'
import { glowUiHash } from './glow-ui-bake.js'
import { applyGlowFilmGrainToCanvas } from './glow-parallax-grain.js'
import * as SwampSpirit from '../components/swamp-spirit.js'
import { isGlowEyesGameplayUnlocked } from './glow-eye-intro.js'

//
// Pictorial nudge while the spirit's eyes are shut because the hero is far —
// a single mushroom, no letters (gray = black icon, post-L = colour).
//
const HINT_ICON_W = 44
const HINT_ICON_H = 40
const HINT_EYE_DX = 13
const HINT_EYE_PUPIL_R = 2.75
const HINT_STALK_ARM_LEN = 9
const HINT_STALK_ARM_DROP = 2.2
const HINT_STALK_ARM_WIDTH = 1.7
//
// Chain-buoy eyes inside the right-burrow hint bubble (not the mushroom icon layout).
//
const HINT_CHAIN_TOP_INSET = 14
const HINT_CHAIN_BASE_Y = 48
const HINT_CHAIN_STALK_LIFT = 4
const HINT_CHAIN_LEFT_EYE_DROP = 22
const HINT_CHAIN_RIGHT_EYE_DROP = 12
//
// Arc above the stalk-eyes — bow upward with even top inset inside the bubble.
//
const HINT_CHAIN_ARC_EYE_CLEARANCE = 17
const HINT_CHAIN_ARC_RADIUS_MUL = 1.02
const HINT_CHAIN_ARC_STROKE = 2
const HINT_CHAIN_ARC_HEAD_LEN = 7
const HINT_CHAIN_ARC_HEAD_ANGLE = 0.48
const HINT_CHAIN_ARC_TANGENT_EPS = 0.12
const HINT_CHAIN_ARC_HEAD_TRIM = 0.11
const HINT_ICON_CHAIN_W = 40
const HINT_ICON_CHAIN_H = HINT_CHAIN_TOP_INSET + HINT_CHAIN_BASE_Y + 12
const HINT_OFFSET_Y = -70
const HINT_MIN_RISE = 0.18
const SPIRIT_HINT_EYES_SHUT_DELAY = 2
const MUSH_CAP_W = 30
const MUSH_CAP_H = 11
const MUSH_STEM_W = 9
const MUSH_STEM_H = 15
const MUSH_BASE_Y = 34
const MUSH_CX = 22
const MONO_INK = '#000000'
const BUBBLE_BORDER_WIDTH = 3
const BUBBLE_CORNER_RADIUS = 10
const BUBBLE_PADDING_X = 14
const BUBBLE_PADDING_Y = 10
const POINTER_WIDTH = 12
const POINTER_HEIGHT = 10
const BUBBLE_BORDER_R = 20
const BUBBLE_BG_R = 245
const BUBBLE_BG_G = 242
const BUBBLE_BG_B = 235
const BUBBLE_BG_OPACITY = 0.92
const TOOLTIP_BAKE_PAD = 4
const SPRITE_KEY_PREFIX = 'glow-spirit-mush-'
//
// Extra slack so the hint hides as soon as the spirit leaves the playfield window.
//
const SPIRIT_VIEW_CULL_MARGIN = 40

/**
 * Steps the swamp-spirit proximity hint (create / hide bubble).
 * @param {Object} levelInst - Glow level inst
 * @param {Object} clampInset - Playfield inset for tooltip clamping
 */
export function syncSwampSpiritProximityHint(levelInst, clampInset) {
  if (!levelInst) return
  const spirit = levelInst.swampSpirit
  tickSpiritHintEyesShutDelay(levelInst, spirit)
  const show = isSpiritProximityHintEligible(levelInst, spirit) && levelInst._spiritHintEyesShutReady
  const tip = levelInst._swampSpiritProximityHint
  if (!show) {
    tip && destroySwampSpiritProximityHint(levelInst)
    return
  }
  if (tip) {
    const wantColored = !isSpiritHintMonochrome(levelInst)
    const wantRightEyes = spirit.burrowPhase === 'right'
    const wantIconW = wantRightEyes ? HINT_ICON_CHAIN_W : HINT_ICON_W
    const wantIconH = wantRightEyes ? HINT_ICON_CHAIN_H : HINT_ICON_H
    if (tip._spiritHintColored !== wantColored ||
      tip._spiritHintAtRightBurrow !== wantRightEyes ||
      tip.activeTarget?.iconW !== wantIconW ||
      tip.activeTarget?.iconH !== wantIconH) {
      tip._spiritHintColored = wantColored
      tip._spiritHintAtRightBurrow = wantRightEyes
      tip.activeTarget && (tip.activeTarget.iconW = wantIconW)
      tip.activeTarget && (tip.activeTarget.iconH = wantIconH)
      tip._spiritHintBakeKey = null
    }
    return
  }
  const k = levelInst.k
  const head = spirit.chain[spirit.chain.length - 1]
  const target = {
    x: () => head.x,
    y: () => head.y,
    width: 48,
    height: 96,
    text: '',
    iconW: spirit.burrowPhase === 'right' ? HINT_ICON_CHAIN_W : HINT_ICON_W,
    iconH: spirit.burrowPhase === 'right' ? HINT_ICON_CHAIN_H : HINT_ICON_H,
    offsetY: HINT_OFFSET_Y,
    forceAbove: true,
    pointerWorldX: () => head.x,
    pointerWorldY: () => head.y + 28
  }
  const hintTip = Tooltip.create({
    k,
    targets: [target],
    forceVisible: true,
    clampInset,
    customDraw: drawSpiritMushTooltip
  })
  hintTip.activeTarget = target
  hintTip.opacity = 1
  hintTip._spiritHintColored = !isSpiritHintMonochrome(levelInst)
  hintTip._spiritHintAtRightBurrow = spirit.burrowPhase === 'right'
  levelInst._swampSpiritProximityHint = hintTip
}

/**
 * Tears down the spirit proximity hint tooltip.
 * @param {Object} levelInst - Glow level inst
 */
export function destroySwampSpiritProximityHint(levelInst) {
  const tip = levelInst?._swampSpiritProximityHint
  tip && Tooltip.destroy(tip)
  if (!levelInst) return
  levelInst._swampSpiritProximityHint = null
  levelInst._spiritHintEyesShutSince = null
  levelInst._spiritHintEyesShutReady = false
}
//
// Hint may appear only after eyes stay shut for SPIRIT_HINT_EYES_SHUT_DELAY.
//
function tickSpiritHintEyesShutDelay(levelInst, spirit) {
  if (!spirit?.eyesShut || !isSpiritProximityHintEligible(levelInst, spirit)) {
    levelInst._spiritHintEyesShutSince = null
    levelInst._spiritHintEyesShutReady = false
    return
  }
  const now = levelInst.k.time()
  levelInst._spiritHintEyesShutSince == null && (levelInst._spiritHintEyesShutSince = now)
  levelInst._spiritHintEyesShutReady =
    now - levelInst._spiritHintEyesShutSince >= SPIRIT_HINT_EYES_SHUT_DELAY
}

function isSpiritProximityHintEligible(levelInst, spirit) {
  const z = spirit?.zones
  if (!z?.gCollected && !isGlowEyesGameplayUnlocked(z)) return false
  //
  // Hint runs at the left and right spirit burrows; gone after the right trampoline opens.
  //
  if (SwampSpirit.isSpiritRetired(spirit)) return false
  if (levelInst.dialogOpen || levelInst.letterCaptionActive) return false
  if (levelInst.drowning || levelInst.deathHandled || levelInst.touchDeathHandled) return false
  if (levelInst._inGlowPitCave) return false
  if (spirit.rise < HINT_MIN_RISE) return false
  if (spirit.state === 'hidden' || spirit.state === 'hiding') return false
  if (spirit.obj?.hidden) return false
  if (!isSpiritInCameraView(levelInst, spirit)) return false
  const pos = spirit.hero?.character?.pos
  if (!pos) return false
  const hero = { x: pos.x, y: pos.y }
  return SwampSpirit.isHeroFarEnoughToShutEyes(spirit, hero)
}
//
// False when the spirit's head / burrow AABB is fully outside the camera window.
//
function isSpiritInCameraView(levelInst, spirit) {
  const cam = levelInst.camera
  const k = levelInst.k
  if (!cam || !k) return true
  const head = spirit.chain[spirit.chain.length - 1]
  const groundY = spirit.groundAt(spirit.holeX)
  const zoom = cam.zoom || 1
  const pad = SPIRIT_VIEW_CULL_MARGIN
  const halfW = cam.viewW / (2 * zoom) + pad
  const halfH = cam.viewH / (2 * zoom) + pad
  const camPos = k.camPos()
  const minX = camPos.x - halfW
  const maxX = camPos.x + halfW
  const minY = camPos.y - halfH
  const maxY = camPos.y + halfH
  const spiritMinX = Math.min(head.x, spirit.holeX) - 24
  const spiritMaxX = Math.max(head.x, spirit.holeX) + 24
  const spiritMinY = Math.min(head.y, groundY) - 12
  const spiritMaxY = Math.max(head.y, groundY) + 28
  return !(spiritMaxX < minX || spiritMinX > maxX || spiritMaxY < minY || spiritMinY > maxY)
}

function isSpiritHintMonochrome(levelInst) {
  const z = levelInst.zones
  const fade = z?._sceneRef?.colorFade ?? levelInst.colorFade ?? 0
  return isGlowGrayExploreBeforeL(z, fade)
}

function drawSpiritMushTooltip(tipInst, layout) {
  const k = tipInst.k
  const colored = Boolean(tipInst._spiritHintColored)
  const rightEyes = Boolean(tipInst._spiritHintAtRightBurrow)
  const key = `${SPRITE_KEY_PREFIX}${colored ? 'c' : 'm'}|${rightEyes ? 'eyes-v10' : 'mush'}|${layout.bubbleX}|${layout.bubbleY}|${layout.showBelow}`
  if (tipInst._spiritHintBakeKey !== key) {
    tipInst._spiritHintBakeKey = key
    tipInst._spiritHintSprite = `${SPRITE_KEY_PREFIX}${glowUiHash(key)}`
    const canvas = bakeSpiritMushTooltipCanvas(layout, colored, rightEyes)
    k.loadSprite(tipInst._spiritHintSprite, canvas)
    const bounds = spiritHintBakeBounds(layout)
    tipInst._spiritHintDrawX = bounds.minX
    tipInst._spiritHintDrawY = bounds.minY
    tipInst._spiritHintDrawW = bounds.w
    tipInst._spiritHintDrawH = bounds.h
    canvas.width = 0
    canvas.height = 0
  }
  k.drawSprite({
    sprite: tipInst._spiritHintSprite,
    pos: k.vec2(tipInst._spiritHintDrawX, tipInst._spiritHintDrawY),
    width: tipInst._spiritHintDrawW,
    height: tipInst._spiritHintDrawH,
    opacity: tipInst.opacity,
    fixed: true
  })
}

function spiritHintBakeBounds(layout) {
  const halfW = POINTER_WIDTH / 2
  const bx = layout.bubbleX - BUBBLE_BORDER_WIDTH
  const by = layout.bubbleY - BUBBLE_BORDER_WIDTH
  const px = layout.clampedPointerX
  const tipY = layout.pointerTipY
  const baseY = layout.pointerBaseEdge
  let minX = Math.min(bx, px - halfW - BUBBLE_BORDER_WIDTH)
  let maxX = Math.max(bx + layout.totalW, px + halfW + BUBBLE_BORDER_WIDTH)
  let minY = Math.min(by, tipY, baseY)
  let maxY = Math.max(by + layout.totalH, tipY, baseY)
  const pad = 4
  return { minX: minX - pad, minY: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 }
}

function bakeSpiritMushTooltipCanvas(layout, colored, rightEyes = false) {
  const halfW = POINTER_WIDTH / 2
  const bx = layout.bubbleX - BUBBLE_BORDER_WIDTH
  const by = layout.bubbleY - BUBBLE_BORDER_WIDTH
  const px = layout.clampedPointerX
  const tipY = layout.pointerTipY
  const baseY = layout.pointerBaseEdge
  let minX = bx
  let minY = by
  let maxX = bx + layout.totalW
  let maxY = by + layout.totalH
  minX = Math.min(minX, px - halfW - BUBBLE_BORDER_WIDTH)
  maxX = Math.max(maxX, px + halfW + BUBBLE_BORDER_WIDTH)
  minY = Math.min(minY, tipY, baseY)
  maxY = Math.max(maxY, tipY, baseY)
  const pad = TOOLTIP_BAKE_PAD
  const canvasW = Math.ceil(maxX - minX + pad * 2)
  const canvasH = Math.ceil(maxY - minY + pad * 2)
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, canvasW)
  canvas.height = Math.max(1, canvasH)
  const ctx = canvas.getContext('2d')
  const ox = pad - minX
  const oy = pad - minY
  const bubbleX = layout.bubbleX + ox
  const bubbleY = layout.bubbleY + oy
  spiritHintRoundRect(ctx, bubbleX - BUBBLE_BORDER_WIDTH, bubbleY - BUBBLE_BORDER_WIDTH,
    layout.bubbleW + BUBBLE_BORDER_WIDTH * 2, layout.bubbleH + BUBBLE_BORDER_WIDTH * 2,
    BUBBLE_CORNER_RADIUS + BUBBLE_BORDER_WIDTH)
  ctx.fillStyle = `rgb(${BUBBLE_BORDER_R},${BUBBLE_BORDER_R},${BUBBLE_BORDER_R})`
  ctx.fill()
  spiritHintRoundRect(ctx, bubbleX, bubbleY, layout.bubbleW, layout.bubbleH, BUBBLE_CORNER_RADIUS)
  ctx.fillStyle = `rgba(${BUBBLE_BG_R},${BUBBLE_BG_G},${BUBBLE_BG_B},${BUBBLE_BG_OPACITY})`
  ctx.fill()
  const pointerX = px + ox
  const pointerTip = tipY + oy
  const pointerBase = baseY + oy
  const pointsUp = layout.showBelow
  ctx.fillStyle = `rgb(${BUBBLE_BORDER_R},${BUBBLE_BORDER_R},${BUBBLE_BORDER_R})`
  ctx.beginPath()
  if (pointsUp) {
    ctx.moveTo(pointerX - halfW - BUBBLE_BORDER_WIDTH, pointerBase)
    ctx.lineTo(pointerX + halfW + BUBBLE_BORDER_WIDTH, pointerBase)
    ctx.lineTo(pointerX, pointerTip - BUBBLE_BORDER_WIDTH)
  } else {
    ctx.moveTo(pointerX - halfW - BUBBLE_BORDER_WIDTH, pointerBase)
    ctx.lineTo(pointerX + halfW + BUBBLE_BORDER_WIDTH, pointerBase)
    ctx.lineTo(pointerX, pointerTip + BUBBLE_BORDER_WIDTH)
  }
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = `rgba(${BUBBLE_BG_R},${BUBBLE_BG_G},${BUBBLE_BG_B},${BUBBLE_BG_OPACITY})`
  ctx.beginPath()
  if (pointsUp) {
    ctx.moveTo(pointerX - halfW, pointerBase)
    ctx.lineTo(pointerX + halfW, pointerBase)
    ctx.lineTo(pointerX, pointerTip)
  } else {
    ctx.moveTo(pointerX - halfW, pointerBase)
    ctx.lineTo(pointerX + halfW, pointerBase)
    ctx.lineTo(pointerX, pointerTip)
  }
  ctx.closePath()
  ctx.fill()
  const iconOx = bubbleX + BUBBLE_PADDING_X
  const iconOy = bubbleY + BUBBLE_PADDING_Y
  if (rightEyes) drawHintChainStalks(ctx, iconOx, iconOy, colored)
  else drawHintMushroom(ctx, iconOx + MUSH_CX, iconOy + MUSH_BASE_Y, colored)
  applyGlowFilmGrainToCanvas(canvas, glowUiHash(`${colored}|${rightEyes}|pupils|${layout.bubbleW}`))
  rightEyes && drawHintChainPupils(ctx, iconOx, iconOy)
  return canvas
}

function hintChainEyeSpots(iconOx, iconOy) {
  const baseY = iconOy + HINT_CHAIN_TOP_INSET + HINT_CHAIN_BASE_Y
  const midX = iconOx + HINT_ICON_CHAIN_W / 2
  const lift = HINT_CHAIN_STALK_LIFT
  return {
    baseY,
    left: { x: midX - HINT_EYE_DX, eyeY: baseY - HINT_CHAIN_LEFT_EYE_DROP - lift },
    right: { x: midX + HINT_EYE_DX, eyeY: baseY - HINT_CHAIN_RIGHT_EYE_DROP - lift }
  }
}

function drawHintChainStalks(ctx, iconOx, iconOy, colored) {
  const spots = hintChainEyeSpots(iconOx, iconOy)
  drawHintChainEyeShell(ctx, spots.left.x, spots.baseY, spots.left.eyeY, colored, 1.7)
  drawHintChainEyeShell(ctx, spots.right.x, spots.baseY, spots.right.eyeY, colored, 4.2)
  const ink = parseHex(colored ? GLOW_PAL.eyeCreature.contour : MONO_INK)
  drawHintChainArcArrow(ctx, spots.left, spots.right, ink)
}

function drawHintChainPupils(ctx, iconOx, iconOy) {
  const spots = hintChainEyeSpots(iconOx, iconOy)
  ctx.save()
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'
  drawHintChainEyePupil(ctx, spots.left.x, spots.left.eyeY)
  drawHintChainEyePupil(ctx, spots.right.x, spots.right.eyeY)
  ctx.restore()
}

function drawHintChainStalkSideArms(ctx, ex, baseY, eyeY, stalkRgb, armSeed) {
  const stalkLen = baseY - eyeY
  const joints = [0.38, 0.62]
  ctx.strokeStyle = `rgb(${stalkRgb.r},${stalkRgb.g},${stalkRgb.b})`
  ctx.lineWidth = HINT_STALK_ARM_WIDTH
  joints.forEach((t, i) => {
    const py = baseY - stalkLen * t
    const side = i % 2 === 0 ? -1 : 1
    const wobble = Math.sin(armSeed * 2.3 + i * 1.17) * 2.2
    const tipX = ex + side * (HINT_STALK_ARM_LEN + wobble)
    const tipY = py + HINT_STALK_ARM_DROP
    ctx.beginPath()
    ctx.moveTo(ex, py)
    ctx.lineTo(tipX, tipY)
    ctx.stroke()
    ctx.fillStyle = `rgb(${stalkRgb.r},${stalkRgb.g},${stalkRgb.b})`
    ctx.beginPath()
    ctx.arc(tipX, tipY, 1.8, 0, Math.PI * 2)
    ctx.fill()
  })
}

function drawHintChainEyeShell(ctx, ex, baseY, eyeY, colored, armSeed) {
  const stalk = parseHex(colored ? GLOW_PAL.eyeCreature.contour : MONO_INK)
  const sclera = parseHex(colored ? CFG.visual.colors.hero.eyeWhite : '#FFFFFF')
  const ink = parseHex(MONO_INK)
  ctx.strokeStyle = `rgb(${stalk.r},${stalk.g},${stalk.b})`
  ctx.lineWidth = 2.2
  ctx.beginPath()
  ctx.moveTo(ex, baseY)
  ctx.lineTo(ex, eyeY + 8)
  ctx.stroke()
  drawHintChainStalkSideArms(ctx, ex, baseY, eyeY, stalk, armSeed)
  ctx.fillStyle = `rgb(${sclera.r},${sclera.g},${sclera.b})`
  ctx.beginPath()
  ctx.arc(ex, eyeY, 7, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = `rgb(${ink.r},${ink.g},${ink.b})`
  ctx.lineWidth = 1.8
  ctx.stroke()
}

function drawHintChainEyePupil(ctx, ex, eyeY) {
  ctx.fillStyle = MONO_INK
  ctx.beginPath()
  ctx.arc(ex + 1, eyeY + 0.5, HINT_EYE_PUPIL_R, 0, Math.PI * 2)
  ctx.fill()
}
//
// Arc bowing above the eyes; isosceles chevron at the left end (equal wing angles).
//
function drawHintChainArcArrow(ctx, left, right, inkRgb) {
  const pl = { x: left.x, y: left.eyeY - HINT_CHAIN_ARC_EYE_CLEARANCE }
  const pr = { x: right.x, y: right.eyeY - HINT_CHAIN_ARC_EYE_CLEARANCE * 0.85 }
  const mx = (pl.x + pr.x) / 2
  const my = (pl.y + pr.y) / 2
  const dx = pr.x - pl.x
  const dy = pr.y - pl.y
  const chord = Math.hypot(dx, dy) || 1
  const half = chord / 2
  const radius = half * HINT_CHAIN_ARC_RADIUS_MUL
  const h = Math.sqrt(Math.max(0, radius * radius - half * half))
  let nx = -dy / chord
  let ny = dx / chord
  if (ny < 0) {
    nx = -nx
    ny = -ny
  }
  const cx = mx + nx * h
  const cy = my + ny * h
  const aRight = Math.atan2(pr.y - cy, pr.x - cx)
  const aLeft = Math.atan2(pl.y - cy, pl.x - cx)
  const aArcEnd = aLeft + HINT_CHAIN_ARC_HEAD_TRIM
  ctx.strokeStyle = `rgb(${inkRgb.r},${inkRgb.g},${inkRgb.b})`
  ctx.lineWidth = HINT_CHAIN_ARC_STROKE
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.arc(cx, cy, radius, aRight, aArcEnd, true)
  ctx.stroke()
  const tipX = cx + radius * Math.cos(aLeft)
  const tipY = cy + radius * Math.sin(aLeft)
  const aBefore = aLeft + HINT_CHAIN_ARC_TANGENT_EPS
  const prevX = cx + radius * Math.cos(aBefore)
  const prevY = cy + radius * Math.sin(aBefore)
  const aim = Math.atan2(tipY - prevY, tipX - prevX)
  drawHintChainArcChevron(ctx, tipX, tipY, aim)
}

function drawHintChainArcChevron(ctx, tipX, tipY, aim) {
  const head = HINT_CHAIN_ARC_HEAD_LEN
  const ha = HINT_CHAIN_ARC_HEAD_ANGLE
  const back = aim + Math.PI
  const w1x = tipX + Math.cos(back + ha) * head
  const w1y = tipY + Math.sin(back + ha) * head
  const w2x = tipX + Math.cos(back - ha) * head
  const w2y = tipY + Math.sin(back - ha) * head
  ctx.beginPath()
  ctx.moveTo(w1x, w1y)
  ctx.lineTo(tipX, tipY)
  ctx.lineTo(w2x, w2y)
  ctx.stroke()
}

function drawHintMushroom(ctx, cx, baseY, colored) {
  if (!colored) {
    const ink = parseHex(MONO_INK)
    drawMushroomToCanvas(ctx, {
      cx,
      baseY,
      capWidth: MUSH_CAP_W,
      capHeight: MUSH_CAP_H,
      stemWidth: MUSH_STEM_W,
      stemHeight: MUSH_STEM_H,
      capColor: ink,
      flat: true,
      outlineColor: MONO_INK,
      outlineAlpha: 1
    })
    return
  }
  const cap = parseHex(GLOW_PAL.mushroomsLight[0])
  const shadow = parseHex(GLOW_PAL.mushroomsDark[0])
  const light = parseHex(GLOW_PAL.mushroomsLight[1])
  drawMushroomToCanvas(ctx, {
    cx,
    baseY,
    capWidth: MUSH_CAP_W,
    capHeight: MUSH_CAP_H,
    stemWidth: MUSH_STEM_W,
    stemHeight: MUSH_STEM_H,
    capColor: cap,
    capLight: light,
    capShadow: shadow
  })
}

function spiritHintRoundRect(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rad, y)
  ctx.arcTo(x + w, y, x + w, y + h, rad)
  ctx.arcTo(x + w, y + h, x, y + h, rad)
  ctx.arcTo(x, y + h, x, y, rad)
  ctx.arcTo(x, y, x + w, y, rad)
  ctx.closePath()
}
