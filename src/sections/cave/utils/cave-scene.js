import * as Lake from '../../../components/lake.js'
import { createSeededRandom } from '../../../utils/seeded-random.js'
import { CAVE_CFG } from '../cfg.js'
import * as Atlas from './cave-atlas.js'
import * as Earth from './cave-earth.js'
import * as Layout from './cave-layout.js'
//
// The cave's solid world painted into a 2D canvas for any world rect: the
// ceiling with the roots' hole, both walls, the earth ledges, the lake
// pillars and grounds, the basin under the lake, then the props from the
// sheets (plants on the tops, vines and stone spikes under the ceiling,
// stones on the lake bed). The level bakes it into tiles; the forest's
// peek into the cave and the menu backdrop paint pieces of it too.
//
const COLORS = CAVE_CFG.earth
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
// The lake's depths: the water tint the lake fill gives (matched below its
// bed line), big stones on the bottom, and how banks and pillars sink in.
//
const WATER = CAVE_CFG.water
const DEEP_FILL_ALPHA = 0.42
const DEEP_STONE_SHADE = 0.6
const DEEP_STONES = [
  { name: 'boulder', x: 610, h: 120, sink: 30 },
  { name: 'caveRock', x: 900, h: 110, sink: 24, flip: true },
  { name: 'rockPile', x: 1150, h: 130, sink: 36 },
  { name: 'mossBoulder', x: 1330, h: 100, sink: 20, flip: true }
]
const SUBMERSION_PAD = 90
const SUBMERSION_DEPTH = 200
const SUBMERSION_TOP_ALPHA = 0.3
const SUBMERSION_DEEP_ALPHA = 0.85
const BYTE_MAX = 255
const HEX_RADIX = 16
//
// The roots' hole: ragged lips, roots hanging into it.
//
const HOLE_LIP_JAG = 8
const HOLE_ROOTS = 9
const HOLE_ROOT_LEN_MIN = 16
const HOLE_ROOT_LEN_RANGE = 46
const HOLE_ROOT_W = 2.6
const HOLE_ROOT_CONTOUR = 1.4
const HOLE_ROOT_INSET = 6
const HOLE_ROOT_SPAN = 0.6
const HOLE_ROOT_REACH_MIN = 6
const HOLE_ROOT_REACH_RANGE = 14
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
// Props: piece, foot X, foot Y (a platform top unless noted), height,
// mirrored, hanging from the ceiling (`hang`); `spike` entries are stone
// spikes of that length hanging from the ceiling.
//
const UPPER = platformTop('upper')
const EYE = platformTop('eyeLedge')
const FLOOR = platformTop('floor')
const EXIT_G = platformTop('exitGround')
const PROPS = [
  { name: 'tealMushrooms', x: 430, y: UPPER, h: 60 },
  { name: 'ferns', x: 520, y: UPPER, h: 50, flip: true },
  { name: 'whiteFlowers', x: 610, y: UPPER, h: 30 },
  { name: 'monstera', x: 735, y: UPPER, h: 62 },
  { name: 'redSprouts', x: 828, y: UPPER, h: 38 },
  { name: 'bigLeaf', x: 1180, y: UPPER, h: 76, flip: true },
  { name: 'glowMoss', x: 935, y: UPPER, h: 36 },
  { name: 'whiteFlowers', x: 1270, y: UPPER, h: 32, flip: true },
  { name: 'redStarFlower', x: 1352, y: UPPER, h: 36 },
  { name: 'fernMound', x: 1450, y: UPPER, h: 44 },
  { name: 'goldCrystals', x: 1515, y: UPPER, h: 30 },
  { name: 'goldCrystals', x: 1712, y: EYE, h: 40, flip: true },
  { name: 'redSprouts', x: 1786, y: EYE, h: 36, flip: true },
  { name: 'whiteFlowers', x: 1990, y: EYE, h: 32 },
  { name: 'orangeMushrooms', x: 2110, y: EYE, h: 54 },
  { name: 'redCoral', x: 2222, y: EYE, h: 42 },
  { name: 'mossRock', x: 2310, y: EYE, h: 74 },
  { name: 'tealBulbs', x: 120, y: FLOOR, h: 50 },
  { name: 'mossBoulder', x: 215, y: FLOOR, h: 58, flip: true },
  { name: 'droopBulbs', x: 305, y: FLOOR, h: 46 },
  { name: 'glowBerries', x: 410, y: FLOOR, h: 38 },
  { name: 'tealLeaves', x: 815, y: platformTop('pillar2'), h: 26 },
  { name: 'puffballs', x: 1028, y: platformTop('pillar3'), h: 36 },
  { name: 'lilyPads', x: 1460, y: EXIT_G, h: 52 },
  { name: 'tealMushroomsBig', x: 1575, y: EXIT_G, h: 56 },
  { name: 'goldCrystals', x: 1680, y: EXIT_G, h: 48 },
  { name: 'stalagmites', x: 1895, y: EXIT_G, h: 78 },
  { name: 'rootBoulder', x: 2075, y: EXIT_G, h: 76, flip: true },
  { name: 'orangeShroomMound', x: 2235, y: EXIT_G, h: 58 },
  { name: 'spires', x: 2335, y: EXIT_G, h: 104, flip: true },
  { name: 'hangingVines', x: 560, hang: true, h: 110 },
  { spike: 64, x: 735 },
  { name: 'hangingVines', x: 905, hang: true, h: 140, flip: true },
  { spike: 56, x: 1060 },
  { name: 'hangingVines', x: 1310, hang: true, h: 120 },
  { spike: 66, x: 1480 },
  { name: 'hangingVines', x: 1720, hang: true, h: 150, flip: true },
  { spike: 58, x: 1880 },
  { name: 'hangingVines', x: 2110, hang: true, h: 112 },
  { spike: 60, x: 2260 }
]

/**
 * Paints every solid part of the cave that reaches into a world rect.
 * The context must already be translated so world coordinates land on
 * the canvas (its clip does the rest).
 * @param {CanvasRenderingContext2D} ctx - World-translated context
 * @param {{x1: number, y1: number, x2: number, y2: number}} rect - World rect to cover
 * @param {Object|null} [lake] - Lake inst (its bed line meets the painted depths); null paints no lake depths
 */
export function paintTerrain(ctx, rect, lake = null) {
  const inLake = lake && overlaps(rect, Layout.LAKE_X1 - SUBMERSION_PAD, Layout.LAKE_SURFACE_Y, Layout.LAKE_X2 + SUBMERSION_PAD, Layout.WORLD_H + ART_PAD)
  inLake && paintDeepWater(ctx, lake)
  overlaps(rect, -ART_PAD, WALL_TOP_Y, Layout.WALL_COLLIDE_W * 3, Layout.WORLD_H + ART_PAD) && paintWall(ctx, -1)
  overlaps(rect, Layout.WORLD_W - Layout.WALL_COLLIDE_W * 3, WALL_TOP_Y, Layout.WORLD_W + ART_PAD, Layout.WORLD_H + ART_PAD) && paintWall(ctx, 1)
  paintCeiling(ctx, rect)
  Layout.PLATFORMS.forEach(p => paintPlatform(ctx, rect, p))
  PROPS.forEach(prop => paintProp(ctx, rect, prop))
  inLake && paintSubmersion(ctx)
}

/**
 * Underside Y of a ledge at X (its walkable top is p.y).
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
  return p.y + Math.max(0, depth)
}
//
// One platform: earth mass, its underside, then the moss cap.
//
function paintPlatform(ctx, rect, p) {
  const poly = platformOutline(p)
  const box = Earth.bounds(poly)
  if (!overlaps(rect, box.x1, box.y1 - ART_PAD, box.x2, box.y2 + ART_PAD * 2)) return
  const ledge = p.kind === Layout.PLATFORM_KIND.LEDGE
  Earth.paintMass(ctx, poly, { key: p.id, seed: p.seed, topY: p.y })
  ledge && Earth.paintUnderside(ctx, box.x1, box.x2, x => ledgeBottomAt(p, x), p.seed)
  const x1 = p.kind === Layout.PLATFORM_KIND.LEDGE && p.wall === 'left' ? -ART_PAD : p.x1
  const x2 = p.kind === Layout.PLATFORM_KIND.LEDGE && p.wall === 'right' ? Layout.WORLD_W + ART_PAD : p.x2
  Earth.paintTop(ctx, x1, x2, p.y, {
    seed: p.seed,
    roundLeft: x1 > 0,
    roundRight: x2 < Layout.WORLD_W
  })
}
function platformOutline(p) {
  if (p.kind === Layout.PLATFORM_KIND.LEDGE) return ledgeOutline(p)
  if (p.kind === Layout.PLATFORM_KIND.PILLAR) return pillarOutline(p)
  return groundOutline(p)
}
//
// Ledge from its wall: flat top, underside from ledgeBottomAt with small
// drip jags, a rounded nose at the free end.
//
function ledgeOutline(p) {
  const rng = createSeededRandom(p.seed + 3)
  const left = p.wall === 'left'
  const x1 = left ? -ART_PAD : p.x1
  const x2 = left ? p.x2 : Layout.WORLD_W + ART_PAD
  const top = []
  const bottom = []
  for (let x = x1; x < x2; x += OUTLINE_STEP) top.push({ x, y: p.y })
  top.push({ x: x2, y: p.y })
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
  if (p.bank === 'right') {
    const bank = BANK.map(b => ({ x: p.x2 + b.dx, y: p.y + b.dy }))
    return [{ x: -ART_PAD, y: p.y }, ...bank, { x: p.x2 + BANK[BANK.length - 1].dx, y: bottom }, { x: -ART_PAD, y: bottom }]
  }
  const bank = BANK.map(b => ({ x: p.x1 - b.dx, y: p.y + b.dy })).reverse()
  return [...bank, { x: p.x1, y: p.y }, { x: Layout.WORLD_W + ART_PAD, y: p.y }, { x: Layout.WORLD_W + ART_PAD, y: bottom }, { x: p.x1 - BANK[BANK.length - 1].dx, y: bottom }]
}
//
// The lake's depths under its surface, between the two banks: murky teal
// darkening downward, big stones lying on the bottom, and below the lake
// fill's own bed line the same water tint the fill gives above it, so its
// lower edge does not show.
//
function paintDeepWater(ctx, lake) {
  const x1 = Layout.LAKE_X1 - ART_PAD
  const x2 = Layout.LAKE_X2 + ART_PAD
  const top = Layout.LAKE_SURFACE_Y
  const bottom = Layout.WORLD_H + ART_PAD
  const g = ctx.createLinearGradient(0, top, 0, bottom)
  g.addColorStop(0, WATER.paint.murkTop)
  g.addColorStop(1, WATER.paint.deep)
  ctx.fillStyle = g
  ctx.fillRect(x1, top, x2 - x1, bottom - top)
  DEEP_STONES.forEach(stone => Atlas.drawPiece(ctx, stone.name, stone.x, Layout.WORLD_H + stone.sink, stone.h, {
    flip: stone.flip,
    shade: WATER.paint.deep,
    shadeAmount: DEEP_STONE_SHADE
  }))
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(x1, bottom)
  for (let x = x1; x <= x2; x += OUTLINE_STEP) ctx.lineTo(x, Lake.bedWorldY(lake, Math.max(Layout.LAKE_X1, Math.min(Layout.LAKE_X2, x))))
  ctx.lineTo(x2, bottom)
  ctx.closePath()
  ctx.clip()
  ctx.globalAlpha = DEEP_FILL_ALPHA
  ctx.fillStyle = WATER.water
  ctx.fillRect(x1, top, x2 - x1, bottom - top)
  ctx.restore()
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
  Earth.paintMass(ctx, poly, { key: left ? 'wallL' : 'wallR', seed: left ? LEFT_WALL_SEED : RIGHT_WALL_SEED, topY: WALL_TOP_Y, roots: WALL_ROOTS })
}
//
// Ceiling in two masses either side of the roots' hole, roots and moss
// hanging from its underside and into the hole.
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
  Earth.paintMass(ctx, left, { key: 'ceilingL', seed: CEILING_SEED, topY: top, litFromBelow: true })
  Earth.paintMass(ctx, right, { key: 'ceilingR', seed: CEILING_SEED + 1, topY: top, litFromBelow: true })
  Earth.paintUnderside(ctx, -ART_PAD, holeL, bottomAt, CEILING_SEED)
  Earth.paintUnderside(ctx, holeR, Layout.WORLD_W + ART_PAD, bottomAt, CEILING_SEED + 1)
  paintHoleRoots(ctx, rng, holeL, holeR)
}
//
// Torn roots hanging into the hole from both lips.
//
function paintHoleRoots(ctx, rng, holeL, holeR) {
  ctx.lineCap = 'round'
  for (let i = 0; i < HOLE_ROOTS; i++) {
    const fromLeft = i % 2 === 0
    const x = fromLeft ? holeL + rng() * HOLE_ROOT_INSET : holeR - rng() * HOLE_ROOT_INSET
    const y = Layout.ENTRY_Y - rng() * Layout.ENTRY_Y * HOLE_ROOT_SPAN
    const len = HOLE_ROOT_LEN_MIN + rng() * HOLE_ROOT_LEN_RANGE
    const tipX = x + (fromLeft ? 1 : -1) * (HOLE_ROOT_REACH_MIN + rng() * HOLE_ROOT_REACH_RANGE)
    ctx.strokeStyle = CAVE_CFG.colors.contour
    ctx.lineWidth = HOLE_ROOT_W + HOLE_ROOT_CONTOUR
    strokeCurve(ctx, x, y, tipX, y + len)
    ctx.strokeStyle = COLORS.root[1 + (i % 3)]
    ctx.lineWidth = HOLE_ROOT_W
    strokeCurve(ctx, x, y, tipX, y + len)
  }
}
function lipJag(rng) {
  return (rng() * 2 - 1) * HOLE_LIP_JAG
}
function strokeCurve(ctx, x1, y1, x2, y2) {
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.quadraticCurveTo(x1, (y1 + y2) / 2, x2, y2)
  ctx.stroke()
}
function paintProp(ctx, rect, prop) {
  if (prop.spike) return paintCeilingSpike(ctx, rect, prop)
  const y = prop.hang ? Layout.ceilingBottomAt(prop.x) - PROP_SINK : prop.y + PROP_SINK
  const halfW = Atlas.widthAt(prop.name, prop.h) / 2
  const y1 = prop.hang ? y : y - prop.h
  if (!overlaps(rect, prop.x - halfW, y1, prop.x + halfW, y1 + prop.h)) return
  Atlas.drawPiece(ctx, prop.name, prop.x, y, prop.h, { flip: prop.flip, hang: prop.hang })
}
//
// A big stone spike hanging from the ceiling.
//
function paintCeilingSpike(ctx, rect, prop) {
  const y = Layout.ceilingBottomAt(prop.x) - PROP_SINK
  overlaps(rect, prop.x - prop.spike, y, prop.x + prop.spike, y + prop.spike) &&
    Earth.paintSpike(ctx, createSeededRandom(prop.x), prop.x, y, prop.spike)
}
function hexAlpha(hex, alpha) {
  return hex + Math.round(alpha * BYTE_MAX).toString(HEX_RADIX).padStart(2, '0')
}
function platformTop(id) {
  return Layout.PLATFORMS.find(p => p.id === id).y
}
function overlaps(rect, x1, y1, x2, y2) {
  return x2 >= rect.x1 && x1 <= rect.x2 && y2 >= rect.y1 && y1 <= rect.y2
}
