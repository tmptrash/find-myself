import * as Lantern from '../components/cave-lantern.js'
import * as Pads from '../components/cave-pads.js'
import * as Atlas from './cave-atlas.js'
import * as Front from './cave-front.js'
import * as Layout from './cave-layout.js'
import * as Surface from './cave-surface.js'
//
// What is solid to the climber (cave-haggy.js, cave-haggy-nav.js): the
// platforms' soil and the solid things on it — the stones in front of
// the hero (with their joints) and the dry mushroom — and the pad
// plant's crown of leaves lying on the lake. Plants are not: it goes
// through them as the hero does. Its hands hold all of that, its limbs
// and head keep out of all of it. One mask, built once per page (the
// first time it is asked) from those things' own pictures. The hero's
// and the small creatures' ground is the soil's mask alone
// (cave-surface.js).
//
let solid = null

/**
 * Whether a world point is solid to the climber (soil, or a thing on it).
 * Whole numbers pass without garbage.
 * @param {number} x - World X
 * @param {number} y - World Y
 * @returns {boolean}
 */
export function isSolid(x, y) {
  solid ??= build()
  return Surface.isSoilIn(solid.mask, x, y)
}

/**
 * The runs round everything solid to the climber (cave-surface.js runs,
 * traced once per page).
 * @returns {Array<Object>} Runs, as Surface.crawlRuns()
 */
export function runs() {
  solid ??= build()
  return Surface.climbRunsOf(solid.mask)
}

/**
 * Whether a world point is over the pad plant's crown (above the lake's
 * surface, within the crown's span): no water there to keep out of.
 * @param {number} x - World X
 * @param {number} y - World Y
 * @returns {boolean}
 */
export function isOverPads(x, y) {
  solid ??= build()
  return y < Layout.LAKE_SURFACE_Y && x >= solid.padsX1 && x <= solid.padsX2
}
//
// The mask, and the pad crown's span.
//
function build() {
  const crown = Pads.crownLayer()
  return {
    mask: Surface.maskWith([...Front.stoneLayers(), lanternLayer(), crown].filter(Boolean)),
    padsX1: crown ? crown.x : Infinity,
    padsX2: crown ? crown.x + crown.canvas.width : -Infinity
  }
}
//
// The dry mushroom's picture standing on its platform (as cave-level.js
// sets it).
//
function lanternLayer() {
  const src = Atlas.piece(Lantern.LANTERN_PIECE)
  if (!src) return null
  const p = Layout.PLATFORMS.find(q => q.id === Layout.LANTERN.on)
  const w = Atlas.widthAt(Lantern.LANTERN_PIECE, Lantern.LANTERN_H)
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(w)
  canvas.height = Lantern.LANTERN_H
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(src, 0, 0, w, Lantern.LANTERN_H)
  return { canvas, ctx, x: Layout.LANTERN.x - w / 2, y: Lantern.footYOn(p, Layout.LANTERN.x) - Lantern.LANTERN_H }
}
