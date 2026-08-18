import { CFG } from '../../../cfg.js'
import { set } from '../../../utils/progress.js'
import { createLevelTransition } from '../../../utils/transition.js'
import { glowRgb } from '../utils/glow-palette.js'
//
// Completion marker — shown briefly before returning to menu.
// Sets section as completed and routes to touch section.
//
const GLOW_COMPLETE_DELAY = 2.5
const GLOW_COMPLETE_TEXT = 'The world is now visible.'
const TEXT_SIZE = 36
const TEXT_RGB = glowRgb('gold')
const VOID_RGB = glowRgb('void')

/**
 * Registers the glow section completion scene.
 * @param {Object} k - Kaplay instance
 */
export function sceneGlowComplete(k) {
  k.scene('glow-complete', () => {
    set('glow.completed', true)
    set('lastLesson', 'glow-complete')
    const cx = CFG.visual.screen.width / 2
    const cy = CFG.visual.screen.height / 2
    k.add([
      k.rect(CFG.visual.screen.width, CFG.visual.screen.height),
      k.pos(0, 0),
      k.color(VOID_RGB.r, VOID_RGB.g, VOID_RGB.b),
      k.z(0)
    ])
    //
    // Drop shadow (single void-tone copy offset right+down) — the same text
    // shadow style the glow level uses.
    //
    const outlineOffsets = [[2, 2]]
    outlineOffsets.forEach(([dx, dy]) => {
      k.add([
        k.text(GLOW_COMPLETE_TEXT, { size: TEXT_SIZE, font: CFG.visual.fonts.regularFull }),
        k.pos(cx + dx, cy + dy),
        k.anchor('center'),
        k.color(VOID_RGB.r, VOID_RGB.g, VOID_RGB.b),
        k.z(10)
      ])
    })
    k.add([
      k.text(GLOW_COMPLETE_TEXT, { size: TEXT_SIZE, font: CFG.visual.fonts.regularFull }),
      k.pos(cx, cy),
      k.anchor('center'),
      k.color(TEXT_RGB.r, TEXT_RGB.g, TEXT_RGB.b),
      k.z(11)
    ])
    k.wait(GLOW_COMPLETE_DELAY, () => {
      createLevelTransition(k, 'menu')
    })
  })
}
