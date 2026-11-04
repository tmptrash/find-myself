import { getRGB } from '../utils/helper.js'

//
// Backdrop of a level the hero has not reached yet: plain near-black with
// "?" glyphs drifting slowly across it, each turning its own way at its own
// pace and casting a black shadow down-right (one light for all). A glyph
// leaving one edge comes back in at the opposite one.
//
const GLYPH_COUNT = 18
const DRIFT_SPEED_MIN = 8            // px/s at the reference height
const DRIFT_SPEED_RANGE = 14
const SPIN_SPEED_MAX = 40            // deg/s either way
const SPIN_CHANGE_MIN = 2            // Seconds before a glyph picks a new spin
const SPIN_CHANGE_RANGE = 4
const SPIN_EASE = 1.5                // How fast the spin follows its new pick (per s)
const SCALE_MIN = 0.5
const SCALE_RANGE = 1
//
// Glyphs differ in brightness (a grey tint over the baked glyph), not in
// opacity, so none shows its own shadow through itself.
//
const BRIGHTNESS_MIN = 0.3
const BRIGHTNESS_RANGE = 0.45
const CHANNEL_MAX = 255
const EDGE_MARGIN = 60               // Off-screen band a glyph wraps through (px)
const FULL_TURN_DEG = 360
const SHADOW_OFFSET = 7              // px at the reference height and glyph scale 1
const SHADOW_OPACITY = 0.9

/**
 * Creates the drifting "?" field for a screen size.
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay inst
 * @param {number} cfg.width - Screen width (px)
 * @param {number} cfg.height - Screen height (px)
 * @param {number} cfg.s - Layout scale (window height / reference height)
 * @param {string} cfg.sprite - Baked "?" glyph sprite
 * @param {string} cfg.color - Backdrop hex colour
 * @param {string} cfg.shadowColor - Glyph shadow hex colour
 * @returns {Object} Drift inst
 */
export function create(cfg) {
  const { k, width, height, s, sprite, color, shadowColor } = cfg
  return {
    k,
    width,
    height,
    sprite,
    color,
    shadowColor,
    glyphs: Array.from({ length: GLYPH_COUNT }, () => createGlyph(k, width, height, s))
  }
}

/**
 * Moves and turns every glyph.
 * @param {Object} inst - Drift inst
 * @param {number} dt - Frame delta (s)
 */
export function onUpdate(inst, dt) {
  inst.glyphs.forEach(glyph => stepGlyph(inst, glyph, dt))
}

/**
 * Draws the fill, every glyph's shadow (the glyph tinted black), then every
 * glyph — both sprite passes share one texture.
 * @param {Object} inst - Drift inst
 * @param {number} opacity - Backdrop opacity (0..1)
 */
export function onDraw(inst, opacity) {
  const { k } = inst
  k.drawRect({ pos: k.vec2(0, 0), width: inst.width, height: inst.height, color: getRGB(k, inst.color), opacity })
  const shadowColor = getRGB(k, inst.shadowColor)
  inst.glyphs.forEach(glyph => k.drawSprite({
    sprite: inst.sprite,
    pos: k.vec2(glyph.x + glyph.shadowOffset, glyph.y + glyph.shadowOffset),
    anchor: 'center',
    angle: glyph.angle,
    scale: glyph.scale,
    color: shadowColor,
    opacity: SHADOW_OPACITY * opacity
  }))
  inst.glyphs.forEach(glyph => k.drawSprite({
    sprite: inst.sprite,
    pos: k.vec2(glyph.x, glyph.y),
    anchor: 'center',
    angle: glyph.angle,
    scale: glyph.scale,
    color: glyph.tint,
    opacity
  }))
}
//
// Kaplay's drawSprite skips the draw when its scale is a plain number, so
// each glyph keeps its own vec2 (and its tint as a ready colour).
//
function createGlyph(k, width, height, s) {
  const heading = Math.random() * Math.PI * 2
  const speed = (DRIFT_SPEED_MIN + Math.random() * DRIFT_SPEED_RANGE) * s
  const scale = SCALE_MIN + Math.random() * SCALE_RANGE
  const level = Math.round((BRIGHTNESS_MIN + Math.random() * BRIGHTNESS_RANGE) * CHANNEL_MAX)
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    vx: Math.cos(heading) * speed,
    vy: Math.sin(heading) * speed,
    angle: Math.random() * FULL_TURN_DEG,
    spin: randomSpin(),
    spinTarget: randomSpin(),
    spinLeft: nextSpinChange(),
    scale: k.vec2(scale, scale),
    shadowOffset: SHADOW_OFFSET * s * scale,
    tint: k.rgb(level, level, level)
  }
}
function stepGlyph(inst, glyph, dt) {
  glyph.x = wrap(glyph.x + glyph.vx * dt, inst.width)
  glyph.y = wrap(glyph.y + glyph.vy * dt, inst.height)
  glyph.spinLeft -= dt
  if (glyph.spinLeft <= 0) {
    glyph.spinLeft = nextSpinChange()
    glyph.spinTarget = randomSpin()
  }
  glyph.spin += (glyph.spinTarget - glyph.spin) * Math.min(1, dt * SPIN_EASE)
  glyph.angle = (glyph.angle + glyph.spin * dt) % FULL_TURN_DEG
}
function wrap(value, size) {
  if (value < -EDGE_MARGIN) return value + size + EDGE_MARGIN * 2
  if (value > size + EDGE_MARGIN) return value - size - EDGE_MARGIN * 2
  return value
}
function randomSpin() {
  return (Math.random() * 2 - 1) * SPIN_SPEED_MAX
}
function nextSpinChange() {
  return SPIN_CHANGE_MIN + Math.random() * SPIN_CHANGE_RANGE
}
