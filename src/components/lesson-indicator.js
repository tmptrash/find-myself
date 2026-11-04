import { CFG } from '../cfg.js'
import {
  EYE_HUD_DISPLAY_SCALE_MUL,
  EYE_HUD_FRAME_HEIGHT,
  EYE_HUD_FRAME_WIDTH,
  EYE_HUD_OPEN_SPRITE,
  applyEyeHudFrame,
  bindEyeHudLookAtHero,
  createEyeHudBlinkState,
  getEyeHudFrameIndex,
  setLifeHudEyeHidden,
  mountLifeHudPupilDrawer,
  syncLifeHudEyeSprite,
  tickEyeHudBlink
} from '../utils/eye-hud.js'

export { bindEyeHudLookAtHero }
//
// Life eye display scale: the 86 px life icon height, enlarged 1.3x and
// shrunk 20%, then the shared HUD eye multiplier.
//
const LIFE_IMAGE_HEIGHT = 86
const LIFE_SCALE_FACTOR = 1.3
const LIFE_IMAGE_SHRINK = 0.8
const LIFE_IMAGE_SCALE = (LIFE_IMAGE_HEIGHT / EYE_HUD_FRAME_HEIGHT) * LIFE_SCALE_FACTOR *
  LIFE_IMAGE_SHRINK * EYE_HUD_DISPLAY_SCALE_MUL
const LIFE_WHITE = 255
/**
 * Creates the life HUD: the blinking eye whose pupil follows the hero. The
 * eye starts hidden; revealLifeHud() shows it.
 * @param {Object} cfg - Configuration
 * @param {Object} cfg.k - Kaplay instance
 * @param {number} cfg.lifeHudPlayfieldRightX - Screen X the eye's right edge lines up with
 * @param {number} cfg.lifeHudPlayfieldTopY - Screen Y of the eye's top edge
 * @returns {Object} Life HUD inst (lifeImage.sprite is the eye Kaplay object)
 */
export function create(cfg) {
  const { k, lifeHudPlayfieldRightX, lifeHudPlayfieldTopY } = cfg
  const eyeX = lifeHudPlayfieldRightX - EYE_HUD_FRAME_WIDTH * LIFE_IMAGE_SCALE / 2
  const eyeY = lifeHudPlayfieldTopY + EYE_HUD_FRAME_HEIGHT * LIFE_IMAGE_SCALE / 2
  let indicatorInst = null
  const lifeSprite = k.add([
    k.sprite(EYE_HUD_OPEN_SPRITE),
    k.pos(eyeX, eyeY),
    k.scale(LIFE_IMAGE_SCALE),
    k.anchor('center'),
    k.fixed(),
    k.color(LIFE_WHITE, LIFE_WHITE, LIFE_WHITE),
    k.opacity(1),
    k.z(CFG.visual.zIndex.ui)
  ])
  const lifePupilLayer = mountLifeHudPupilDrawer(k, {
    getInst: () => indicatorInst,
    lifeSprite,
    getEyeScreenPos: () => ({ x: eyeX, y: eyeY }),
    zIndex: CFG.visual.zIndex.ui + 1
  })
  lifeSprite.hidden = true
  lifePupilLayer.hidden = true
  const inst = {
    k,
    lifeImage: { sprite: lifeSprite, pupilLayer: lifePupilLayer },
    lifeRevealed: false,
    _lifeSpriteName: EYE_HUD_OPEN_SPRITE,
    _lifeFlashLock: false,
    _eyeHudFrameIndex: 0,
    _eyeHudDisplayScale: LIFE_IMAGE_SCALE,
    eyeHudBlink: createEyeHudBlinkState(k)
  }
  indicatorInst = inst
  syncLifeHudEyeSprite(inst)
  k.onUpdate(() => onUpdate(inst))
  return inst
}
/**
 * Reveals the life eye in the top-right HUD.
 * @param {Object} inst - Life HUD inst from create()
 */
export function revealLifeHud(inst) {
  if (!inst || inst.lifeRevealed) return
  inst.lifeRevealed = true
  restoreLifeHud(inst)
}
/**
 * Puts the life eye back to its current blink frame in full colour, e.g.
 * before a flash routine takes over its colour.
 * @param {Object} inst - Life HUD inst from create()
 */
export function restoreLifeHud(inst) {
  const sprite = inst?.lifeImage?.sprite
  if (!sprite || inst._lifeFlashLock) return
  applyEyeHudFrame(inst, getEyeHudFrameIndex(inst))
  sprite.color = inst.k.rgb(LIFE_WHITE, LIFE_WHITE, LIFE_WHITE)
  inst.lifeRevealed && setLifeHudEyeHidden(inst, false)
}
//
// Advances the eye's idle blink
//
function onUpdate(inst) {
  tickEyeHudBlink(inst, inst.k.dt())
}
