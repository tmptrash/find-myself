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
//   roots (roots.png) hanging there too, behind every plant;
// - out of a wall or a ledge's free end sideways (side; a side plant's
//   root is on its left, so it is mirrored on a face that looks left);
// - small ones (FLOAT_KINDS) on the small platforms over the lake and in
//   the shaft.
// About every UP_GAP / HANG_GAP / SIDE_GAP px — in clumps and open
// stretches, never evenly spaced (nextGap) — never at the
// creatures, the lantern, the roots' hole or the exit; pulled toward the
// cave's shade like everything in it. Placed once per page and painted
// into the terrain bake (behind the hero).
//
const SHADE = CAVE_CFG.earth.shade
const SHADE_AMOUNT = 0.35
const SEED = 7300
//
// How far a hanging plant's top and a root's top sink into what they hang
// from.
//
const HANG_SINK = 10
const ROOT_SINK = 12
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
const ROOTS = { prefixes: ['root'], hMin: 45, hRange: 60, weight: 1, sink: ROOT_SINK }
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
//
// Roots hang about every ROOT_GAP..+ROOT_GAP_RANGE px under the ledges and
// the ceiling.
//
const ROOT_GAP = 70
const ROOT_GAP_RANGE = 90
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
  { x: Layout.ENTRY_X, r: Layout.ENTRY_HALF_W + 50 },
  { x: (Layout.EXIT.x1 + Layout.EXIT.x2) / 2, r: (Layout.EXIT.x2 - Layout.EXIT.x1) / 2 + 40 }
]
let plants = null

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
    Atlas.drawPiece(ctx, pl.name, pl.x, pl.y, pl.h, { flip: pl.flip, hang: pl.hang, shade: SHADE, shadeAmount: SHADE_AMOUNT })
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
  for (let x = from + rng() * UP_GAP; x < to; x += nextGap(rng, UP_GAP, GAP_RANGE)) {
    isClear(x) && !inLake(x, Platform.surfaceAt(p, x)) && out.push(upright(rng, pickKind(rng, UP_KINDS), x, groundUnder(p)))
  }
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
  for (let x = run.from + rng() * ROOT_GAP; x < run.to; x += nextGap(rng, ROOT_GAP, ROOT_GAP_RANGE)) {
    isClear(x) && out.push(hanging(rng, ROOTS, x, ceilingAt))
  }
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
