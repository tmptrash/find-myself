import * as Bubbles from '../../../components/bubbles.js'
import { CAVE_CFG } from '../cfg.js'
import * as CaveLake from '../utils/cave-lake.js'
import * as Ground from '../utils/cave-ground.js'
//
// The cave lake's bubbles (components/bubbles.js): they come up off its
// bed where the water is DEEP_MIN px deep or more (a spot read at most
// PICK_TRIES times), out of its swimming fish's mouths, and rise to its
// surface — or are gone under a bank hollow's soil ceiling — in the
// lake's own colours and depth gradient.
//
const C = CAVE_CFG.bubbles
const LAKE_PAINT = CAVE_CFG.water.paint
const DEEP_MIN = 40
const PICK_TRIES = 12
const BED_OFF = 2

/**
 * Creates the lake's bubbles.
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay instance
 * @param {Object} cfg.lake - Lake instance (cave-lake.js)
 * @param {(x: number, r: number) => void} [cfg.onPop] - A bubble popped on the surface (its X, its radius), to be heard
 * @returns {Object} Bubbles instance
 */
export function create(cfg) {
  const { k, lake } = cfg
  return Bubbles.create({
    k,
    colors: { body: C.body, rim: C.rim, depthLight: LAKE_PAINT.depthLight, depthDark: LAKE_PAINT.depthDark },
    pickSpot,
    topAt: x => CaveLake.waterTopAt(lake, x),
    surfaceAt: x => CaveLake.surfaceAt(lake, x),
    tintAt: (y, out) => CaveLake.depthTintAt(lake, y, out),
    onPop: cfg.onPop
  })
}

/**
 * Runs them on (Bubbles.onUpdate).
 * @param {Object} inst - Bubbles instance
 * @param {Array<{at: {x: number, y: number}, size: number}>} [mouths] - The swimming fish's mouths
 */
export function onUpdate(inst, mouths) {
  Bubbles.onUpdate(inst, mouths)
}

/**
 * Draws them over the water's paint (Bubbles.onDraw).
 * @param {Object} inst - Bubbles instance
 * @param {{left: number, right: number, top: number, bottom: number}} view - World rect in view
 */
export function onDraw(inst, view) {
  Bubbles.onDraw(inst, view)
}
//
// A spot on the bed under deep enough water (null if none was found).
//
function pickSpot() {
  const water = Ground.waterColumns()
  for (let i = 0; i < PICK_TRIES; i++) {
    const c = Math.floor(Math.random() * water.tops.length)
    const top = water.tops[c]
    const bed = water.beds[c]
    if (Number.isNaN(top) || Number.isNaN(bed) || bed - top < DEEP_MIN) continue
    return { x: water.x0 + c, y: bed - BED_OFF }
  }
  return null
}
