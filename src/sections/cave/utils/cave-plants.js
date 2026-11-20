import { createSeededRandom } from '../../../utils/seeded-random.js'
import { CAVE_CFG } from '../cfg.js'
import * as Atlas from './cave-atlas.js'
import * as Layout from './cave-layout.js'
import * as Platform from './cave-platform.js'
//
// The cave's plants (plants.png and plants2.png, mixed), set by how each
// one grows:
// - up from a walkable top (grow, shroom, bush, sprout, tiny) — rooted
//   on the art's own top;
// - hanging from a ledge's underside or from the ceiling (hang), with
//   roots (roots.png, each with its soil clod at its top, some leaning)
//   hanging there too, behind every plant;
// - out of a wall or a ledge's free end sideways (side; a side plant's
//   root is on its left, so it is mirrored on a face that looks left);
// - small ones (FLOAT_KINDS) on the small platforms over the lake and in
//   the shaft.
// About every UP_GAP / HANG_GAP / SIDE_GAP px — in clumps and open
// stretches, never evenly spaced (nextGap) — never on a stone of the
// platforms' tops: a plant that would stand on one moves on to beside it
// (STONE_CLEAR px clear of it and its joints) — never at the
// creatures, the lantern, the roots' hole or the exit; pulled toward the
// cave's shade like everything in it. Placed once per page and painted
// into the terrain bake (behind the hero).
//
const SHADE = CAVE_CFG.earth.shade
const SHADE_AMOUNT = 0.35
const SEED = 7300
//
// How far a hanging plant's top and a root's top sink into what they hang
// from (a root ROOT_SINK px and ROOT_SINK_SHARE of its height more: its
// soil clod and the top of its strands go in).
//
const HANG_SINK = 10
const ROOT_SINK = 12
const ROOT_SINK_SHARE = 0.2
//
// Kinds by how they grow: piece prefixes (a piece is picked from all of
// them), drawn height (world px) and how often a kind is picked.
//
const UP_KINDS = [
  { prefixes: ['grow'], hMin: 40, hRange: 18, weight: 1 },
  { prefixes: ['shroom'], hMin: 30, hRange: 14, weight: 1 },
  { prefixes: ['bush'], hMin: 34, hRange: 16, weight: 1 },
  { prefixes: ['upB'], hMin: 34, hRange: 20, weight: 4 },
  { prefixes: ['sprout', 'sproutB'], hMin: 22, hRange: 10, weight: 2 },
  { prefixes: ['tiny', 'tinyB'], hMin: 14, hRange: 8, weight: 1 }
]
const HANG_LEDGE = { prefixes: ['hang', 'hangB'], hMin: 55, hRange: 35, weight: 1, sink: HANG_SINK }
const HANG_CEILING = { prefixes: ['hang', 'hangB'], hMin: 45, hRange: 25, weight: 1, sink: HANG_SINK }
const ROOT_PREFIX = 'root'
const ROOT_H = 45
const ROOT_H_RANGE = 60
const BYTE_ALPHA = 3
const RGBA = 4
const SIDE = { prefixes: ['side', 'sideB'], hMin: 45, hRange: 20, weight: 1 }
const FLOAT_KINDS = [
  { prefixes: ['sprout', 'sproutB'], hMin: 16, hRange: 8, weight: 1 },
  { prefixes: ['tiny', 'tinyB'], hMin: 12, hRange: 6, weight: 1 }
]
//
// Spacing along a top / an underside / a wall: the least gap and its
// spread; how far a plant sinks into what it grows from; how far from a
// free end or a wall it keeps.
//
const UP_GAP = 32
const HANG_GAP = 100
const SIDE_GAP = 110
const GAP_RANGE = 60
const UP_SINK = 3
const STONE_CLEAR = 6
//
// Roots hang about every ROOT_GAP..+ROOT_GAP_RANGE px under the ledges and
// the ceiling, never over one another (ROOT_CLEAR px between them at
// least), each hung by its base (the soil clod painted at its top: the
// middle of the art's top ROOT_BASE_ROWS rows) from the soil over it.
// ROOT_TILT_CHANCE of them lean up to ROOT_TILT rad about their base.
//
const ROOT_GAP = 70
const ROOT_GAP_RANGE = 90
const ROOT_TILT_CHANCE = 0.5
const ROOT_TILT = 0.3
const ROOT_CLEAR = 6
const ROOT_BASE_ROWS = 0.06
const ROOT_BASE_ALPHA = 128
//
// Gaps between plants are uneven: most come short — a clump, CLUMP_SHARE
// ..+CLUMP_RANGE of the usual gap — the rest leave an open stretch,
// OPEN_SHARE..+OPEN_RANGE of it (skewed toward its short end).
//
const CLUMP_CHANCE = 0.6
const CLUMP_SHARE = 0.25
const CLUMP_RANGE = 0.6
const OPEN_SHARE = 1.2
const OPEN_RANGE = 3
const HALF = 0.5
//
// A plant's root spans this share of its drawn width either side of its
// middle; the soil under it is read every ROOT_STEP px.
//
const ROOT_SHARE = 0.3
const ROOT_STEP = 2
const SIDE_SINK = 10
const END_CLEAR = 30
const WALL_CLEAR = 20
//
// A free end gets a side plant at its middle this often.
//
const END_SIDE_CHANCE = 0.7
//
// Plants keep this far from the lake's ends (and its surface's height);
// its bowl reaches LAKE_DEPTH px under its surface. A small platform at
// least FLOAT_PLANT_MIN_W wide gets a plant this often, off its middle by
// up to FLOAT_PLANT_SPREAD of its width.
//
const LAKE_CLEAR = 20
const LAKE_DEPTH = 300
const FLOAT_PLANT_MIN_W = 60
const FLOAT_PLANT_CHANCE = 0.75
const FLOAT_PLANT_SPREAD = 0.3
//
// A wall's face is open between the ceiling (WALL_CEIL_CLEAR under it)
// and the platforms running into it (kept WALL_PLATFORM_CLEAR clear).
//
const WALL_CEIL_CLEAR = 60
const WALL_PLATFORM_CLEAR = 40
//
// Spots kept clear: x and half width round it (the roots' hole: the
// ceiling over it and the ledge the hero lands on).
//
const CLEAR = [
  { x: Layout.STALK_EYE.x, r: 110 },
  { x: Layout.LANTERN.x, r: 70 },
  { x: Layout.ENTRY_X, r: Layout.ENTRY_HALF_W + 50 }
]
let plants = null
const rootBases = new Map()

/**
 * Paints the plants that reach into a world rect (placed once per page).
 * @param {CanvasRenderingContext2D} ctx - World-translated context
 * @param {{x1: number, y1: number, x2: number, y2: number}} rect - World rect to cover
 */
export function paint(ctx, rect) {
  plants ??= place()
  plants.forEach(pl => paintPlant(ctx, rect, pl))
}
function paintPlant(ctx, rect, pl) {
  pl.box.x2 >= rect.x1 && pl.box.x1 <= rect.x2 && pl.box.y2 >= rect.y1 && pl.box.y1 <= rect.y2 &&
    Atlas.drawPiece(ctx, pl.name, pl.x, pl.y, pl.h, { flip: pl.flip, hang: pl.hang, angle: pl.angle, pivot: 0, shade: SHADE, shadeAmount: SHADE_AMOUNT })
}
//
// Every plant: up on the tops, hanging under the ledges and the ceiling,
// sideways on the walls and the ledges' free ends.
//
function place() {
  const rng = createSeededRandom(SEED)
  const out = []
  Layout.PLATFORMS.filter(p => p.kind === Layout.PLATFORM_KIND.LEDGE).forEach(p => placeRoots(rng, out, runOf(p), x => Platform.undersideAt(p, x)))
  placeRoots(rng, out, { from: Layout.WALL_COLLIDE_W + WALL_CLEAR, to: Layout.WORLD_W - Layout.WALL_COLLIDE_W - WALL_CLEAR }, Layout.ceilingBottomAt)
  Layout.PLATFORMS.filter(p => p.kind !== Layout.PLATFORM_KIND.FLOAT).forEach(p => placeOnTop(rng, out, p))
  Layout.PLATFORMS.filter(p => p.kind === Layout.PLATFORM_KIND.LEDGE).forEach(p => placeUnder(rng, out, p))
  placeUnderCeiling(rng, out)
  placeOnWall(rng, out, -1)
  placeOnWall(rng, out, 1)
  Layout.PLATFORMS.filter(p => p.kind === Layout.PLATFORM_KIND.FLOAT && p.w >= FLOAT_PLANT_MIN_W).forEach(p => placeOnFloat(rng, out, p))
  return out
}
function placeOnFloat(rng, out, p) {
  if (rng() > FLOAT_PLANT_CHANCE) return
  const x = p.x + (rng() * 2 - 1) * p.w * FLOAT_PLANT_SPREAD
  out.push(upright(rng, pickKind(rng, FLOAT_KINDS), x, groundUnder(p)))
}
function placeOnTop(rng, out, p) {
  const { from, to } = runOf(p)
  const stones = Platform.stoneSpansOn(p)
  for (let x = from + rng() * UP_GAP; x < to; x += nextGap(rng, UP_GAP, GAP_RANGE)) {
    let plant = upright(rng, pickKind(rng, UP_KINDS), x, groundUnder(p))
    for (let stone = onStone(plant, stones); stone; stone = onStone(plant, stones)) {
      x = stone.x2 + STONE_CLEAR + (plant.box.x2 - plant.box.x1) / 2
      plant = movedTo(plant, x, groundUnder(p))
    }
    x < to && isClear(x) && !inLake(x, Platform.surfaceAt(p, x)) && out.push(plant)
  }
}
//
// The stone (with its joints) a plant would stand on, if any.
//
function onStone(plant, stones) {
  return stones.find(s => plant.box.x2 > s.x1 - STONE_CLEAR && plant.box.x1 < s.x2 + STONE_CLEAR)
}
function placeUnder(rng, out, p) {
  const { from, to } = runOf(p)
  for (let x = from + rng() * HANG_GAP; x < to; x += nextGap(rng, HANG_GAP, GAP_RANGE)) {
    isClear(x) && out.push(hanging(rng, HANG_LEDGE, x, sx => Platform.undersideAt(p, sx)))
  }
  p.x1 > 0 && rng() < END_SIDE_CHANCE && out.push(sideways(rng, p.x1, ledgeMid(p, p.x1), -1))
  p.x2 < Layout.WORLD_W && !p.joinR && rng() < END_SIDE_CHANCE && out.push(sideways(rng, p.x2, ledgeMid(p, p.x2), 1))
}
function ledgeMid(p, x) {
  return (Layout.topAt(p, x) + Platform.undersideAt(p, x)) / 2
}
//
// Roots along a run under what they hang from (first, so every plant hangs
// in front of them).
//
function placeRoots(rng, out, run, ceilingAt) {
  const names = Atlas.pieceNames(ROOT_PREFIX)
  let right = -Infinity
  for (let x = run.from + rng() * ROOT_GAP; x < run.to; x += nextGap(rng, ROOT_GAP, ROOT_GAP_RANGE)) {
    const name = names[Math.floor(rng() * names.length)]
    const h = ROOT_H + rng() * ROOT_H_RANGE
    const flip = rng() < HALF
    const angle = rng() < ROOT_TILT_CHANCE ? (rng() * 2 - 1) * ROOT_TILT : 0
    const reach = Atlas.widthAt(name, h) / 2 + h * Math.sin(Math.abs(angle))
    x = Math.max(x, right + ROOT_CLEAR + reach)
    if (x >= run.to || !isClear(x)) continue
    const root = rootAt(name, x, h, flip, angle, ceilingAt)
    right = root.box.x2
    out.push(root)
  }
}
//
// A root hanging with its base at x, from the soil over its base (the
// highest of it, so no part of the base shows a gap), sunk into it
// (ROOT_SINK, ROOT_SINK_SHARE); its box holding its lean.
//
function rootAt(name, x, h, flip, angle, ceilingAt) {
  const w = Atlas.widthAt(name, h)
  const base = rootBase(name)
  const off = (base.cx - HALF) * w * (flip ? -1 : 1)
  const half = base.w * w * HALF
  let y = Infinity
  for (let dx = -half; dx <= half; dx += ROOT_STEP) y = Math.min(y, ceilingAt(x + dx))
  y -= ROOT_SINK + h * ROOT_SINK_SHARE
  const reach = h * Math.sin(Math.abs(angle))
  const cx = x - off
  return { name, x: cx, y, h, flip, angle, hang: true, base: { x, w: base.w * w }, box: { x1: cx - w / 2 - reach, y1: y, x2: cx + w / 2 + reach, y2: y + h } }
}
//
// A root piece's base: its top rows' opaque width and middle (shares of
// the piece's width), read once.
//
function rootBase(name) {
  if (rootBases.has(name)) return rootBases.get(name)
  const src = Atlas.piece(name)
  const rows = Math.max(1, Math.round(src.height * ROOT_BASE_ROWS))
  const data = src.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, src.width, src.height).data
  let top = 0
  while (top < src.height - 1 && !rowHas(data, src.width, top)) top++
  let x1 = src.width
  let x2 = 0
  for (let y = top; y < Math.min(src.height, top + rows); y++) {
    for (let x = 0; x < src.width; x++) {
      if (data[(y * src.width + x) * RGBA + BYTE_ALPHA] < ROOT_BASE_ALPHA) continue
      x1 = Math.min(x1, x)
      x2 = Math.max(x2, x)
    }
  }
  const base = x2 >= x1 ? { w: (x2 - x1 + 1) / src.width, cx: (x1 + x2 + 1) * HALF / src.width } : { w: 1, cx: HALF }
  rootBases.set(name, base)
  return base
}
function rowHas(data, w, y) {
  for (let x = 0; x < w; x++) if (data[(y * w + x) * RGBA + BYTE_ALPHA] >= ROOT_BASE_ALPHA) return true
  return false
}
function placeUnderCeiling(rng, out) {
  for (let x = Layout.WALL_COLLIDE_W + WALL_CLEAR + rng() * HANG_GAP; x < Layout.WORLD_W - Layout.WALL_COLLIDE_W - WALL_CLEAR; x += nextGap(rng, HANG_GAP, GAP_RANGE)) {
    isClear(x) && out.push(hanging(rng, HANG_CEILING, x, Layout.ceilingBottomAt))
  }
}
//
// Side plants up an open stretch of a wall's face (dir -1: the left wall,
// its face looking right).
//
function placeOnWall(rng, out, dir) {
  const faceAt = y => dir < 0 ? Layout.leftWallX(y) : Layout.rightWallX(y)
  wallOpenings(dir).forEach(open => {
    for (let y = open.y1 + rng() * SIDE_GAP; y < open.y2; y += nextGap(rng, SIDE_GAP, GAP_RANGE)) out.push(sideways(rng, faceAt(y), y, -dir))
  })
}
//
// Where a wall's face is bare: from under the ceiling down, less the
// platforms that run into it.
//
function wallOpenings(dir) {
  const wallX = dir < 0 ? Layout.WALL_COLLIDE_W : Layout.WORLD_W - Layout.WALL_COLLIDE_W
  const taken = Layout.PLATFORMS
    .filter(p => dir < 0 ? p.x1 <= 0 : p.x2 >= Layout.WORLD_W)
    .map(p => ({
      y1: Layout.topAt(p, wallX) - WALL_PLATFORM_CLEAR,
      y2: p.kind === Layout.PLATFORM_KIND.LEDGE ? Platform.undersideAt(p, wallX) + WALL_PLATFORM_CLEAR : Infinity
    }))
    .sort((a, b) => a.y1 - b.y1)
  const open = []
  let y = Layout.ceilingBottomAt(wallX) + WALL_CEIL_CLEAR
  taken.forEach(t => {
    t.y1 > y && open.push({ y1: y, y2: t.y1 })
    y = Math.max(y, t.y2)
  })
  y < Layout.WORLD_H && open.push({ y1: y, y2: Layout.WORLD_H })
  return open
}
//
// The stretch of a platform's top plants may take: clear of free ends and
// walls.
//
function runOf(p) {
  return {
    from: p.x1 > 0 ? p.x1 + END_CLEAR : Layout.WALL_COLLIDE_W + WALL_CLEAR,
    to: p.x2 < Layout.WORLD_W ? p.x2 - END_CLEAR : Layout.WORLD_W - Layout.WALL_COLLIDE_W - WALL_CLEAR
  }
}
//
// The gap to the next plant: around gap + half its range, short in a
// clump or long over an open stretch.
//
function nextGap(rng, gap, range) {
  const usual = gap + range * HALF
  return rng() < CLUMP_CHANCE ? usual * (CLUMP_SHARE + rng() * CLUMP_RANGE) : usual * (OPEN_SHARE + rng() * rng() * OPEN_RANGE)
}
function isClear(x) {
  return CLEAR.every(c => Math.abs(x - c.x) > c.r)
}
//
// Nothing grows up out of the lake's bowl or right at its edge (its algae
// are the lake's); ledges high over it and the passage deep under it are
// not in it.
//
function inLake(x, y) {
  return x > Layout.LAKE_X1 - LAKE_CLEAR && x < Layout.LAKE_X2 + LAKE_CLEAR && y > Layout.LAKE_SURFACE_Y - LAKE_CLEAR && y < Layout.LAKE_SURFACE_Y + LAKE_DEPTH
}
function pickKind(rng, kinds) {
  let roll = rng() * kinds.reduce((sum, kind) => sum + kind.weight, 0)
  return kinds.find(kind => (roll -= kind.weight) < 0) ?? kinds[kinds.length - 1]
}
function pickName(rng, kind) {
  const names = kind.prefixes.flatMap(prefix => Atlas.pieceNames(prefix))
  return names[Math.floor(rng() * names.length)]
}
//
// The ground a plant stands on over a platform: the lowest soil under its
// root (half width `half` either side of x), UP_SINK px into it, so no
// part of its root hangs in the air.
//
function groundUnder(p) {
  return (x, half) => {
    let y = -Infinity
    for (let dx = -half; dx <= half; dx += ROOT_STEP) y = Math.max(y, Platform.surfaceAt(p, x + dx))
    return y + UP_SINK
  }
}
//
// A plant standing on the ground under it at x.
//
function upright(rng, kind, x, groundAt) {
  const name = pickName(rng, kind)
  const h = kind.hMin + rng() * kind.hRange
  const w = Atlas.widthAt(name, h)
  const y = groundAt(x, w * ROOT_SHARE)
  return { name, x, y, h, flip: rng() < 0.5, hang: false, box: { x1: x - w / 2, y1: y - h, x2: x + w / 2, y2: y } }
}
//
// The same standing plant moved to x, on the ground there.
//
function movedTo(plant, x, groundAt) {
  const w = plant.box.x2 - plant.box.x1
  const y = groundAt(x, w * ROOT_SHARE)
  return { ...plant, x, y, box: { x1: x - w / 2, y1: y - plant.h, x2: x + w / 2, y2: y } }
}
//
// A plant hanging at x from the highest point of what it hangs from over
// its root (so none of its top hangs in the air), its kind's sink px into
// it.
//
function hanging(rng, kind, x, ceilingAt) {
  const name = pickName(rng, kind)
  const h = kind.hMin + rng() * kind.hRange
  const w = Atlas.widthAt(name, h)
  let y = Infinity
  for (let dx = -w * ROOT_SHARE; dx <= w * ROOT_SHARE; dx += ROOT_STEP) y = Math.min(y, ceilingAt(x + dx))
  y -= kind.sink
  return { name, x, y, h, flip: rng() < 0.5, hang: true, box: { x1: x - w / 2, y1: y, x2: x + w / 2, y2: y + h } }
}
//
// A side plant rooted in a face at (x, y), growing out toward `out` (1:
// right, as on its sheet; -1: left, mirrored).
//
function sideways(rng, x, y, out) {
  const name = pickName(rng, SIDE)
  const h = SIDE.hMin + rng() * SIDE.hRange
  const w = Atlas.widthAt(name, h)
  const cx = x + out * (w / 2 - SIDE_SINK)
  return { name, x: cx, y: y + h / 2, h, flip: out < 0, hang: false, box: { x1: cx - w / 2, y1: y - h / 2, x2: cx + w / 2, y2: y + h / 2 } }
}
