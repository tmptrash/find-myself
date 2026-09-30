import { CFG } from '../../../cfg.js'
import { getRGB } from '../../../utils/helper.js'
import { GLOW_PAL } from './glow-palette.js'

//
// Specular on the warm sclera — small offset so the eye reads luminous, not
// flat UI white.
//
const EYE_HIGHLIGHT_RADIUS_MULT = 0.26
const EYE_HIGHLIGHT_OFFSET_X_MULT = -0.4
const EYE_HIGHLIGHT_OFFSET_Y_MULT = -0.36

/**
 * Kaplay rgb colours for stalk-eye decor in the colour world.
 * @param {Object} k - Kaplay inst
 * @returns {{ body: Object, sclera: Object, pupil: Object, highlight: Object, contour: Object }}
 */
export function glowEyeCreatureColors(k) {
  const pal = GLOW_PAL.eyeCreature
  return {
    body: getRGB(k, pal.body),
    sclera: getRGB(k, pal.sclera),
    pupil: getRGB(k, pal.pupil),
    highlight: getRGB(k, pal.highlight),
    contour: getRGB(k, pal.contour)
  }
}
/**
 * White sclera + black pupil for cave pickup eyes and post-pickup hero attach.
 * @param {Object} k - Kaplay inst
 * @returns {{ body: Object, sclera: Object, pupil: Object, highlight: Object, contour: Object }}
 */
export function glowCaveHeroEyeColors(k) {
  const sclera = getRGB(k, CFG.visual.colors.hero.eyeWhite)
  const pupil = getRGB(k, CFG.visual.colors.hero.eyePupil)
  const contour = getRGB(k, GLOW_PAL.glowContour.gameplay)
  const highlight = getRGB(k, GLOW_PAL.lightGray)
  return {
    body: contour,
    sclera,
    pupil,
    highlight,
    contour
  }
}

/**
 * Draws one eye stack: green-black contour, warm sclera, dark pupil, cream highlight.
 * @param {Object} k - Kaplay inst
 * @param {number} cx - Sclera center X
 * @param {number} cy - Sclera center Y
 * @param {number} pupilX - Pupil center X
 * @param {number} pupilY - Pupil center Y
 * @param {Object} colors - Kaplay rgb from glowEyeCreatureColors()
 * @param {Object} radii - { scleraR, pupilR, contourExtra }
 * @param {Object} [opts] - { skipHighlight }
 */
export function drawGlowEyeCreature(k, cx, cy, pupilX, pupilY, colors, radii, opts) {
  const { sclera, pupil, highlight, contour } = colors
  const { scleraR, pupilR, contourExtra } = radii
  const skipHighlight = Boolean(opts?.skipHighlight)
  k.drawCircle({
    pos: k.vec2(cx, cy),
    radius: scleraR + contourExtra,
    color: contour
  })
  k.drawCircle({ pos: k.vec2(cx, cy), radius: scleraR, color: sclera })
  k.drawCircle({
    pos: k.vec2(pupilX, pupilY),
    radius: pupilR,
    color: pupil
  })
  if (skipHighlight) return
  const hiR = scleraR * EYE_HIGHLIGHT_RADIUS_MULT
  k.drawCircle({
    pos: k.vec2(
      cx + scleraR * EYE_HIGHLIGHT_OFFSET_X_MULT,
      cy + scleraR * EYE_HIGHLIGHT_OFFSET_Y_MULT
    ),
    radius: hiR,
    color: highlight
  })
}
