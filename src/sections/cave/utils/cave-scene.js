import { createSeededRandom } from '../../../utils/seeded-random.js'
import { CAVE_CFG } from '../cfg.js'
import * as Atlas from './cave-atlas.js'
import * as Earth from './cave-earth.js'
import * as Platform from './cave-platform.js'
import * as Layout from './cave-layout.js'
//
// Earth runs this far past the world edges (and above / below it).
//
const ART_PAD = 40
const OUTLINE_STEP = 8
//
// Ledge underside: lobes, small drip jags, the rounded nose at the free end.
//
const LOBE_AMP = 18
const LOBE_LEN = 70
const JAG_EVERY = 26
const JAG_DEPTH_MIN = 4
const JAG_DEPTH_RANGE = 9
const NOSE_MAX = 70
const TIP_POW = 1.2
//
// Ground banks into the lake: the face drops steeply, then slopes under
// the water down past the bed.
//
const BANK = [
  { dx: 0, dy: 0 },
  { dx: 8, dy: 26 },
  { dx: 22, dy: 70 },
  { dx: 46, dy: 140 },
  { dx: 70, dy: 260 }
]
//
// Pillars flare toward their foot, which stands under the lake bed.
//
const PILLAR_FLARE = 16
const PILLAR_FOOT_BELOW_WATER = 320
const PILLAR_CORNER = 6
const PILLAR_JITTER = 3
//
// Stones under a top start this far below it (the platforms cover them
// there); under a pillar platform at this share of its depth.
//
const MASS_UNDER_TOP = 20
const PILLAR_MASS_FROM = 0.6
//
// Under the lake: the earth mass starts a little under the lake's own bed
// line; banks and pillars below the surface sink into the water tint.
//
const WATER = CAVE_CFG.water
const BASIN_SEED = 109
//
// The lake's bed: a parabola from bank to bank, BED_EDGE under the
// surface at the banks and BED_DEPTH under it mid-way, paved with stones
// (an earth mass under that line) over the murky deep water behind.
//
const BED_EDGE = 10
const BED_DEPTH = 120
const SUBMERSION_PAD = 90
const SUBMERSION_DEPTH = 260
const SUBMERSION_TOP_ALPHA = 0.2
const SUBMERSION_DEEP_ALPHA = 0.55
const BYTE_MAX = 255
const HEX_RADIX = 16
//
// The roots' hole: ragged lips, roots hanging into it.
//
const HOLE_LIP_JAG = 8
const HOLE_SEED = 77
//
// Element seeds of the masses that have no platform entry.
//
const CEILING_SEED = 101
const LEFT_WALL_SEED = 103
const RIGHT_WALL_SEED = 107
const WALL_TOP_Y = 0
const WALL_ROOTS = 0.3
//
// Nothing of the ceiling (its lowest part with what hangs from it) reaches
// below this.
//
const CEILING_REACH_Y = 460
//
// Prop foot sinks this far into the moss.
//
const PROP_SINK = 3
//
// A side plant's root side sinks this far into its wall; a glow sits this
// share of a prop's height over its foot.
//
const SIDE_SINK = 10
const GLOW_UP = 0.6
//
// Props (plants from the plants sheet, crystals from the stones sheet):
// piece, X, height, mirrored, and where it grows —
//   on: a platform, standing on its top at X;
//   hang: from the ceiling at X;  under: from a ledge's underside at X;
//   wall: 'left' / 'right', growing sideways out of that wall at height y
//   (or out of a ledge's end face at X `at` — rock on that side of it).
// `glow` names the colour of a soft light round a glowing one.
//
const PROPS = [
  { name: 'shroom4', x: 430, on: 'upper', h: 46, glow: 'tealGlow' },
  { name: 'grow5', x: 520, on: 'upper', h: 48 },
  { name: 'sprout7', x: 600, on: 'upper', h: 22 },
  { name: 'bush9', x: 735, on: 'upper', h: 50 },
  { name: 'grow0', x: 828, on: 'upper', h: 24 },
  { name: 'grow7', x: 935, on: 'upper', h: 34 },
  { name: 'grow4', x: 1180, on: 'upper', h: 56, flip: true },
  { name: 'shroom6', x: 1270, on: 'upper', h: 26 },
  { name: 'bush2', x: 1352, on: 'upper', h: 34 },
  { name: 'grow8', x: 1450, on: 'upper', h: 40 },
  { name: 'goldCrystals', x: 1515, on: 'upper', h: 30, glow: 'lanternGlow' },
  { name: 'goldCrystals', x: 1712, on: 'eyeLedge', h: 40, flip: true, glow: 'lanternGlow' },
  { name: 'bush10', x: 1786, on: 'eyeLedge', h: 34 },
  { name: 'shroom12', x: 1990, on: 'eyeLedge', h: 30 },
  { name: 'shroom3', x: 2110, on: 'eyeLedge', h: 40 },
  { name: 'bush12', x: 2222, on: 'eyeLedge', h: 40 },
  { name: 'grow9', x: 2310, on: 'eyeLedge', h: 46 },
  { name: 'shroom4', x: 2480, on: 'eyeLedge', h: 42, glow: 'tealGlow' },
  { name: 'grow5', x: 2700, on: 'eyeLedge', h: 44 },
  { name: 'bush9', x: 2960, on: 'eyeLedge', h: 46 },
  { name: 'goldCrystals', x: 3060, on: 'eyeLedge', h: 34, glow: 'lanternGlow' },
  { name: 'grow4', x: 3280, on: 'eyeLedge', h: 50, flip: true },
  { name: 'shroom6', x: 3500, on: 'eyeLedge', h: 26 },
  { name: 'bush2', x: 3640, on: 'eyeLedge', h: 34 },
  { name: 'bush8', x: 120, on: 'floor', h: 46, glow: 'tealGlow' },
  { name: 'shroom0', x: 215, on: 'floor', h: 44 },
  { name: 'bush4', x: 305, on: 'floor', h: 42, glow: 'tealGlow' },
  { name: 'shroom3', x: 410, on: 'floor', h: 34, flip: true },
  { name: 'sprout3', x: 815, on: 'pillar2', h: 22 },
  { name: 'tiny8', x: 1028, on: 'pillar3', h: 22, glow: 'tealGlow' },
  { name: 'grow3', x: 1460, on: 'exitGround', h: 40 },
  { name: 'shroom4', x: 1575, on: 'exitGround', h: 44, flip: true, glow: 'tealGlow' },
  { name: 'goldCrystals', x: 1680, on: 'exitGround', h: 44, glow: 'lanternGlow' },
  { name: 'bush6', x: 1895, on: 'exitGround', h: 44 },
  { name: 'shroom7', x: 2075, on: 'exitGround', h: 50 },
  { name: 'bush0', x: 2235, on: 'exitGround', h: 46 },
  { name: 'grow10', x: 2335, on: 'exitGround', h: 52 },
  { name: 'bush8', x: 2620, on: 'exitGround', h: 44, glow: 'tealGlow' },
  { name: 'shroom0', x: 2900, on: 'exitGround', h: 40 },
  { name: 'bush6', x: 3200, on: 'exitGround', h: 42 },
  { name: 'shroom3', x: 3480, on: 'exitGround', h: 36 },
  { name: 'grow3', x: 3680, on: 'exitGround', h: 40 },
  { name: 'hang0', x: 560, hang: true, h: 120 },
  { name: 'hang7', x: 760, hang: true, h: 110, flip: true },
  { name: 'hang3', x: 905, hang: true, h: 130 },
  { name: 'hang10', x: 1240, hang: true, h: 120 },
  { name: 'hang5', x: 1420, hang: true, h: 110, flip: true },
  { name: 'hang1', x: 1760, hang: true, h: 140 },
  { name: 'hang11', x: 1990, hang: true, h: 120 },
  { name: 'hang9', x: 2200, hang: true, h: 110, flip: true },
  { name: 'hang3', x: 2560, hang: true, h: 120 },
  { name: 'hang7', x: 2900, hang: true, h: 110 },
  { name: 'hang1', x: 3300, hang: true, h: 130, flip: true },
  { name: 'hang10', x: 3580, hang: true, h: 110 },
  { name: 'hang4', x: 300, under: 'upper', h: 110 },
  { name: 'hang8', x: 690, under: 'upper', h: 100, flip: true },
  { name: 'hang2', x: 1010, under: 'upper', h: 120 },
  { name: 'hang6', x: 1330, under: 'upper', h: 90 },
  { name: 'hang9', x: 1850, under: 'eyeLedge', h: 100 },
  { name: 'hang0', x: 2160, under: 'eyeLedge', h: 110, flip: true },
  { name: 'hang2', x: 2700, under: 'eyeLedge', h: 100 },
  { name: 'hang8', x: 3150, under: 'eyeLedge', h: 110, flip: true },
  { name: 'hang6', x: 3550, under: 'eyeLedge', h: 90 },
  { name: 'side2', wall: 'left', y: 420, h: 80 },
  { name: 'side6', wall: 'left', y: 870, h: 90 },
  { name: 'side9', wall: 'right', y: 400, h: 84 },
  { name: 'side0', wall: 'right', y: 850, h: 80 },
  { name: 'side4', wall: 'left', y: 620, h: 64, at: 1540 },
  { name: 'side8', wall: 'right', y: 680, h: 64, at: 1680 }
]

/**
 * Paints every solid part of the cave that reaches into a world rect.
 * The context must already be translated so world coordinates land on
 * the canvas (its clip does the rest).
 * @param {CanvasRenderingContext2D} ctx - World-translated context
 * @param {{x1: number, y1: number, x2: number, y2: number}} rect - World rect to cover
 * @param {boolean} [withLake=false] - Paint the lake's stone bed and the tint under its surface
 */
export function paintTerrain(ctx, rect, withLake = false) {
  const inLake = withLake && overlaps(rect, Layout.LAKE_X1 - SUBMERSION_PAD, Layout.LAKE_SURFACE_Y, Layout.LAKE_X2 + SUBMERSION_PAD, Layout.WORLD_H + ART_PAD)
  inLake && paintBasin(ctx)
  overlaps(rect, -ART_PAD, WALL_TOP_Y, Layout.WALL_COLLIDE_W * 3, Layout.WORLD_H + ART_PAD) && paintWall(ctx, -1)
  overlaps(rect, Layout.WORLD_W - Layout.WALL_COLLIDE_W * 3, WALL_TOP_Y, Layout.WORLD_W + ART_PAD, Layout.WORLD_H + ART_PAD) && paintWall(ctx, 1)
  paintCeiling(ctx, rect)
  Layout.PLATFORMS.forEach(p => paintPlatform(ctx, rect, p))
  PROPS.forEach(prop => paintProp(ctx, rect, prop))
  inLake && paintSubmersion(ctx)
}

/**
 * Underside Y of a ledge at X (under its walkable top there).
 * @param {Object} p - LEDGE platform
 * @param {number} x - World X
 * @returns {number}
 */
function ledgeBottomAt(p, x) {
  const fromWall = p.wall === 'left' ? x - p.x1 : p.x2 - x
  const length = p.x2 - p.x1
  const u = Math.max(0, Math.min(1, fromWall / length))
  const tipDepth = p.thick * p.tip
  let depth = p.thick + (tipDepth - p.thick) * Math.pow(u, TIP_POW)
  depth += p.sag * Math.exp(-Math.pow((x - p.sagX) / p.sagW, 2))
  depth += Layout.profileNoise(x / 2, p.seed) * LOBE_AMP + Math.sin(x / LOBE_LEN + p.seed) * LOBE_AMP * 0.5
  const nose = Math.min(NOSE_MAX, tipDepth)
  const toEnd = length - fromWall
  toEnd < nose && (depth *= Math.sqrt(Math.max(0, 1 - Math.pow(1 - toEnd / nose, 2))))
  return Layout.topAt(p, x) + Math.max(0, depth)
}
//
// One platform: the drips hanging under a ledge, the earth mass, its top,
// then the stones biting up into the top's underside — one block platform on a pillar, else its
// flat runs and slopes (cave-platform.js) carried on into the wall (or
// past the world's side).
//
function paintPlatform(ctx, rect, p) {
  const poly = platformOutline(p)
  const box = Earth.bounds(poly)
  if (!overlaps(rect, box.x1, box.y1 - ART_PAD, box.x2, box.y2 + ART_PAD * 2)) return
  const pillar = p.kind === Layout.PLATFORM_KIND.PILLAR
  const under = pillar ? Platform.pillarDepth(p.x1, p.x2, p.seed) * PILLAR_MASS_FROM : MASS_UNDER_TOP
  const ledge = p.kind === Layout.PLATFORM_KIND.LEDGE
  ledge && Platform.paintDrips(ctx, box.x1, box.x2, x => ledgeBottomAt(p, x), p.seed)
  Earth.paintMass(ctx, poly, { key: p.id, seed: p.seed, topAt: x => Layout.topAt(p, x) + under })
  if (pillar) return Platform.paintPillar(ctx, p.x1, p.x2, p.y, p.seed)
  const artX1 = p.x1 <= 0 ? -ART_PAD : p.x1
  const artX2 = p.x2 >= Layout.WORLD_W ? Layout.WORLD_W + ART_PAD : p.x2
  Platform.paintTop(ctx, p, artX1, artX2)
  Earth.paintBite(ctx, artX1, artX2, x => Layout.topAt(p, x), p.seed)
}
function platformOutline(p) {
  if (p.kind === Layout.PLATFORM_KIND.LEDGE) return ledgeOutline(p)
  if (p.kind === Layout.PLATFORM_KIND.PILLAR) return pillarOutline(p)
  return groundOutline(p)
}
//
// Ledge from its wall: its walkable top, underside from ledgeBottomAt with
// small drip jags, a rounded nose at the free end.
//
function ledgeOutline(p) {
  const rng = createSeededRandom(p.seed + 3)
  const left = p.wall === 'left'
  const x1 = left ? -ART_PAD : p.x1
  const x2 = left ? p.x2 : Layout.WORLD_W + ART_PAD
  const top = []
  const bottom = []
  for (let x = x1; x < x2; x += OUTLINE_STEP) top.push({ x, y: Layout.topAt(p, x) })
  top.push({ x: x2, y: Layout.topAt(p, x2) })
  for (let x = x2; x > x1; x -= OUTLINE_STEP) {
    const jag = Math.round(x / OUTLINE_STEP) % Math.round(JAG_EVERY / OUTLINE_STEP) === 0 ? JAG_DEPTH_MIN + rng() * JAG_DEPTH_RANGE : 0
    bottom.push({ x, y: ledgeBottomAt(p, x) + jag })
  }
  bottom.push({ x: x1, y: ledgeBottomAt(p, x1) })
  return top.concat(bottom)
}
//
// Pillar out of the lake: flat top with eased corners, flaring sides.
//
function pillarOutline(p) {
  const foot = Layout.LAKE_SURFACE_Y + PILLAR_FOOT_BELOW_WATER
  const rng = createSeededRandom(p.seed + 3)
  const right = pillarSide(p, p.x2, 1, foot, rng)
  const left = pillarSide(p, p.x1, -1, foot, rng).reverse()
  return [{ x: p.x1 + PILLAR_CORNER, y: p.y }, { x: p.x2 - PILLAR_CORNER, y: p.y }, ...right, ...left]
}
function pillarSide(p, x, dir, foot, rng) {
  const pts = []
  for (let y = p.y + PILLAR_CORNER; y <= foot; y += OUTLINE_STEP) {
    const u = (y - p.y) / (foot - p.y)
    pts.push({ x: x + dir * (PILLAR_FLARE * u * u + rng() * PILLAR_JITTER), y })
  }
  return pts
}
//
// Ground down to the world bottom; its lake side banks under the water.
//
function groundOutline(p) {
  const bottom = Layout.WORLD_H + ART_PAD
  const top = []
  for (let x = Math.max(-ART_PAD, p.x1); x < Math.min(Layout.WORLD_W + ART_PAD, p.x2); x += OUTLINE_STEP) top.push({ x, y: Layout.topAt(p, x) })
  if (p.bank === 'right') {
    const bank = BANK.map(b => ({ x: p.x2 + b.dx, y: Layout.topAt(p, p.x2) + b.dy }))
    return [{ x: -ART_PAD, y: p.y }, ...top, ...bank, { x: p.x2 + BANK[BANK.length - 1].dx, y: bottom }, { x: -ART_PAD, y: bottom }]
  }
  const bank = BANK.map(b => ({ x: p.x1 - b.dx, y: Layout.topAt(p, p.x1) + b.dy })).reverse()
  const end = Layout.topAt(p, Layout.WORLD_W)
  return [...bank, ...top, { x: Layout.WORLD_W + ART_PAD, y: end }, { x: Layout.WORLD_W + ART_PAD, y: bottom }, { x: p.x1 - BANK[BANK.length - 1].dx, y: bottom }]
}
//
// The lake's bed: murky water behind, then stones packed under the
// parabola of its bottom.
//
function paintBasin(ctx) {
  const x1 = Layout.LAKE_X1 - ART_PAD
  const x2 = Layout.LAKE_X2 + ART_PAD
  const top = Layout.LAKE_SURFACE_Y
  const bottom = Layout.WORLD_H + ART_PAD
  const g = ctx.createLinearGradient(0, top, 0, top + BED_DEPTH)
  g.addColorStop(0, WATER.paint.murkTop)
  g.addColorStop(1, WATER.paint.deep)
  ctx.fillStyle = g
  ctx.fillRect(x1, top, x2 - x1, bottom - top)
  const poly = []
  for (let x = x1; x <= x2; x += OUTLINE_STEP) poly.push({ x, y: bedAt(x) })
  poly.push({ x: x2, y: bottom }, { x: x1, y: bottom })
  Earth.paintMass(ctx, poly, { key: 'basin', seed: BASIN_SEED, topAt: bedAt })
}
//
// The bed's parabola at X (flat past the banks).
//
function bedAt(x) {
  const half = (Layout.LAKE_X2 - Layout.LAKE_X1) / 2
  const u = Math.max(-1, Math.min(1, (x - Layout.LAKE_X1 - half) / half))
  return Layout.LAKE_SURFACE_Y + BED_EDGE + BED_DEPTH * (1 - u * u)
}
//
// Everything already painted in the water between the two banks (the
// pillars) sinks into it: tinted toward the deep, more so the deeper.
//
function paintSubmersion(ctx) {
  const floor = Layout.PLATFORMS.find(p => p.bank === 'right')
  const ground = Layout.PLATFORMS.find(p => p.bank === 'left')
  const top = Layout.LAKE_SURFACE_Y
  const bottom = Layout.WORLD_H + ART_PAD
  const g = ctx.createLinearGradient(0, top, 0, top + SUBMERSION_DEPTH)
  g.addColorStop(0, hexAlpha(WATER.water, SUBMERSION_TOP_ALPHA))
  g.addColorStop(1, hexAlpha(WATER.paint.deep, SUBMERSION_DEEP_ALPHA))
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(floor.x2, top)
  BANK.forEach(b => ctx.lineTo(floor.x2 + b.dx, floor.y + b.dy))
  ctx.lineTo(floor.x2 + BANK[BANK.length - 1].dx, bottom)
  ctx.lineTo(ground.x1 - BANK[BANK.length - 1].dx, bottom)
  BANK.slice().reverse().forEach(b => ctx.lineTo(ground.x1 - b.dx, ground.y + b.dy))
  ctx.lineTo(ground.x1, top)
  ctx.closePath()
  ctx.clip()
  ctx.globalCompositeOperation = 'source-atop'
  ctx.fillStyle = g
  ctx.fillRect(floor.x2, top, ground.x1 - floor.x2, bottom - top)
  ctx.restore()
}
//
// A side wall from the ceiling down: the world edge to its ragged face.
//
function paintWall(ctx, dir) {
  const left = dir < 0
  const edge = left ? -ART_PAD : Layout.WORLD_W + ART_PAD
  const face = []
  for (let y = WALL_TOP_Y; y <= Layout.WORLD_H + ART_PAD; y += OUTLINE_STEP) face.push({ x: left ? Layout.leftWallX(y) : Layout.rightWallX(y), y })
  const poly = [{ x: edge, y: WALL_TOP_Y }, ...face, { x: edge, y: Layout.WORLD_H + ART_PAD }]
  Earth.paintMass(ctx, poly, { key: left ? 'wallL' : 'wallR', seed: left ? LEFT_WALL_SEED : RIGHT_WALL_SEED, topAt: () => WALL_TOP_Y, roots: WALL_ROOTS })
}
//
// Ceiling in two masses either side of the roots' hole, dripping
// platforms hanging from its underside.
//
function paintCeiling(ctx, rect) {
  if (rect.y1 > CEILING_REACH_Y) return
  const holeL = Layout.ENTRY_X - Layout.ENTRY_HALF_W
  const holeR = Layout.ENTRY_X + Layout.ENTRY_HALF_W
  const top = -ART_PAD
  const rng = createSeededRandom(HOLE_SEED)
  const left = [{ x: -ART_PAD, y: top }, { x: holeL + lipJag(rng), y: top }]
  for (let y = top; y < Layout.ENTRY_Y; y += OUTLINE_STEP * 2) left.push({ x: holeL + lipJag(rng), y })
  for (let x = holeL; x >= -ART_PAD; x -= OUTLINE_STEP) left.push({ x, y: Layout.ceilingBottomAt(x) })
  const right = [{ x: holeR + lipJag(rng), y: top }, { x: Layout.WORLD_W + ART_PAD, y: top }]
  for (let x = Layout.WORLD_W + ART_PAD; x >= holeR; x -= OUTLINE_STEP) right.push({ x, y: Layout.ceilingBottomAt(x) })
  for (let y = Layout.ENTRY_Y; y > top; y -= OUTLINE_STEP * 2) right.push({ x: holeR + lipJag(rng), y })
  const bottomAt = x => Layout.ceilingBottomAt(x)
  Platform.paintDrips(ctx, -ART_PAD, holeL, bottomAt, CEILING_SEED)
  Platform.paintDrips(ctx, holeR, Layout.WORLD_W + ART_PAD, bottomAt, CEILING_SEED + 1)
  Earth.paintMass(ctx, left, { key: 'ceilingL', seed: CEILING_SEED, topAt: () => top, litFromBelow: true })
  Earth.paintMass(ctx, right, { key: 'ceilingR', seed: CEILING_SEED + 1, topAt: () => top, litFromBelow: true })
}
function lipJag(rng) {
  return (rng() * 2 - 1) * HOLE_LIP_JAG
}
/**
 * Soft lights of the glowing props (world point, colour key).
 * @returns {Array<{x: number, y: number, color: string}>}
 */
export function propGlows() {
  return PROPS.filter(prop => prop.glow).map(prop => ({ x: prop.x, y: propFootY(prop) - prop.h * GLOW_UP, color: prop.glow }))
}
function paintProp(ctx, rect, prop) {
  if (prop.wall) return paintSideProp(ctx, rect, prop)
  const hang = !!(prop.hang || prop.under)
  const y = hang ? propFootY(prop) - PROP_SINK : propFootY(prop) + PROP_SINK
  const halfW = Atlas.widthAt(prop.name, prop.h) / 2
  const y1 = hang ? y : y - prop.h
  if (!overlaps(rect, prop.x - halfW, y1, prop.x + halfW, y1 + prop.h)) return
  Atlas.drawPiece(ctx, prop.name, prop.x, y, prop.h, { flip: prop.flip, hang })
}
function hexAlpha(hex, alpha) {
  return hex + Math.round(alpha * BYTE_MAX).toString(HEX_RADIX).padStart(2, '0')
}
function propFootY(prop) {
  if (prop.hang) return Layout.ceilingBottomAt(prop.x)
  if (prop.under) return ledgeBottomAt(platformById(prop.under), prop.x)
  return Layout.topAt(platformById(prop.on), prop.x)
}
//
// A plant growing sideways out of a wall (or a ledge's end face at `at`):
// its root side against the rock, mirrored on a right wall.
//
function paintSideProp(ctx, rect, prop) {
  const left = prop.wall === 'left'
  const face = prop.at ?? (left ? Layout.leftWallX(prop.y) : Layout.rightWallX(prop.y))
  const w = Atlas.widthAt(prop.name, prop.h)
  const x = left ? face - SIDE_SINK + w / 2 : face + SIDE_SINK - w / 2
  overlaps(rect, x - w / 2, prop.y - prop.h / 2, x + w / 2, prop.y + prop.h / 2) &&
    Atlas.drawPiece(ctx, prop.name, x, prop.y + prop.h / 2, prop.h, { flip: !left })
}
function platformById(id) {
  return Layout.PLATFORMS.find(p => p.id === id)
}
function overlaps(rect, x1, y1, x2, y2) {
  return x2 >= rect.x1 && x1 <= rect.x2 && y2 >= rect.y1 && y1 <= rect.y2
}
