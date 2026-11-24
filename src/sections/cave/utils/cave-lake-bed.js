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
// the hollows' mouths lined with stones (MOUTH_*), both hollows lined
// with stones all round, a darker wall of them behind (PAVE_*, WALL_*).
// They are painted into the terrain
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
// Both hollows lined with stones all round their arcs (each set half into
// the soil, its middle on the arc) and on along the floor from the arc's
// foot out to PAVE_TO px past the floor's mark toward the mouth (set half
// into the bed evened out over FLOOR_SMOOTH px either way, so the arc runs
// on smoothly down over the floor's drop onto the lake's bed; nothing else
// of the bed's stands from PAVE_FROM px off that
// mark on, the near row painted over the rest), PAVE_H..+RANGE px high,
// one every PAVE_GAP..+RANGE px, never quite on the line: each off it up
// to PAVE_JITTER px either way, PAVE_DEEP_CHANCE of them up to PAVE_DEEP
// px deeper into the soil (a ragged edge of stones, not a string of
// beads); lighter than the bed's other stones (PAVE_SHADE toward the deep:
// a path that reads through the water) — the near row, painted with the
// bed (in front of the giant and the fish). Its back wall (the arc's part
// EMBED_SIDE of its half width or more off its middle, away from the
// mouth) has more stones sunk into the soil: one every EMBED_GAP..+RANGE
// px, EMBED_FROM..+RANGE px into it.
//
// Behind it, the far stones (behind the giant and the fish: baked on
// their own once per live k, grained, PAD px round them, onDrawBack): a
// wall of stones going in from the mouth under the near row's light ones —
// WALL_ROWS rows round the arc, each the arc drawn in WALL_SHRINK more
// toward its middle, WALL_DX0 + WALL_DX px a row further toward the mouth
// and WALL_UP px a row higher — its lower WALL_MEET share bent down onto
// the floor (eased in, all of it at the arc's foot): the rows come right
// down to the bed and meet in one line along it —, one stone every
// WALL_GAP..+RANGE px, each thrown up to WALL_SCATTER px off its row
// either way (no neat arcs); behind them a second layer of stones half way
// between every two rows (and between the near arc and the first row),
// and behind it all the band from the near arc to the last row filled
// with more (FILL_PER of them at random depths across it every FILL_GAP px
// along the arc), so no gap shows between the stones; and a thick band
// along the floor (BACK_FLOOR_ROWS rows BACK_UP px apart, one every
// BACK_GAP..+RANGE px), the rows' one line run on from
// BACK_IN px off the back wall out to PAVE_BACK_MORE px past the near
// row's end.
//
const PAVE_FROM = -110
const PAVE_TO = 110
const PAVE_H = 10
const PAVE_H_RANGE = 9
const PAVE_GAP = 8
const PAVE_GAP_RANGE = 6
const PAVE_JITTER = 6
const PAVE_DEEP = 9
const PAVE_DEEP_CHANCE = 0.3
const PAVE_SHADE = 0.05
const PAVE_BACK_MORE = 260
//
// The near row's rough stones lie out on the soil in places (see
// EDGE_OUT): under them a seal of stones right on the hollow's true edge,
// one every SEAL_GAP..+RANGE px, each up to SEAL_IN px out over the water,
// so the soil's edge never shows between the stones and the lake.
//
const SEAL_GAP = 6
const SEAL_GAP_RANGE = 3
const SEAL_IN = 6
const FLOOR_SMOOTH = 45
const FLOOR_SMOOTH_STEP = 3
const WALL_ROWS = 4
const WALL_SHRINK = 0.06
const WALL_DX0 = 26
const WALL_DX = 14
const WALL_UP = 3
const WALL_GAP = 6
const WALL_GAP_RANGE = 5
const WALL_MEET = 0.35
const WALL_TOP_MEET = 0.3
const WALL_SCATTER = 11
//
// Each row of the far wall waves off its line by up to WALL_WAVE px either
// way (WALL_WAVE_F bumps along the arc, the wave's phase moving on by
// WALL_WAVE_SHIFT a row, so near rows wave alike and no gap opens between
// them), fading to nothing where the rows meet at the top and the floor.
//
const WALL_WAVE = 9
const WALL_WAVE_F = 7
const WALL_WAVE_F2 = 13
const WALL_WAVE_SHIFT = 0.9
//
// The hollow's edge is no clean ellipse: its arc is pushed out into the
// soil by up to EDGE_OUT px, by two slow waves (EDGE_F1, EDGE_F2 bumps
// along the half ellipse, their phases different in each hollow), the push
// fading to nothing at the arc's ends (its top under the bank's edge and
// its foot on the floor).
//
const EDGE_OUT = 12
const EDGE_F1 = 5
const EDGE_F2 = 11
const EDGE_MIX = 0.6
const EDGE_PHASE = 1.7
const EDGE_PHASE2 = 4.1
const FILL_GAP = 4
const FILL_PER = 5
//
// The far stones (all darker than the near row's light ones) darken the
// further into the hollow they lie — a cave going back into the dark: from
// BACK_LIGHT toward the deep at the wall's outermost arc (by the mouth) to
// BACK_DARK at the hollow's back wall, by their place along the lake
// alone (right to left in the left hollow, left to right in the right
// one); the second layer BETWEEN_EXTRA and the fill FILL_EXTRA darker
// still; rounded to SHADE_STEPs (every shade of a stone is its own picture
// in the atlas' cache: a few steps keep that small), never past SHADE_MAX.
//
const BACK_LIGHT = 0.2
const BACK_DARK = 0.95
const BETWEEN_EXTRA = 0.04
const FILL_EXTRA = 0.08
const SHADE_MAX = 0.95
const SHADE_STEP = 0.05
const BETWEEN_SEED = 7610
const FILL_SEED = 7590
const BACK_FLOOR_ROWS = 2
const BACK_UP = 7
const BACK_GAP = 6
const BACK_GAP_RANGE = 5
const BACK_IN = 14
//
// Loose stones lying on the floor in front of the far wall: one every
// RUBBLE_GAP..+RANGE px from the back wall out to RUBBLE_PAST px past the
// floor's mark, RUBBLE_SCALE..+RANGE times a paving stone's size, with
// RUBBLE_PILE_CHANCE another smaller one (RUBBLE_TOP_SCALE) lying on top
// of it, RUBBLE_PILE_DX px off its middle at most.
//
const RUBBLE_GAP = 12
const RUBBLE_GAP_RANGE = 18
const RUBBLE_PAST = 60
const RUBBLE_SCALE = 1.6
const RUBBLE_SCALE_RANGE = 0.9
const RUBBLE_PILE_CHANCE = 0.45
const RUBBLE_TOP_SCALE = 0.8
const RUBBLE_PILE_DX = 6
const RUBBLE_SEED = 7630
const EMBED_SIDE = 0.25
const EMBED_GAP = 9
const EMBED_GAP_RANGE = 6
const EMBED_FROM = 8
const EMBED_RANGE = 16
const HOLLOWS = [Layout.BANK_HOLLOW_L, Layout.BANK_HOLLOW_R]
const PAVE_SEED = 7490
const WALL_SEED = 7510
const BACK_FLOOR_SEED = 7550
const EMBED_SEED = 7570
const SEED_STEP = 97
const BACK_SPRITE = 'cave0-pave-back'
const BACK_GRAIN = 7530
const PAD = 2
const backFor = new WeakMap()
let pieces = null
let lining = null
let backPieces = null

/**
 * Draws the far stones lining both hollows (behind the giant and the fish;
 * baked on first use per live k).
 * @param {Object} k - Kaplay instance
 */
export function onDrawBack(k) {
  const back = backFor.get(k) ?? bakeBack(k)
  back && k.drawSprite({ sprite: BACK_SPRITE, pos: back.pos })
}

/**
 * Paints the stones lining the hollows (round their arcs, sunk into their
 * walls, round their mouths) as they look, for the lake to draw over its
 * water under a light haze of it (cave-lake.js: the stones stay light, the
 * water's edge follows them, not the soil's arc).
 * @param {CanvasRenderingContext2D} ctx - World-translated context
 */
export function paintLining(ctx) {
  pieces ??= place()
  lining.forEach(pc => Atlas.drawPiece(ctx, pc.name, pc.x, pc.y, pc.h, { flip: pc.flip, shade: SHADE, shadeAmount: pc.shade }))
}

/**
 * The world rect the hollows' lining stones cover.
 * @returns {{x1: number, y1: number, x2: number, y2: number}}
 */
export function liningBox() {
  pieces ??= place()
  return {
    x1: Math.floor(Math.min(...lining.map(pc => pc.box.x1))),
    y1: Math.floor(Math.min(...lining.map(pc => pc.box.y1))),
    x2: Math.ceil(Math.max(...lining.map(pc => pc.box.x2))),
    y2: Math.ceil(Math.max(...lining.map(pc => pc.box.y2)))
  }
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
  const mouth = []
  mouthStones(mouth)
  const lined = HOLLOWS.flatMap((hollow, i) => [...embed(hollow, EMBED_SEED + i * SEED_STEP), ...pave(hollow, PAVE_SEED + i * SEED_STEP)])
  lining = [...mouth, ...lined]
  return [...[...out, ...mouth].sort((a, b) => Number(b.stone) - Number(a.stone)), ...lined]
}
//
// Whether a piece would stand on a hollow's paved stretch (kept clear for
// it).
//
function paved(pc) {
  return HOLLOWS.some(hollow => {
    const out = -hollow.side
    const a = hollow.floor.x + out * PAVE_FROM
    const b = hollow.floor.x + out * (PAVE_TO + PAVE_BACK_MORE + WALL_DX0 + WALL_DX * WALL_ROWS)
    return pc.box.x2 > Math.min(a, b) && pc.box.x1 < Math.max(a, b)
  })
}
//
// The near row of a hollow: a seal on its true edge, its rough stones over
// that round its arc, and on along its floor out of its mouth.
//
function pave(hollow, seed) {
  const rng = createSeededRandom(seed)
  const out = []
  alongArc(Layout.hollowArc(hollow), rng, SEAL_GAP, SEAL_GAP_RANGE, p => {
    const n = arcNormal(hollow, p)
    const into = -rng() * SEAL_IN
    out.push(paveStone(rng, p.x + n.x * into, p.y + n.y * into, true, PAVE_SHADE))
  })
  alongArc(roughArc(hollow), rng, PAVE_GAP, PAVE_GAP_RANGE, p => {
    const n = arcNormal(hollow, p)
    const into = offLine(rng)
    out.push(paveStone(rng, p.x + n.x * into, p.y + n.y * into, true, PAVE_SHADE))
  })
  alongFloor(hollow, hollow.x, PAVE_TO, PAVE_GAP, PAVE_GAP_RANGE, rng, (x, bed) => out.push(paveStone(rng, x, bed + offLine(rng), true, PAVE_SHADE)))
  return out
}
//
// The far wall of stones in a hollow: rows round its arc, each drawn in
// toward its middle, further toward the mouth and higher — all meeting in
// one line at the floor —, every stone scattered off its row, drawn
// innermost first (the first row over the rest).
//
function wall(hollow, seed) {
  return wallRows(hollow, seed, 0)
}
//
// The wall's second layer: rows half way between its rows (and between the
// near arc and its first row), behind them — they close the gaps between
// the rows' stones.
//
function wallBetween(hollow, seed) {
  return wallRows(hollow, seed, -HALF)
}
//
// The wall's rows (each `shift` rows off its own place), their stones
// scattered up to WALL_SCATTER px either way.
//
function wallRows(hollow, seed, shift) {
  const rng = createSeededRandom(seed)
  const out = []
  const arc = roughArc(hollow)
  for (let row = WALL_ROWS - 1; row >= 0; row--) {
    const line = arc.map((p, i) => waveRow(hollow, wallPoint(hollow, p, row + shift), i / (arc.length - 1), row + shift))
    alongArc(line, rng, WALL_GAP, WALL_GAP_RANGE, p => out.push(paveStone(rng, p.x + scatter(rng), p.y + scatter(rng), true, 0)))
  }
  return out
}
//
// A point of a far row moved off it by the row's wave (see WALL_WAVE), `t`
// its place along the arc (0..1).
//
function waveRow(hollow, p, t, row) {
  const phase = hollow.side * EDGE_PHASE + row * WALL_WAVE_SHIFT
  const wave = EDGE_MIX * Math.sin(Math.PI * WALL_WAVE_F * t + phase) + (1 - EDGE_MIX) * Math.sin(Math.PI * WALL_WAVE_F2 * t + phase * EDGE_PHASE2)
  const off = WALL_WAVE * wave * Math.sin(Math.PI * t)
  const n = arcNormal(hollow, p)
  return { x: p.x + n.x * off, y: p.y + n.y * off }
}
function scatter(rng) {
  return (rng() * 2 - 1) * WALL_SCATTER
}
//
// A hollow's far stones shaded by how deep in it they lie along the lake:
// BACK_LIGHT (+ `extra`) at the wall's outermost arc by the mouth,
// BACK_DARK at the back wall.
//
function shadeByDepth(hollow, stones, extra) {
  const light = hollow.x - hollow.side * (WALL_DX0 + WALL_DX * WALL_ROWS)
  const dark = hollow.x + hollow.side * hollow.rx
  stones.forEach(pc => {
    const deep = Math.max(0, Math.min(1, (pc.x - light) / (dark - light)))
    const shade = Math.min(SHADE_MAX, BACK_LIGHT + extra + (BACK_DARK - BACK_LIGHT) * deep)
    pc.shade = Math.round(shade / SHADE_STEP) * SHADE_STEP
  })
  return stones
}
//
// The darker stones behind the wall's rows, filling the band from the
// near row's arc to the wall's last row (no gap between the near stones
// and the wall).
//
function wallFill(hollow, seed) {
  const rng = createSeededRandom(seed)
  const out = []
  alongArc(roughArc(hollow), rng, FILL_GAP, 0, p => {
    const a = p
    const b = wallPoint(hollow, p, WALL_ROWS - 1)
    for (let i = 0; i < FILL_PER; i++) {
      const u = rng()
      out.push(paveStone(rng, a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u, true, 0))
    }
  })
  return out
}
//
// Where a point of the arc lies in a row of the far wall: drawn in toward
// the middle, toward the mouth and up — and the lower down the arc the
// more bent down onto the floor under it (on it at the arc's foot), so the
// rows come right down to the bed.
//
function wallPoint(hollow, p, row) {
  const shrink = 1 - WALL_SHRINK * row
  const top = smoothstep((p.y - hollow.y + hollow.ry) / (2 * hollow.ry * WALL_TOP_MEET))
  const x = p.x + (hollow.x + (p.x - hollow.x) * shrink - hollow.side * (WALL_DX0 + WALL_DX * row) - p.x) * top
  const y = p.y + (hollow.y + (p.y - hollow.y) * shrink - WALL_UP * (row + 1) - p.y) * top
  const down = 1 - smoothstep((hollow.y + hollow.ry - p.y) / (2 * hollow.ry * WALL_MEET))
  const floor = smoothBed(Ground.waterColumns(), x)
  return { x, y: Number.isNaN(floor) ? y : y + (Math.max(y, floor) - y) * down }
}
//
// The far band along a hollow's floor: rows of dark stones on the bed from
// BACK_IN px off its back wall out past its mouth.
//
function floorBand(hollow, seed) {
  const rng = createSeededRandom(seed)
  const out = []
  for (let row = 0; row < BACK_FLOOR_ROWS; row++) {
    const from = hollow.x + hollow.side * (hollow.rx - BACK_IN - row * BACK_GAP * HALF)
    alongFloor(hollow, from, PAVE_TO + PAVE_BACK_MORE, BACK_GAP, BACK_GAP_RANGE, rng, (x, bed) => out.push(paveStone(rng, x, bed - row * BACK_UP, false, 0)))
  }
  return out
}
//
// Points on a hollow's floor (the bed) from x out toward its mouth to
// `past` px beyond the floor's mark, every gap..+range px.
//
//
// Loose stones lying on a hollow's floor (see RUBBLE_GAP), some in piles
// of two.
//
function rubble(hollow, seed) {
  const rng = createSeededRandom(seed)
  const out = []
  const from = hollow.x + hollow.side * (hollow.rx - BACK_IN)
  alongFloor(hollow, from, RUBBLE_PAST, RUBBLE_GAP, RUBBLE_GAP_RANGE, rng, (x, bed) => {
    const low = paveStone(rng, x, bed, false, 0, RUBBLE_SCALE + rng() * RUBBLE_SCALE_RANGE)
    out.push(low)
    rng() < RUBBLE_PILE_CHANCE && out.push(paveStone(rng, x + (rng() * 2 - 1) * RUBBLE_PILE_DX, low.box.y1, true, 0, RUBBLE_TOP_SCALE))
  })
  return out
}
function alongFloor(hollow, from, past, gap, range, rng, fn) {
  const water = Ground.waterColumns()
  const toMouth = -hollow.side
  const end = hollow.floor.x + toMouth * past
  for (let x = from; (end - x) * toMouth > 0; x += toMouth * (gap + rng() * range)) {
    const bed = smoothBed(water, x)
    Number.isNaN(bed) || fn(x, bed)
  }
}
//
// The bed's line at x evened out over FLOOR_SMOOTH px either way (the step
// where a hollow's floor drops to the lake's bed becomes a slope the
// stones run down smoothly).
//
function smoothBed(water, x) {
  let sum = 0
  let n = 0
  for (let d = -FLOOR_SMOOTH; d <= FLOOR_SMOOTH; d += FLOOR_SMOOTH_STEP) {
    const bed = columnOf(water, x + d).bed
    if (Number.isNaN(bed)) continue
    sum += bed
    n++
  }
  return n ? sum / n : NaN
}
//
// Stones sunk deep into the soil of a hollow's back wall (the near row).
//
function embed(hollow, seed) {
  const rng = createSeededRandom(seed)
  const out = []
  const backWall = roughArc(hollow).filter(p => (p.x - hollow.x) * hollow.side > hollow.rx * EMBED_SIDE)
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
// 0..1 clamped and eased in and out.
//
function smoothstep(v) {
  const u = Math.max(0, Math.min(1, v))
  return u * u * (3 - 2 * u)
}
//
// A hollow's arc with its edge roughened (see EDGE_OUT).
//
function roughArc(hollow) {
  const arc = Layout.hollowArc(hollow)
  const last = arc.length - 1
  const phase = hollow.side * EDGE_PHASE
  return arc.map((p, i) => {
    const t = i / last
    const wave = EDGE_MIX * Math.sin(Math.PI * EDGE_F1 * t + phase) + (1 - EDGE_MIX) * Math.sin(Math.PI * EDGE_F2 * t + phase * EDGE_PHASE2)
    const out = EDGE_OUT * HALF * (1 + wave) * Math.sin(Math.PI * t)
    const n = arcNormal(hollow, p)
    return { x: p.x + n.x * out, y: p.y + n.y * out }
  })
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
// A paving stone at (x, y), `scale` times its usual size: its middle there
// (set half into the soil) or standing on it.
//
function paveStone(rng, x, y, set, shade, scale = 1) {
  const name = STONES[Math.floor(rng() * STONES.length)]
  const h = (PAVE_H + rng() * PAVE_H_RANGE) * scale
  const w = Atlas.widthAt(name, h)
  const bottom = set ? y + h * HALF : y + STONE_SINK
  return { name, x, y: bottom, h, shade, stone: true, flip: rng() < FLIP_CHANCE, box: { x1: x - w / 2, y1: bottom - h, x2: x + w / 2, y2: bottom } }
}
//
// The far stones baked on their own canvas (their box, PAD px round),
// grained.
//
function bakeBack(k) {
  backPieces ??= HOLLOWS.flatMap((hollow, i) => [
    ...shadeByDepth(hollow, wallFill(hollow, FILL_SEED + i * SEED_STEP), FILL_EXTRA),
    ...shadeByDepth(hollow, wallBetween(hollow, BETWEEN_SEED + i * SEED_STEP), BETWEEN_EXTRA),
    ...shadeByDepth(hollow, floorBand(hollow, BACK_FLOOR_SEED + i * SEED_STEP), 0),
    ...shadeByDepth(hollow, wall(hollow, WALL_SEED + i * SEED_STEP), 0),
    ...shadeByDepth(hollow, rubble(hollow, RUBBLE_SEED + i * SEED_STEP), 0)
  ])
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
