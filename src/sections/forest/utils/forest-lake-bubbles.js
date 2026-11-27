import { CFG } from '../../../cfg.js'
import * as Bubbles from '../../../components/bubbles.js'
import * as Lake from '../../../components/lake.js'
//
// The forest lake's bubbles (components/bubbles.js): now and then a few
// come up off its sandy floor — anywhere on the floor's face, from its far
// rim to its front edge, BED_OFF px over it, where the open water is
// DEEP_MIN px deep or more (a spot tried at most PICK_TRIES times, never
// under the right bank's hollow) — and rise to the surface, where each
// pops with a tiny ripple (POP_WAVE of a full splash per px of its
// radius). The lake is small: its bursts come PACE times as far apart as
// a big lake's. They take the water's own colours and depth gradient.
//
const PAINT = CFG.visual.colors.palette.waterPaint
const DEEP_MIN = 34
const PICK_TRIES = 10
const BED_OFF = 2
const PACE = 2.5
const POP_WAVE = 0.04

/**
 * Creates the forest lake's bubbles.
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay instance
 * @param {Object} cfg.lake - Lake inst (components/lake.js)
 * @returns {Object} Bubbles instance
 */
export function create(cfg) {
  const { k, lake } = cfg
  return Bubbles.create({
    k,
    colors: { body: PAINT.bubble, rim: PAINT.bubbleRim, depthLight: PAINT.depthLight, depthDark: PAINT.depthDark },
    pickSpot: () => pickSpot(lake),
    topAt: x => Lake.surfaceAt(lake, x),
    surfaceAt: x => Lake.surfaceAt(lake, x),
    tintAt: (y, out) => Lake.depthTintAt(lake, y, out),
    onPop: (x, r) => Lake.disturb(lake, x, r * POP_WAVE),
    pace: PACE
  })
}

/**
 * Runs them on (Bubbles.onUpdate).
 * @param {Object} inst - Bubbles instance
 */
export function onUpdate(inst) {
  Bubbles.onUpdate(inst)
}

/**
 * Draws them over the water's paint (Bubbles.onDraw).
 * @param {Object} inst - Bubbles instance
 */
export function onDraw(inst) {
  Bubbles.onDraw(inst)
}
//
// A spot on the floor's face under deep enough open water (null if none
// was found).
//
function pickSpot(lake) {
  const from = lake.islandShoreLocalX
  const to = lake.hollow?.x0 ?? lake.bakeSpan
  for (let i = 0; i < PICK_TRIES; i++) {
    const localX = from + Math.random() * (to - from)
    const bottom = Lake.lakeBottomLocalY(lake, localX)
    if (lake.originY + bottom - lake.surfaceY < DEEP_MIN) continue
    const rim = Lake.lakeBedRimLocalY(lake, localX)
    return { x: lake.x1 + localX, y: lake.originY + rim + Math.random() * (bottom - rim) - BED_OFF }
  }
  return null
}
