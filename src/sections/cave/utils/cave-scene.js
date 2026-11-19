import { CAVE_CFG } from '../cfg.js'
import * as Earth from './cave-earth.js'
import * as Platform from './cave-platform.js'
import * as Plants from './cave-plants.js'
import * as LakeBed from './cave-lake-bed.js'
import * as Layout from './cave-layout.js'
import * as Ground from './cave-ground.js'
//
// Earth runs this far past the world edges (and above / below it).
//
const ART_PAD = 40
const OUTLINE_STEP = 8
//
// Under the lake: everything painted below its surface down to
// SUBMERSION_INTO_BED px into the bowl's soil sinks into the water tint
// (the bed, its stones), more so the deeper — only in the columns where
// the soil lies under the surface (never the banks' soil beside it). The
// tint reaches down to the deepest point of that (measured off the bed),
// so it never stops short of the bed anywhere.
//
const WATER = CAVE_CFG.water
const SUBMERSION_INTO_BED = 30
const SUBMERSION_TOP_ALPHA = 0.25
const SUBMERSION_DEEP_ALPHA = 0.6
const BYTE_MAX = 255
const HEX_RADIX = 16
//
// Seeds of the masses that have no platform entry.
//
const CEILING_SEED = 101
const LEFT_WALL_SEED = 103
const RIGHT_WALL_SEED = 107
const WALL_TOP_Y = 0
//
// Nothing of the ceiling (its lowest part with what hangs from it) reaches
// below this.
//
const CEILING_REACH_Y = 720
let submersionBottom = null

/**
 * Paints every solid part of the cave that reaches into a world rect,
 * with its plants (and, over the lake's tinted bed, its own stones and
 * plants). The context must already be translated so world coordinates land
 * on the canvas (its clip does the rest).
 * @param {CanvasRenderingContext2D} ctx - World-translated context
 * @param {{x1: number, y1: number, x2: number, y2: number}} rect - World rect to cover
 * @param {boolean} [withLake=false] - Tint what lies under the lake's surface
 */
export function paintTerrain(ctx, rect, withLake = false) {
  const inLake = withLake && overlaps(rect, Layout.LAKE_X1, Layout.LAKE_SURFACE_Y, Layout.LAKE_X2, deepestSubmersion())
  overlaps(rect, -ART_PAD, WALL_TOP_Y, Layout.WALL_COLLIDE_W * 3, Layout.WORLD_H + ART_PAD) && paintWall(ctx, -1)
  overlaps(rect, Layout.WORLD_W - Layout.WALL_COLLIDE_W * 3, WALL_TOP_Y, Layout.WORLD_W + ART_PAD, Layout.WORLD_H + ART_PAD) && paintWall(ctx, 1)
  paintCeiling(ctx, rect)
  Layout.PLATFORMS.forEach(p => Platform.paint(ctx, rect, p))
  Plants.paint(ctx, rect)
  inLake && paintSubmersion(ctx)
  inLake && LakeBed.paint(ctx, rect)
}

/**
 * The room's own soil — both side walls and the ceiling's two masses — as
 * layers (built once per page), for what clings to them (cave-surface.js).
 * @returns {Array<{canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, x: number, y: number}>}
 */
export function roomLayers() {
  return [wallMass(-1), wallMass(1), ...ceilingMasses()].map(mass => Earth.massLayerOf(mass.body, mass.opts))
}

//
// Everything already painted under the lake's surface between its banks
// sinks into the water: tinted toward the deep, more so the deeper.
//
function paintSubmersion(ctx) {
  const top = Layout.LAKE_SURFACE_Y
  const bottom = deepestSubmersion()
  const floor = Layout.lakeFloor()
  const g = ctx.createLinearGradient(0, top, 0, bottom)
  g.addColorStop(0, hexAlpha(WATER.water, SUBMERSION_TOP_ALPHA))
  g.addColorStop(1, hexAlpha(WATER.paint.deep, SUBMERSION_DEEP_ALPHA))
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(Layout.LAKE_X1, top)
  for (let x = Layout.LAKE_X1; x <= Layout.LAKE_X2; x++) {
    const bed = Ground.topAt(floor, x)
    ctx.lineTo(x, bed > top ? bed + SUBMERSION_INTO_BED : top)
  }
  ctx.lineTo(Layout.LAKE_X2, top)
  ctx.closePath()
  ctx.clip()
  ctx.globalCompositeOperation = 'source-atop'
  ctx.fillStyle = g
  ctx.fillRect(Layout.LAKE_X1, top, Layout.LAKE_X2 - Layout.LAKE_X1, bottom - top)
  ctx.restore()
}
//
// The lowest Y the tint reaches: SUBMERSION_INTO_BED under the bed's
// deepest point (measured once per page).
//
function deepestSubmersion() {
  if (submersionBottom !== null) return submersionBottom
  const floor = Layout.lakeFloor()
  let bed = Layout.LAKE_SURFACE_Y
  for (let x = Layout.LAKE_X1; x <= Layout.LAKE_X2; x++) bed = Math.max(bed, Ground.topAt(floor, x))
  submersionBottom = bed + SUBMERSION_INTO_BED
  return submersionBottom
}
//
// A side wall from the ceiling down: the world edge to its ragged face,
// edged with the underside's ragged pieces turned on their side (the
// chain runs up the left wall and down the right one, so their ragged
// side faces the room), left unshaded like the platforms.
//
function paintWall(ctx, dir) {
  const mass = wallMass(dir)
  Earth.paintMass(ctx, mass.body, mass.opts)
}
//
// A side wall's soil mass (dir -1: the left one) and how it is laid.
//
function wallMass(dir) {
  const left = dir < 0
  const edge = left ? -ART_PAD : Layout.WORLD_W + ART_PAD
  const face = []
  for (let y = WALL_TOP_Y; y <= Layout.WORLD_H + ART_PAD; y += OUTLINE_STEP) face.push({ x: left ? Layout.leftWallX(y) : Layout.rightWallX(y), y })
  const inner = face.map(pt => ({ x: pt.x + dir * Earth.CORE_INSET, y: pt.y }))
  const body = {
    core: [{ x: edge, y: WALL_TOP_Y }, ...inner, { x: edge, y: Layout.WORLD_H + ART_PAD }],
    edges: [{ name: 'edgeB', pts: left ? face.slice().reverse() : face }]
  }
  return { body, opts: { key: left ? 'wallL' : 'wallR', seed: left ? LEFT_WALL_SEED : RIGHT_WALL_SEED, plain: true } }
}
//
// Ceiling in two soil masses either side of the roots' hole, left
// unshaded (the platforms' colour): a ragged underside (edgeB) along its
// line, a ragged lip down each wandering side of the hole (the
// underside's pieces turned on their side, as on a ledge's free end, the
// chain run so their ragged side faces the hole) and a corner piece where
// the lip meets the underside.
//
function paintCeiling(ctx, rect) {
  if (rect.y1 > CEILING_REACH_Y) return
  ceilingMasses().forEach(mass => Earth.paintMass(ctx, mass.body, mass.opts))
}
//
// The ceiling's two soil masses and how each is laid.
//
function ceilingMasses() {
  return [
    { body: ceilingBody(-ART_PAD, 1), opts: { key: 'ceilingL', seed: CEILING_SEED, plain: true } },
    { body: ceilingBody(Layout.WORLD_W + ART_PAD, -1), opts: { key: 'ceilingR', seed: CEILING_SEED + 1, plain: true } }
  ]
}
//
// One ceiling mass from its outer end `outerX` to the hole; `lip` is the
// side the hole is on (1: its right end, -1: its left end). The lip runs
// down the hole's side (Layout.entrySideX) to where the underside meets
// it.
//
function ceilingBody(outerX, lip) {
  const top = -ART_PAD
  const side = -lip
  const lipY = Layout.ceilingBottomAt(Layout.ENTRY_X + side * Layout.ENTRY_HALF_W)
  const lipPts = []
  for (let y = top; y < lipY; y += OUTLINE_STEP) lipPts.push({ x: Layout.entrySideX(y, side), y })
  lipPts.push({ x: Layout.entrySideX(lipY, side), y: lipY })
  const lipX = lipPts[lipPts.length - 1].x
  const [x1, x2] = lip > 0 ? [outerX, lipX] : [lipX, outerX]
  const under = []
  for (let x = x1; x < x2; x += OUTLINE_STEP) under.push({ x, y: Layout.ceilingBottomAt(x) })
  under.push({ x: x2, y: Layout.ceilingBottomAt(x2) })
  const inner = under.map(pt => ({ x: pt.x, y: pt.y - Earth.CORE_INSET }))
  const lipIn = lipPts.map(pt => ({ x: pt.x - lip * Earth.CORE_INSET, y: pt.y }))
  const lipInX = lipX - lip * Earth.CORE_INSET
  const core = lip > 0
    ? [{ x: x1, y: top }, ...lipIn, ...inner.filter(pt => pt.x <= lipInX).reverse()]
    : [{ x: x2, y: top }, ...inner.filter(pt => pt.x >= lipInX).reverse(), ...lipIn.reverse()]
  return {
    core,
    edges: [
      { name: 'edgeB', pts: under },
      { name: 'edgeB', pts: lip > 0 ? lipPts.slice().reverse() : lipPts }
    ],
    corners: [{ name: lip > 0 ? 'cornerBR' : 'cornerBL', x: lipX, y: lipY }]
  }
}
function hexAlpha(hex, alpha) {
  return hex + Math.round(alpha * BYTE_MAX).toString(HEX_RADIX).padStart(2, '0')
}
function overlaps(rect, x1, y1, x2, y2) {
  return x2 >= rect.x1 && x1 <= rect.x2 && y2 >= rect.y1 && y1 <= rect.y2
}
