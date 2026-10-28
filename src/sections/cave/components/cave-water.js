import { getRGB } from '../../../utils/helper.js'
import * as Lake from '../../forest/utils/forest-lake.js'
import * as Glow from '../utils/cave-glow.js'
import * as Layout from '../utils/cave-layout.js'
import { CAVE_PAL } from '../utils/cave-paint.js'
//
// Underground lake in the look of the forest lake (the same shared module):
// see-through water with the baked wave cycle, the bed layer and swaying
// algae. The cave's rock basin starts under the lake bed, so the terrain
// bake reads the bed line from here. On top, squashed reflections of the
// glowing mushrooms near the shore.
//
const SPRITE_KEY = 'cave0'
//
// The forest lake's water surface sits this far above its ground line.
//
const FLOOR_BELOW_SURFACE = 8
//
// Mushroom reflections: max height above the water, squash, size, wobble.
//
const REFLECT_MAX_DY = 140
const REFLECT_SQUASH = 0.22
const REFLECT_OPACITY = 0.4
const REFLECT_RADIUS = 0.5
const REFLECT_WOBBLE_SPEED = 1.6
const REFLECT_WOBBLE_PX = 3

/**
 * Creates the lake.
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay instance
 * @param {Array<{x: number, y: number, light: number}>} cfg.reflected - Glowing mushrooms to reflect
 * @returns {Object} Cave lake instance
 */
export function create(cfg) {
  const { k, reflected } = cfg
  Glow.create(k)
  return {
    k,
    lake: createLake(k),
    reflections: reflected.filter(m => Layout.LAKE_SURFACE_Y - m.y < REFLECT_MAX_DY),
    haloRgb: getRGB(k, CAVE_PAL.glowTint)
  }
}

/**
 * Draws the lake bed and algae (back world pass).
 * @param {Object} inst - Cave lake instance
 */
export function onDrawBed(inst) {
  Lake.drawBed(inst.k, inst.lake)
  Lake.drawAlgae(inst.k, inst.lake)
}

/**
 * Draws the see-through water (front world pass, over a drowning hero).
 * @param {Object} inst - Cave lake instance
 */
export function onDrawFill(inst) {
  Lake.drawFill(inst.k, inst.lake)
}

/**
 * Squashed glow reflections of the shore mushrooms (additive glow pass).
 * @param {Object} inst - Cave lake instance
 */
export function onDrawGlints(inst) {
  const k = inst.k
  const t = k.time()
  inst.reflections.forEach((m, i) => {
    const wobble = Math.sin(t * REFLECT_WOBBLE_SPEED + i) * REFLECT_WOBBLE_PX
    Glow.drawGlow(k, m.x + wobble, Layout.LAKE_SURFACE_Y + (Layout.LAKE_SURFACE_Y - m.y) * REFLECT_SQUASH,
      m.light * REFLECT_RADIUS, inst.haloRgb, REFLECT_OPACITY, REFLECT_SQUASH)
  })
}
//
// The shared forest lake (built once per k) fitted to the cave basin; its
// bed line also shapes the terrain's rock basin.
//
function createLake(k) {
  return Lake.create({
    k,
    x1: Layout.LAKE_X1,
    x2Core: Layout.LAKE_X2,
    surfaceY: Layout.LAKE_SURFACE_Y,
    floorY: Layout.LAKE_SURFACE_Y + FLOOR_BELOW_SURFACE,
    spriteKey: SPRITE_KEY
  })
}
