import {
  drawTrackingEyePupil,
  eyeDisplayScaleFromHeight
} from './eye-pupil.js'
//
// HUD life-icon eye sprites (replaces life.png teacher creature).
//
export const EYE_HUD_OPEN_SPRITE = 'eye-hud-0'
export const EYE_HUD_FRAME_SPRITES = ['eye-hud-0', 'eye-hud-1', 'eye-hud-2']
export const EYE_HUD_FRAME_HEIGHT = 239
export const EYE_HUD_FRAME_WIDTH = 201
export const EYE_HUD_BLINK_SEQUENCE = [0, 1, 2, 1, 0]
export const EYE_HUD_BLINK_FRAME_DURATION = 0.09
export const EYE_HUD_BLINK_INTERVAL_MIN = 10
export const EYE_HUD_BLINK_INTERVAL_MAX = 20
//
// HUD display is 20% smaller than the previous life-icon scale.
//
export const EYE_HUD_DISPLAY_SCALE_MUL = 0.8
//
// Ready scene: eye_x at 2× native, then −40% → 1.2× native pixels.
//
export const READY_EYE_DISPLAY_SCALE_MUL = 2 * 0.6
export const READY_EYE_DISPLAY_WIDTH = Math.round(EYE_HUD_FRAME_WIDTH * READY_EYE_DISPLAY_SCALE_MUL)
export const READY_EYE_DISPLAY_HEIGHT = Math.round(EYE_HUD_FRAME_HEIGHT * READY_EYE_DISPLAY_SCALE_MUL)
/**
 * @param {number} frameIndex - 0..2
 * @param {boolean} desat
 * @returns {string}
 */
export function eyeHudSpriteForFrame(frameIndex, desat) {
  const base = EYE_HUD_FRAME_SPRITES[frameIndex] ?? EYE_HUD_OPEN_SPRITE
  return desat ? `${base}-desat` : base
}
/**
 * @param {string} spriteName
 * @returns {boolean}
 */
export function eyeHudSpriteIsDesat(spriteName) {
  return Boolean(spriteName?.endsWith('-desat'))
}
/**
 * @param {Object} k - Kaplay instance
 * @returns {Object}
 */
export function createEyeHudBlinkState(k) {
  return {
    nextBlinkAt: k.time() + randomEyeHudBlinkDelay(),
    playing: false,
    seqStep: 0,
    stepTimer: 0
  }
}
/**
 * @param {Object} indicator - Level indicator instance
 * @param {Object} heroInst - Playable hero inst (Hero.create)
 */
export function bindEyeHudLookAtHero(indicator, heroInst) {
  indicator._eyeLookHero = heroInst
}
/**
 * Fixed HUD draw pass for the tracking pupil (screen-space coords, drawn above the eye sprite).
 * @param {Object} k - Kaplay instance
 * @param {Object} cfg
 * @param {function(): Object|null} cfg.getInst - Level indicator instance
 * @param {Object} cfg.lifeSprite - Life eye Kaplay object
 * @param {function(): { x: number, y: number }} cfg.getEyeScreenPos - Eye centre in screen px
 * @param {number} cfg.zIndex - Draw layer (above the eye sprite)
 * @returns {Object} Kaplay object used for pupil draws (also stored as lifeImage.pupilLayer)
 */
export function mountLifeHudPupilDrawer(k, cfg) {
  const { getInst, lifeSprite, getEyeScreenPos, zIndex } = cfg
  const layer = k.add([
    k.fixed(),
    k.z(zIndex),
    {
      draw() {
        const inst = getInst()
        if (!inst || lifeSprite.hidden || layer.hidden) return
        const pos = getEyeScreenPos()
        drawHudAnimatedEye(k, inst, {
          pos,
          hidden: false,
          opacity: lifeSprite.opacity ?? 1
        })
      }
    }
  ])
  return layer
}
/**
 * @param {Object} inst
 * @returns {number}
 */
export function getEyeHudFrameIndex(inst) {
  const blink = inst?.eyeHudBlink
  if (!blink) return 0
  if (!blink.playing) return 0
  return EYE_HUD_BLINK_SEQUENCE[blink.seqStep] ?? 0
}
/**
 * @param {Object} inst - Level indicator instance
 * @param {number} dt
 */
export function tickEyeHudBlink(inst, dt) {
  if (!inst?.eyeHudBlink || !inst.lifeImage?.sprite) return
  const k = inst.k
  const sprite = inst.lifeImage.sprite
  if (!sprite.exists?.()) return
  if (inst._lifeFlashLock) return
  const state = inst.eyeHudBlink
  const useDesat = inst._eyeHudGrey || inst.scoreboardGreyLife
  if (useDesat && k._lifeDesatReady !== true) {
    inst.lifeRevealed && setLifeHudEyeHidden(inst, true)
    return
  }
  inst.lifeRevealed && setLifeHudEyeHidden(inst, false)
  if (!state.playing) {
    inst._eyeHudFrameIndex = 0
    if (k.time() < state.nextBlinkAt) return
    state.playing = true
    state.seqStep = 0
    state.stepTimer = 0
    inst._eyeHudFrameIndex = EYE_HUD_BLINK_SEQUENCE[0]
    syncLifeHudEyeSprite(inst)
    return
  }
  state.stepTimer += dt
  while (state.stepTimer >= EYE_HUD_BLINK_FRAME_DURATION) {
    state.stepTimer -= EYE_HUD_BLINK_FRAME_DURATION
    state.seqStep += 1
    if (state.seqStep >= EYE_HUD_BLINK_SEQUENCE.length) {
      scheduleNextEyeHudBlink(k, state)
      inst._eyeHudFrameIndex = 0
      syncLifeHudEyeSprite(inst)
      return
    }
    inst._eyeHudFrameIndex = EYE_HUD_BLINK_SEQUENCE[state.seqStep]
    syncLifeHudEyeSprite(inst)
  }
}
/**
 * Draws the tracking pupil on top of the life HUD eye sprite (call from life icon draw callback).
 * @param {Object} k
 * @param {Object} inst - Level indicator instance
 * @param {Object} drawHost - Kaplay object (pos, color, opacity, hidden)
 */
export function drawHudAnimatedEye(k, inst, drawHost) {
  if (!inst) return
  const useDesat = inst._eyeHudGrey || inst.scoreboardGreyLife
  if (useDesat && k._lifeDesatReady !== true) return
  if (drawHost.hidden) return
  const frameIndex = inst._eyeHudFrameIndex ?? 0
  const scale = inst._eyeHudDisplayScale ?? 1
  const h = EYE_HUD_FRAME_HEIGHT * scale
  const cx = drawHost.pos.x
  const cy = drawHost.pos.y
  const opacity = drawHost.opacity ?? 1
  const target = resolveEyeHudLookTarget(inst, k)
  const targetX = target?.x ?? cx
  const targetY = target?.y ?? cy
  drawTrackingEyePupil(k, {
    centerX: cx,
    centerY: cy,
    displayScale: eyeDisplayScaleFromHeight(h),
    frameIndex,
    targetX,
    targetY,
    opacity,
    fixed: true
  })
}
export function setLifeHudEyeHidden(inst, hidden) {
  const life = inst?.lifeImage
  if (!life) return
  life.sprite && (life.sprite.hidden = hidden)
  life.pupilLayer && (life.pupilLayer.hidden = hidden)
}
/**
 * @param {Object} k
 * @param {Object} cfg
 * @param {number} cfg.left
 * @param {number} cfg.top
 * @param {number} cfg.width
 * @param {number} cfg.height
 * @param {number} cfg.frameIndex
 * @param {number} cfg.targetX
 * @param {number} cfg.targetY
 * @param {number} [cfg.opacity=1]
 */
export function drawReadySceneEye(k, cfg) {
  const {
    left,
    top,
    width,
    height,
    frameIndex,
    targetX,
    targetY,
    opacity = 1
  } = cfg
  const spriteName = eyeHudSpriteForFrame(frameIndex, false)
  if (!k.getSprite(spriteName)) return
  k.drawSprite({
    sprite: spriteName,
    pos: k.vec2(left, top),
    width,
    height,
    opacity
  })
  const cx = left + width / 2
  const cy = top + height / 2
  drawTrackingEyePupil(k, {
    centerX: cx,
    centerY: cy,
    displayScale: eyeDisplayScaleFromHeight(height),
    frameIndex,
    targetX,
    targetY,
    opacity,
    fixed: false
  })
}
/**
 * @param {Object} inst
 * @param {number} frameIndex
 */
export function applyEyeHudFrame(inst, frameIndex) {
  inst._eyeHudFrameIndex = frameIndex
  syncLifeHudEyeSprite(inst)
}
/**
 * Swaps the Kaplay sprite on the life HUD object to match blink frame / grey bake.
 * @param {Object} inst - Level indicator instance
 */
export function syncLifeHudEyeSprite(inst) {
  const spriteObj = inst?.lifeImage?.sprite
  const k = inst?.k
  if (!spriteObj?.exists?.() || !k) return
  const useDesat = inst._eyeHudGrey || inst.scoreboardGreyLife
  if (useDesat && k._lifeDesatReady !== true) return
  const frameIndex = inst._eyeHudFrameIndex ?? 0
  const spriteName = eyeHudSpriteForFrame(frameIndex, useDesat)
  if (inst._lifeSpriteName === spriteName) return
  if (!k.getSprite(spriteName)) return
  spriteObj.use(k.sprite(spriteName))
  inst._lifeSpriteName = spriteName
}
/**
 * @param {Object} k
 * @param {Object} state
 */
export function scheduleNextEyeHudBlink(k, state) {
  state.playing = false
  state.seqStep = 0
  state.stepTimer = 0
  state.nextBlinkAt = k.time() + randomEyeHudBlinkDelay()
}
/**
 * Advances ready-scene blink state (same timing as HUD).
 * @param {Object} state
 * @param {Object} k
 * @param {number} dt
 */
export function tickReadySceneEyeBlink(state, k, dt) {
  if (!state) return
  if (!state.playing) {
    state.frameIndex = 0
    if (k.time() < state.nextBlinkAt) return
    state.playing = true
    state.seqStep = 0
    state.stepTimer = 0
    state.frameIndex = EYE_HUD_BLINK_SEQUENCE[0]
    return
  }
  state.stepTimer += dt
  while (state.stepTimer >= EYE_HUD_BLINK_FRAME_DURATION) {
    state.stepTimer -= EYE_HUD_BLINK_FRAME_DURATION
    state.seqStep += 1
    if (state.seqStep >= EYE_HUD_BLINK_SEQUENCE.length) {
      scheduleNextEyeHudBlink(k, state)
      state.frameIndex = 0
      return
    }
    state.frameIndex = EYE_HUD_BLINK_SEQUENCE[state.seqStep]
  }
}
function resolveEyeHudLookTarget(inst, k) {
  const pos = inst._eyeLookHero?.character?.pos
  if (!pos || !k) return null
  const cam = k.camPos?.()
  if (!cam) return { x: pos.x, y: pos.y }
  return {
    x: pos.x - cam.x + k.width() / 2,
    y: pos.y - cam.y + k.height() / 2
  }
}
function randomEyeHudBlinkDelay() {
  const span = EYE_HUD_BLINK_INTERVAL_MAX - EYE_HUD_BLINK_INTERVAL_MIN
  return EYE_HUD_BLINK_INTERVAL_MIN + Math.random() * span
}
