import { CFG } from '../cfg.js'
import * as Hero from '../../../components/hero.js'
import { set } from '../../../utils/progress.js'
import * as Sound from '../../../utils/sound.js'
import * as BootLoader from '../../../utils/boot-loader.js'
import * as CanvasBackdrop from '../../../utils/canvas-backdrop.js'
import { bindBackToMenuKeys } from '../../../utils/helper.js'
import { goToMenuAfterAssets } from '../../../utils/lesson-assets.js'
import { registerNativeTeardown } from '../../../utils/engine-switch.js'
import { addForestFilmGrainOverlayLayer } from '../../forest/utils/forest-parallax-grain.js'
//
// Touch lesson 0 is no longer a playable level — it is the end screen of the
// preview build: an empty dark scene with one softly pulsing line of text in
// the middle and a still hero at the bottom looking up at it.
//
const SCENE_NAME = 'lesson-touch.0'
const END_TEXT = 'End of the preview'
const END_TEXT_SIZE = 44
const END_TEXT_FONT = CFG.visual.fonts.regularFull.replace(/'/g, '')
//
// Gentle opacity breathing on the text — never fully fades out.
//
const END_TEXT_PULSE_SPEED = 1.6
const END_TEXT_OPACITY_MIN = 0.62
const END_TEXT_OPACITY_MAX = 1
const END_TEXT_SHADOW_OFFSET = 2
//
// Hero stands centred near the bottom edge; the sprite is anchored at its
// centre, so it is lifted by half its height plus a margin.
//
const HERO_SPRITE_HALF_H = 48
const HERO_BOTTOM_MARGIN = 72
const Z_TEXT = CFG.visual.zIndex.ui
const Z_FILM_GRAIN = CFG.visual.zIndex.ui + 20
const BACKGROUND_HEX = CFG.visual.colors.ready.background
const TEXT_HEX = CFG.visual.colors.palette.lightGray
const TEXT_SHADOW_HEX = CFG.visual.colors.outline

/**
 * End-of-preview scene registered under the old touch lesson 0 name, so every
 * existing route into lesson-touch.0 (glow completion, menu, saved progress)
 * lands here.
 * @param {Object} k - Kaplay inst
 */
export function sceneLesson0(k) {
  k.scene(SCENE_NAME, () => {
    set('lastLesson', SCENE_NAME)
    set('lastSection', 'touch')
    CanvasBackdrop.applyCanvasBackdrop(k, BACKGROUND_HEX)
    k.setBackground(k.Color.fromHex(BACKGROUND_HEX))
    const clearBackdrop = () => CanvasBackdrop.clearCanvasBackdrop(k)
    k.onSceneLeave(clearBackdrop)
    registerNativeTeardown(clearBackdrop)
    //
    // Esc (CFG.controls.backToMenu) leaves the end screen for the menu.
    //
    const backToMenu = bindBackToMenuKeys(k, () => goToMenuAfterAssets(k))
    k.onSceneLeave(() => backToMenu.cancel())
    const inst = createPreviewEnd(k)
    k.add([k.z(Z_TEXT), { draw() { onDraw(inst) } }])
    k.onUpdate(() => onUpdate(inst))
    addForestFilmGrainOverlayLayer(k, Z_FILM_GRAIN)
    BootLoader.hideLoader()
  })
}
//
// Builds the scene state: text anchor in the screen centre and a decorative
// hero that ignores every key and keeps its eyes on that text.
//
function createPreviewEnd(k) {
  const textPos = k.vec2(k.width() / 2, k.height() / 2)
  const hero = Hero.create({
    k,
    x: k.width() / 2,
    y: k.height() - HERO_BOTTOM_MARGIN - HERO_SPRITE_HALF_H,
    type: Hero.HEROES.HERO,
    controllable: false,
    isStatic: true,
    bodyColor: CFG.visual.colors.sections.touch.antiHero,
    idleVocalization: null,
    sfx: Sound.create()
  })
  Hero.setLookAtPos(hero, textPos)
  return {
    k,
    hero,
    textPos,
    textColor: k.Color.fromHex(TEXT_HEX),
    shadowColor: k.Color.fromHex(TEXT_SHADOW_HEX),
    time: 0
  }
}
function onUpdate(inst) {
  inst.time += inst.k.dt()
}
//
// Shadow copy first, then the text itself, both at the current breathing
// opacity.
//
function onDraw(inst) {
  const { k, textPos } = inst
  const wave = 0.5 + 0.5 * Math.sin(inst.time * END_TEXT_PULSE_SPEED)
  const opacity = END_TEXT_OPACITY_MIN + (END_TEXT_OPACITY_MAX - END_TEXT_OPACITY_MIN) * wave
  const textOpts = {
    text: END_TEXT,
    size: END_TEXT_SIZE,
    font: END_TEXT_FONT,
    anchor: 'center',
    opacity
  }
  k.drawText({
    ...textOpts,
    pos: textPos.add(END_TEXT_SHADOW_OFFSET, END_TEXT_SHADOW_OFFSET),
    color: inst.shadowColor
  })
  k.drawText({ ...textOpts, pos: textPos, color: inst.textColor })
}
