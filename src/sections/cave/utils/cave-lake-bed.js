import { createSeededRandom } from '../../../utils/seeded-random.js'
import { applyForestFilmGrainToCanvas } from '../../forest/utils/forest-parallax-grain.js'
import { CAVE_CFG } from '../cfg.js'
import * as Atlas from './cave-atlas.js'
import * as Layout from './cave-layout.js'
import * as Ground from './cave-ground.js'
//
// The lake's bed: a few stones (stones.png) and plants that live under
// water (plants.png and plants2.png: tube sponges, corals, anemones,
// curled weed, glowing bulbs) standing on its soil, in clumps and open
// stretches — only where the bed lies deep enough under the surface for
// them, never on the banks' slopes — and thick in the hollows under the
// banks (plants and stones packed in, each under the hollow's ceiling),
// the hollows' mouths lined with stones (MOUTH_*), the left one's floor
// paved (PAVE_*). They are painted into the terrain
// bake over the bed's own tint (which would hide them in its dark),
// pulled toward the deep water's dark teal (SHADE_AMOUNT): darker than
// anything growing on dry land, yet still readable; the water drawn over
// the lake darkens them on. Placed once per page.
//
const SHADE = CAVE_CFG.water.bedShade
const SHADE_AMOUNT = 0.3
const SEED = 7420
const HALF = 0.5
//
// The pieces that may stand on the bed.
//
const PLANTS = ['bush0', 'bush1', 'bush2', 'bush3', 'bush4', 'bush6', 'bush7', 'bush8', 'bush10', 'bush12', 'upB11', 'upB16', 'upB19', 'upB20', 'upB21', 'upB22', 'upB23', 'upB26', 'upB27', 'upB28']
const STONES = ['rock1', 'rock3', 'rock5', 'rock7', 'rock8', 'rock10', 'rock12', 'rock13', 'rock17', 'rock19', 'rock20', 'rock22', 'rock24', 'rock25', 'rock29', 'rock36', 'rock38', 'rock39', 'rock43', 'rock46']
//
// Drawn heights (world px): plants PLANT_H..+RANGE, stones STONE_H..
// +RANGE; a stone sinks STONE_SINK px into the soil, a plant UP_SINK.
// Something stands every GAP..+GAP_RANGE px (CLUMP_CHANCE of them close,
// CLUMP_GAP..+RANGE px); STONE_CHANCE of them stones. Plants only where
// the bed is MIN_DEPTH px or more under the surface, stones down from
// STONE_MIN_DEPTH (on the banks' slopes too), all END_CLEAR px in from the
// lake's ends; a piece stands on the lowest soil under its root
// (ROOT_SHARE of its width either side, read every ROOT_STEP px).
//
const PLANT_H = 18
const PLANT_H_RANGE = 16
const STONE_H = 10
const STONE_H_RANGE = 14
const STONE_SINK = 4
const UP_SINK = 3
const GAP = 45
const GAP_RANGE = 80
const CLUMP_CHANCE = 0.45
const CLUMP_GAP = 12
const CLUMP_GAP_RANGE = 16
const STONE_CHANCE = 0.6
const MIN_DEPTH = 120
const STONE_MIN_DEPTH = 50
const END_CLEAR = 40
const ROOT_SHARE = 0.3
const ROOT_STEP = 2
const FLIP_CHANCE = 0.5
//
// In a bank's hollow something stands every HOLLOW_GAP..+RANGE px,
// HOLLOW_STONE_CHANCE of them stones, a plant only where it keeps
// HEADROOM px under the hollow's ceiling (its bed counts as in it within
// HOLLOW_FIND px of its arc).
//
const HOLLOW_GAP = 10
const HOLLOW_GAP_RANGE = 14
const HOLLOW_STONE_CHANCE = 0.45
const HEADROOM = 8
const HOLLOW_FIND = 10
//
// A hollow's mouth: stones MOUTH_H..+RANGE px high set half into its soil
// along its ceiling and its floor by the opening (every MOUTH_STEP of its
// arc's points, MOUTH_COUNT of them each way from the mouth, each with a
// smaller one MOUTH_PAIR_DX px beside it), CORNER_STONES under the corner
// over it and MOUTH_FLOOR_COUNT more on the bed out in front of it, every
// MOUTH_FLOOR_GAP px.
//
const MOUTH_H = 12
const MOUTH_H_RANGE = 10
const MOUTH_STEP = 2
const MOUTH_COUNT = 6
const MOUTH_PAIR_DX = 9
const MOUTH_PAIR_SHRINK = 0.6
const CORNER_STONES = 3
const MOUTH_FLOOR_COUNT = 4
const MOUTH_FLOOR_GAP = 14
const MOUTH_SEED = 7470
//
// The left hollow lined with stones all round its arc (each set half into
// the soil, its middle on the arc) and on along its floor from the arc's
// foot to PAVE_TO px past the floor's mark (standing on the bed; nothing
// else of the bed's stands from PAVE_FROM px off that mark on, the near
// row painted over the rest), in two rows of stones PAVE_H..+RANGE px
// high, one every PAVE_GAP..+RANGE px, never quite on the line: each off it
// up to PAVE_JITTER px either way, PAVE_DEEP_CHANCE of them up to
// PAVE_DEEP px deeper into the soil (a ragged edge of stones, not a
// string of beads); lighter than the
// bed's other stones (PAVE_SHADE toward the deep: a path that reads
// through the water): the near row painted with the bed (in front of the
// giant and the fish), the far one PAVE_BACK_DX px on to the right and
// PAVE_BACK_UP px up, much darker (PAVE_BACK_SHADE), reaching on along the
// floor PAVE_BACK_MORE px further right than the near one (it starts right
// of it and runs left round to the stones at the back) — and with it a
// thick band of stones all along the floor (BACK_FLOOR_ROWS rows, BACK_UP
// px apart, one every BACK_GAP..+RANGE px), from that far right end left
// into the hollow to BACK_IN px off its back wall. The near row's back
// wall (the arc's part EMBED_LEFT of its half width or more left of its
// middle) has more stones sunk into the soil: one every EMBED_GAP..+RANGE
// px, EMBED_FROM..+RANGE px into it. The far stones are baked on their own (once per
// live k, grained) and drawn behind them (onDrawBack), PAD px round it.
//
const PAVE_FROM = -110
const PAVE_TO = 40
const PAVE_H = 10
const PAVE_H_RANGE = 9
const PAVE_GAP = 8
const PAVE_GAP_RANGE = 6
const PAVE_JITTER = 4
const PAVE_DEEP = 9
const PAVE_DEEP_CHANCE = 0.3
const PAVE_BACK_DX = 22
const PAVE_BACK_UP = 2
const PAVE_SHADE = 0.05
const PAVE_BACK_SHADE = 0.8
const PAVE_BACK_MORE = 160
const BACK_FLOOR_ROWS = 2
const BACK_UP = 7
const BACK_GAP = 6
const BACK_GAP_RANGE = 5
const BACK_IN = 14
const BACK_FLOOR_SEED = 7550
const EMBED_LEFT = 0.25
const EMBED_GAP = 9
const EMBED_GAP_RANGE = 6
const EMBED_FROM = 8
const EMBED_RANGE = 16
const EMBED_SEED = 7570
const PAVE_SEED = 7490
const PAVE_BACK_SEED = 7510
const BACK_SPRITE = 'cave0-pave-back'
const BACK_GRAIN = 7530
const PAD = 2
const backFor = new WeakMap()
let pieces = null
let backPieces = null

/**
 * Draws the far row of stones paving the left hollow's mouth (behind the
 * giant and the fish; baked on first use per live k).
 * @param {Object} k - Kaplay instance
 */
export function onDrawBack(k) {
  const back = backFor.get(k) ?? bakeBack(k)
  back && k.drawSprite({ sprite: BACK_SPRITE, pos: back.pos })
}

/**
 * Paints the bed's stones and plants that reach into a world rect.
 * @param {CanvasRenderingContext2D} ctx - World-translated context
 * @param {{x1: number, y1: number, x2: number, y2: number}} rect - World rect to cover
 */
export function paint(ctx, rect) {
  pieces ??= place()
  pieces.forEach(pc => paintPiece(ctx, rect, pc))
}
function paintPiece(ctx, rect, pc) {
  pc.box.x2 >= rect.x1 && pc.box.x1 <= rect.x2 && pc.box.y2 >= rect.y1 && pc.box.y1 <= rect.y2 &&
    Atlas.drawPiece(ctx, pc.name, pc.x, pc.y, pc.h, { flip: pc.flip, shade: SHADE, shadeAmount: pc.shade ?? SHADE_AMOUNT })
}
//
// Along the bed: clumps and open stretches, stones among the plants,
// stones first in a clump's paint order so a plant beside one stands over
// it.
//
function place() {
  const rng = createSeededRandom(SEED)
  const water = Ground.waterColumns()
  const first = water.x0 + water.tops.findIndex(y => !Number.isNaN(y))
  const last = water.x0 + water.tops.findLastIndex(y => !Number.isNaN(y))
  const out = []
  for (let x = first + END_CLEAR * HALF; x < last - END_CLEAR * HALF;) {
    const hollow = Layout.inHollow(x, columnOf(water, x).bed, HOLLOW_FIND)
    const stone = rng() < (hollow ? HOLLOW_STONE_CHANCE : STONE_CHANCE)
    const pc = stand(rng, water, x, stone)
    fits(water, x, pc, hollow) && !paved(pc) && out.push(pc)
    x += hollow ? HOLLOW_GAP + rng() * HOLLOW_GAP_RANGE : nextGap(rng)
  }
  mouthStones(out)
  return [...out.sort((a, b) => Number(b.stone) - Number(a.stone)), ...embed(), ...pave(PAVE_SEED, 0, 0, PAVE_SHADE)]
}
//
// Whether a piece would stand on the paved stretch (kept clear for it).
//
function paved(pc) {
  const at = Layout.BANK_HOLLOW_L.floor.x
  return pc.box.x2 > at + PAVE_FROM && pc.box.x1 < at + PAVE_TO + PAVE_BACK_DX + PAVE_BACK_MORE
}
//
// A row of stones round the left hollow's arc and on along its floor
// (`more` px further than the near row's end), shifted dx px on and dy px
// down, `shade` toward the deep.
//
function pave(seed, dx, dy, shade, more = 0) {
  const rng = createSeededRandom(seed)
  const hollow = Layout.BANK_HOLLOW_L
  const out = []
  alongArc(Layout.hollowArc(hollow), rng, PAVE_GAP, PAVE_GAP_RANGE, p => {
    const n = arcNormal(hollow, p)
    const into = offLine(rng)
    out.push(paveStone(rng, p.x + n.x * into + dx, p.y + n.y * into + dy, true, shade))
  })
  const water = Ground.waterColumns()
  for (let x = hollow.x + dx; x < hollow.floor.x + PAVE_TO + dx + more; x += PAVE_GAP + rng() * PAVE_GAP_RANGE) {
    const bed = columnOf(water, x).bed
    Number.isNaN(bed) || out.push(paveStone(rng, x, bed + dy + Math.max(0, offLine(rng)), false, shade))
  }
  return out
}
//
// The far band along the hollow's floor: rows of dark stones on the bed
// from its far right end left to its back wall.
//
function floorBand() {
  const rng = createSeededRandom(BACK_FLOOR_SEED)
  const hollow = Layout.BANK_HOLLOW_L
  const water = Ground.waterColumns()
  const out = []
  for (let row = 0; row < BACK_FLOOR_ROWS; row++) {
    for (let x = hollow.x - hollow.rx + BACK_IN + row * BACK_GAP * HALF; x < hollow.floor.x + PAVE_TO + PAVE_BACK_MORE; x += BACK_GAP + rng() * BACK_GAP_RANGE) {
      const bed = columnOf(water, x).bed
      Number.isNaN(bed) || out.push(paveStone(rng, x, bed - row * BACK_UP - PAVE_BACK_UP, false, PAVE_BACK_SHADE))
    }
  }
  return out
}
//
// Stones sunk deep into the soil of the hollow's back wall (the near row).
//
function embed() {
  const rng = createSeededRandom(EMBED_SEED)
  const hollow = Layout.BANK_HOLLOW_L
  const out = []
  const backWall = Layout.hollowArc(hollow).filter(p => p.x < hollow.x - hollow.rx * EMBED_LEFT)
  alongArc(backWall, rng, EMBED_GAP, EMBED_GAP_RANGE, p => {
    const n = arcNormal(hollow, p)
    const into = EMBED_FROM + rng() * EMBED_RANGE
    out.push(paveStone(rng, p.x + n.x * into, p.y + n.y * into, true, PAVE_SHADE))
  })
  return out
}
//
// How far off its line a stone lies (px into the soil; less than 0: out of
// it).
//
function offLine(rng) {
  return rng() < PAVE_DEEP_CHANCE ? PAVE_DEEP * rng() : (rng() * 2 - 1) * PAVE_JITTER
}
//
// The way out of the hollow into its soil at a point of its arc (unit).
//
function arcNormal(hollow, p) {
  const nx = (p.x - hollow.x) / (hollow.rx * hollow.rx)
  const ny = (p.y - hollow.y) / (hollow.ry * hollow.ry)
  const l = Math.hypot(nx, ny) || 1
  return { x: nx / l, y: ny / l }
}
//
// Points every gap..+range px along a line (its first one first).
//
function alongArc(line, rng, gap, range, fn) {
  let next = 0
  let walked = 0
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1]
    const b = line[i]
    const seg = Math.hypot(b.x - a.x, b.y - a.y)
    while (next <= walked + seg) {
      const u = seg > 0 ? (next - walked) / seg : 0
      fn({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u })
      next += gap + rng() * range
    }
    walked += seg
  }
}
//
// A paving stone at (x, y): its middle there (set half into the soil) or
// standing on it.
//
function paveStone(rng, x, y, set, shade) {
  const name = STONES[Math.floor(rng() * STONES.length)]
  const h = PAVE_H + rng() * PAVE_H_RANGE
  const w = Atlas.widthAt(name, h)
  const bottom = set ? y + h * HALF : y + STONE_SINK
  return { name, x, y: bottom, h, shade, stone: true, flip: rng() < FLIP_CHANCE, box: { x1: x - w / 2, y1: bottom - h, x2: x + w / 2, y2: bottom } }
}
//
// The far row baked on its own canvas (its box, PAD px round), grained.
//
function bakeBack(k) {
  backPieces ??= [...floorBand(), ...pave(PAVE_BACK_SEED, PAVE_BACK_DX, -PAVE_BACK_UP, PAVE_BACK_SHADE, PAVE_BACK_MORE)]
  if (!backPieces.length) return null
  const x1 = Math.floor(Math.min(...backPieces.map(pc => pc.box.x1))) - PAD
  const y1 = Math.floor(Math.min(...backPieces.map(pc => pc.box.y1))) - PAD
  const x2 = Math.ceil(Math.max(...backPieces.map(pc => pc.box.x2))) + PAD
  const y2 = Math.ceil(Math.max(...backPieces.map(pc => pc.box.y2))) + PAD
  const canvas = document.createElement('canvas')
  canvas.width = x2 - x1
  canvas.height = y2 - y1
  const ctx = canvas.getContext('2d')
  ctx.translate(-x1, -y1)
  backPieces.forEach(pc => Atlas.drawPiece(ctx, pc.name, pc.x, pc.y, pc.h, { flip: pc.flip, shade: SHADE, shadeAmount: pc.shade }))
  applyForestFilmGrainToCanvas(canvas, BACK_GRAIN)
  k.loadSprite(BACK_SPRITE, canvas)
  const back = { pos: k.vec2(x1, y1) }
  backFor.set(k, back)
  return back
}
//
// Stones round each hollow's mouth: hanging from its ceiling and lying on
// its floor near the opening, and one under the corner over it.
//
function mouthStones(out) {
  const rng = createSeededRandom(MOUTH_SEED)
  ;[Layout.BANK_HOLLOW_L, Layout.BANK_HOLLOW_R].forEach(hollow => {
    const arc = Layout.hollowArc(hollow)
    const last = arc.length - 1
    const topEnd = hollow.side < 0 ? last : 0
    const bottomEnd = hollow.side < 0 ? 0 : last
    const inward = hollow.side < 0 ? -1 : 1
    for (let i = 0; i < MOUTH_COUNT; i++) {
      const top = arc[topEnd + inward * i * MOUTH_STEP]
      const bottom = arc[bottomEnd - inward * i * MOUTH_STEP]
      out.push(mouthStone(rng, top, true), mouthStone(rng, { x: top.x + MOUTH_PAIR_DX, y: top.y }, true, MOUTH_PAIR_SHRINK))
      out.push(mouthStone(rng, bottom, false), mouthStone(rng, { x: bottom.x + MOUTH_PAIR_DX, y: bottom.y }, false, MOUTH_PAIR_SHRINK))
    }
    const corner = Layout.hollowCorner(hollow)
    for (let i = 0; i < CORNER_STONES; i++) out.push(mouthStone(rng, { x: corner.x + (hollow.x - corner.x) * i / CORNER_STONES, y: corner.y }, true))
    const floor = hollow.floor
    for (let i = 0; i < MOUTH_FLOOR_COUNT; i++) {
      const x = floor.x - hollow.side * i * MOUTH_FLOOR_GAP
      out.push(mouthStone(rng, { x, y: Ground.waterColumns().beds[Math.round(x) - Ground.waterColumns().x0] ?? floor.y }, false))
    }
  })
}
//
// A stone set half into the soil at an outline's point: hanging from a
// ceiling (its middle on the line) or lying on a floor.
//
function mouthStone(rng, at, hanging, size = 1) {
  const name = STONES[Math.floor(rng() * STONES.length)]
  const h = (MOUTH_H + rng() * MOUTH_H_RANGE) * size
  const w = Atlas.widthAt(name, h)
  const y = hanging ? at.y + h * HALF : at.y + STONE_SINK
  return { name, x: at.x, y, h, stone: true, flip: rng() < FLIP_CHANCE, box: { x1: at.x - w / 2, y1: y - h, x2: at.x + w / 2, y2: y } }
}
//
// Whether a piece may stand there: in a hollow under its ceiling with
// HEADROOM to spare; elsewhere deep enough, END_CLEAR px in from the
// lake's ends.
//
function fits(water, x, pc, hollow) {
  const col = columnOf(water, x)
  if (Number.isNaN(col.bed)) return false
  if (hollow) return pc.stone || pc.y - pc.h > col.top + HEADROOM
  return x > Layout.LAKE_X1 + END_CLEAR && x < Layout.LAKE_X2 - END_CLEAR && col.bed - Layout.LAKE_SURFACE_Y >= (pc.stone ? STONE_MIN_DEPTH : MIN_DEPTH)
}
function columnOf(water, x) {
  const i = Math.round(x) - water.x0
  return { top: water.tops[i] ?? NaN, bed: water.beds[i] ?? NaN }
}
function nextGap(rng) {
  return rng() < CLUMP_CHANCE ? CLUMP_GAP + rng() * CLUMP_GAP_RANGE : GAP + rng() * GAP_RANGE
}
//
// A stone or a plant standing on the soil at x.
//
function stand(rng, water, x, stone) {
  const names = stone ? STONES : PLANTS
  const name = names[Math.floor(rng() * names.length)]
  const h = stone ? STONE_H + rng() * STONE_H_RANGE : PLANT_H + rng() * PLANT_H_RANGE
  const w = Atlas.widthAt(name, h)
  const y = lowestUnder(water, x, w * ROOT_SHARE) + (stone ? STONE_SINK : UP_SINK)
  return { name, x, y, h, stone, flip: rng() < FLIP_CHANCE, box: { x1: x - w / 2, y1: y - h, x2: x + w / 2, y2: y } }
}
function lowestUnder(water, x, half) {
  let y = -Infinity
  for (let dx = -half; dx <= half; dx += ROOT_STEP) {
    const bed = columnOf(water, x + dx).bed
    Number.isNaN(bed) || (y = Math.max(y, bed))
  }
  return y
}
