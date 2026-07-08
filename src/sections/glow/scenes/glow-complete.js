import { CFG } from '../../../cfg.js'
import { set } from '../../../utils/progress.js'
import { createLevelTransition } from '../../../utils/transition.js'
//
// Completion marker — shown briefly before returning to menu.
// Sets section as completed and routes to touch section.
//
const GLOW_COMPLETE_DELAY = 2.5
const GLOW_COMPLETE_TEXT = 'The world is now visible.'
const TEXT_SIZE = 36
const TEXT_COLOR_R = 212
const TEXT_COLOR_G = 175
const TEXT_COLOR_B = 55

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
      k.color(0, 0, 0),
      k.z(0)
    ])
    //
    // Drop shadow (single black copy offset right+down) — the same text
    // shadow style the glow level uses.
    //
    const outlineOffsets = [[2, 2]]
    outlineOffsets.forEach(([dx, dy]) => {
      k.add([
        k.text(GLOW_COMPLETE_TEXT, { size: TEXT_SIZE, font: CFG.visual.fonts.regularFull }),
        k.pos(cx + dx, cy + dy),
        k.anchor('center'),
        k.color(0, 0, 0),
        k.z(10)
      ])
    })
    k.add([
      k.text(GLOW_COMPLETE_TEXT, { size: TEXT_SIZE, font: CFG.visual.fonts.regularFull }),
      k.pos(cx, cy),
      k.anchor('center'),
      k.color(TEXT_COLOR_R, TEXT_COLOR_G, TEXT_COLOR_B),
      k.z(11)
    ])
    k.wait(GLOW_COMPLETE_DELAY, () => {
      createLevelTransition(k, 'menu')
    })
  })
}
