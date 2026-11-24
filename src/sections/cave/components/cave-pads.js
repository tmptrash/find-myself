import { getRGB } from '../../../utils/helper.js'
import { applyForestFilmGrainToCanvas } from '../../forest/utils/forest-parallax-grain.js'
import { CAVE_CFG } from '../cfg.js'
import * as Atlas from '../utils/cave-atlas.js'
import * as Layout from '../utils/cave-layout.js'
import * as CaveLake from '../utils/cave-lake.js'
//
// The pad plant (plant_mid.png): it grows up out of the lake's bed a jump
// right of where the lurker chews (cave-lurker.js), its stems reaching the
// surface, where its crown of round leaves lies flat on the water — ground
// the hero can walk on: a line along the leaves' own top edge (Ground's
// moving lines, crownLine), his feet rayed onto it. Its crown
// stays still on the water (drawn over the surface, with the things on
// it) — but for the hero landing on it: it gives a little under him and
// springs back (sag), and waves run off both its ends; and for the waves
// coming in from either side: it rocks on them (rock); under the water
// its stems and broad leaves sway a little — drawn
// in SLICES horizontal strips, each shifted across by a slow wave, none at
// the crown nor at the foot. The stems reach down to the bed wherever it
// lies: only they are drawn longer or shorter (the crown keeps its size).
//
const SPRITE = 'cave0-pads'
const GRAIN_SEED = 9660
const C = CAVE_CFG.pads
//
// Size: world px per sheet px; the picture is baked BAKE_OVER times finer.
// Its crown lies PAD_DX px right of the left bank's tip (its stems sweep
// down to the right from it, to their foot on the bed).
//
const SCALE = 0.22
const BAKE_OVER = 2.5
const PAD_DX = 400
//
// The picture (padPlant piece px): the crown's rows (0..CROWN_H), the row
// lying on the surface (AFLOAT), the crown's middle (MID_X); the leaves'
// top edge the hero walks on (the first opaque row down every
// WALK_STEP'th column from WALK_X1 to WALK_X2, holding up feet HOLD_SLACK
// px into it); the stems' foot, off to the right of the crown (FOOT_X,
// FOOT_Y), sunk FOOT_SINK px into the bed (the bed's soil, drawn over it,
// hides where its stems were cut off).
//
const CROWN_H = 130
const AFLOAT = 66
const MID_X = 467
const WALK_X1 = 42
const WALK_X2 = 902
const WALK_STEP = 4
const SOLID_ALPHA = 128
const RGBA = 4
const ALPHA_OFFSET = 3
const FOOT_X = 927
const FOOT_Y = 910
const FOOT_SINK = 22
const HOLD_SLACK = 12
//
// The hero walks LINE_DROP px under the leaves' top edge (in among them).
// Landing on them he presses them down: a kick of SAG_KICK px/s, a spring
// (SAG_K, damped SAG_DAMP) back toward SAG_HOLD px down while he stands on
// them (else none); the stems give with them, less the deeper.
//
const LINE_DROP = 5
const SAG_KICK = 70
const SAG_K = 140
const SAG_DAMP = 11
const SAG_HOLD = 1.5
//
// The crown rocks on the waves: it rises and falls with the surface under
// its two ends (EDGE_IN px in from them), ROCK_SHARE of it, and tilts by
// their difference (TILT_SHARE of it, never past TILT_MAX degrees) about
// its middle, following on a soft spring (ROCK_K, damped ROCK_DAMP): it
// lags a little behind the water and sways a little past. The hero
// landing on it sends waves off both its ends (LAND_WAVE of a splash).
//
const EDGE_IN = 12
const ROCK_SHARE = 0.6
const TILT_SHARE = 1.2
const TILT_MAX = 3
const ROCK_K = 30
const ROCK_DAMP = 5
const LAND_WAVE = 0.7
const DEG = 180 / Math.PI
const HALF = 0.5
//
// The sway under the water: SLICES strips, shifted up to SWAY px across by
// a wave running down at SWAY_HZ (WAVE_TURNS of it along the stems).
//
const SLICES = 30
const SWAY = 2.5
const SWAY_HZ = 0.3
const WAVE_TURNS = 1.2
const SLICE_OVERLAP = 0.5
const FULL_TURN = Math.PI * 2
const bakedFor = new WeakSet()
let picture = null

/**
 * Creates the pad plant in the lake.
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay instance
 * @param {Object} cfg.lake - Lake instance (cave-lake.js)
 * @returns {Object} Pads instance
 */
export function create(cfg) {
  const { k, lake } = cfg
  bake(k)
  const x = Layout.BANK_TIP_X + PAD_DX
  const surface = Layout.LAKE_SURFACE_Y
  const top = surface - AFLOAT * SCALE
  const crownBottom = top + CROWN_H * SCALE
  const foot = CaveLake.bedTopAt(lake, x + (FOOT_X - MID_X) * SCALE) + FOOT_SINK
  const left = x - MID_X * SCALE
  const edge = crownEdge().map(p => ({ x: left + p.x * SCALE, y: top + p.y * SCALE }))
  const span = { x1: edge[0].x, x2: edge[edge.length - 1].x }
  const inst = {
    k,
    lake,
    x,
    span,
    edge,
    line: null,
    left,
    top,
    crownBottom,
    stemScale: (foot - crownBottom) / ((FOOT_Y - CROWN_H) * SCALE),
    width: picture ? picture.width / BAKE_OVER : 0,
    color: getRGB(k, C.tint),
    sag: 0,
    sagV: 0,
    heave: 0,
    heaveV: 0,
    tilt: 0,
    tiltV: 0,
    ridden: false,
    v: k.vec2(0, 0),
    pivot: k.vec2(0, 0)
  }
  inst.line = { moving: true, id: 'padCrown', span: () => span, at: px => walkAt(inst, px) }
  return inst
}

/**
 * Whether the hero stands on its leaves now (he presses them down as he
 * lands, and waves run off both their ends).
 * @param {Object} inst - Pads instance
 * @param {boolean} riding - He stands on them
 */
export function bear(inst, riding) {
  riding && !inst.ridden && land(inst)
  inst.ridden = riding
}

/**
 * Runs its leaves' give under the hero and their rocking on the waves on.
 * @param {Object} inst - Pads instance
 */
export function onUpdate(inst) {
  const dt = inst.k.dt()
  const to = inst.ridden ? SAG_HOLD : 0
  inst.sagV += (SAG_K * (to - inst.sag) - SAG_DAMP * inst.sagV) * dt
  inst.sag += inst.sagV * dt
  rock(inst, dt)
}

/**
 * The stretch of the surface its crown of leaves lies over.
 * @param {Object} inst - Pads instance
 * @returns {{x1: number, x2: number}}
 */
export function crownSpan(inst) {
  return { x1: inst.span.x1, x2: inst.span.x2 }
}

/**
 * Whether its leaves hold up feet at (x, feetY): over them, at most their
 * body's thickness and HOLD_SLACK px into them (a hero landing on them is
 * not in the water).
 * @param {Object} inst - Pads instance
 * @param {number} x - World X
 * @param {number} feetY - World Y of the feet
 * @returns {boolean}
 */
export function holds(inst, x, feetY) {
  const y = walkAt(inst, x)
  return y !== null && feetY <= y + HOLD_SLACK
}

/**
 * The top edge of its crown of leaves as a line to walk on (Ground's
 * moving lines).
 * @param {Object} inst - Pads instance
 * @returns {Object} Ground moving line
 */
export function crownLine(inst) {
  return inst.line
}

/**
 * Draws its stems and leaves under the water, swaying (before the water's
 * see-through paint).
 * @param {Object} inst - Pads instance
 * @param {{left: number, right: number}} view - World rect in view
 */
export function onDraw(inst, view) {
  if (!visible(inst, view)) return
  const k = inst.k
  const rows = FOOT_Y - CROWN_H
  const sliceRows = rows / SLICES
  const phase = k.time() * SWAY_HZ * FULL_TURN
  for (let i = 0; i < SLICES; i++) {
    const u = (i + SLICE_OVERLAP) / SLICES
    const shift = SWAY * Math.sin(Math.PI * u) * Math.sin(phase - u * WAVE_TURNS * FULL_TURN)
    const from = CROWN_H + i * sliceRows
    const give = (inst.sag + inst.heave) * (1 - i / SLICES)
    drawRows(inst, from, sliceRows + SLICE_OVERLAP, inst.left + shift, inst.crownBottom + give + i * sliceRows * SCALE * inst.stemScale, inst.stemScale)
  }
}

/**
 * Draws its crown of leaves lying on the water (over the surface), pressed
 * down and rocking about its middle on the surface.
 * @param {Object} inst - Pads instance
 * @param {{left: number, right: number}} view - World rect in view
 */
export function onDrawCrown(inst, view) {
  if (!visible(inst, view)) return
  const k = inst.k
  const surface = Layout.LAKE_SURFACE_Y
  k.pushTransform()
  k.pushTranslate(inst.pivot.set(inst.x, surface + inst.sag + inst.heave))
  k.pushRotate(inst.tilt)
  drawRows(inst, 0, CROWN_H, inst.left - inst.x, inst.top - surface, 1)
  k.popTransform()
}
//
// Where the hero walks on the leaves at a world X (null off them): a little
// in under their top edge, pressed down and rocking with them.
//
function walkAt(inst, x) {
  const y = edgeAt(inst.edge, x)
  return y === null ? null : y + LINE_DROP + inst.sag + inst.heave + (x - inst.x) * Math.tan(inst.tilt / DEG)
}
//
// The hero landed on the leaves: they give under him, and waves run off
// both their ends.
//
function land(inst) {
  inst.sagV += SAG_KICK
  CaveLake.disturb(inst.lake, inst.span.x1, LAND_WAVE)
  CaveLake.disturb(inst.lake, inst.span.x2, LAND_WAVE)
}
//
// The crown following the surface under its ends on its spring (see
// ROCK_SHARE): up and down by their mean, tilted by their difference.
//
function rock(inst, dt) {
  const { span } = inst
  const left = CaveLake.surfaceAt(inst.lake, span.x1 + EDGE_IN) - Layout.LAKE_SURFACE_Y
  const right = CaveLake.surfaceAt(inst.lake, span.x2 - EDGE_IN) - Layout.LAKE_SURFACE_Y
  const heave = ROCK_SHARE * (left + right) * HALF
  const tilt = Math.max(-TILT_MAX, Math.min(TILT_MAX, Math.atan2((right - left) * TILT_SHARE, span.x2 - span.x1) * DEG))
  inst.heaveV += (ROCK_K * (heave - inst.heave) - ROCK_DAMP * inst.heaveV) * dt
  inst.heave += inst.heaveV * dt
  inst.tiltV += (ROCK_K * (tilt - inst.tilt) - ROCK_DAMP * inst.tiltV) * dt
  inst.tilt += inst.tiltV * dt
}
//
// The crown's top edge at a world X (null off it).
//
function edgeAt(edge, x) {
  if (x < edge[0].x || x > edge[edge.length - 1].x) return null
  let i = 1
  while (i < edge.length - 1 && edge[i].x < x) i++
  const a = edge[i - 1]
  const b = edge[i]
  return a.y + (b.y - a.y) * (b.x > a.x ? (x - a.x) / (b.x - a.x) : 0)
}
//
// The crown's top edge on the picture (piece px): the first opaque row
// down every WALK_STEP'th column of the crown.
//
function crownEdge() {
  const src = Atlas.piece('padPlant')
  const w = src.width
  const data = src.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, CROWN_H).data
  const out = []
  for (let x = WALK_X1; x <= WALK_X2; x += WALK_STEP) {
    for (let y = 0; y < CROWN_H; y++) {
      if (data[(y * w + x) * RGBA + ALPHA_OFFSET] < SOLID_ALPHA) continue
      out.push({ x, y })
      break
    }
  }
  return out
}
function visible(inst, view) {
  return inst.width > 0 && inst.left + inst.width >= view.left && inst.left <= view.right
}
//
// Rows of the picture (piece px) drawn at a world top-left, stretched
// down `stretch` times.
//
function drawRows(inst, from, count, x, y, stretch) {
  const h = picture.height / BAKE_OVER
  inst.k.drawSprite({
    sprite: SPRITE,
    quad: { x: 0, y: from * SCALE / h, w: 1, h: count * SCALE / h },
    width: inst.width,
    height: count * SCALE * stretch,
    pos: inst.v.set(x, y),
    color: inst.color
  })
}
//
// The picture baked once per page at BAKE_OVER times its drawn size,
// grained, loaded once per live k.
//
function bake(k) {
  if (bakedFor.has(k)) return
  picture ??= paint()
  if (!picture) return
  k.loadSprite(SPRITE, picture, { singular: true, filter: 'linear' })
  bakedFor.add(k)
}
function paint() {
  const src = Atlas.piece('padPlant')
  if (!src) return null
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(src.width * SCALE * BAKE_OVER)
  canvas.height = Math.ceil(src.height * SCALE * BAKE_OVER)
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(src, 0, 0, canvas.width, canvas.height)
  applyForestFilmGrainToCanvas(canvas, GRAIN_SEED)
  return canvas
}
