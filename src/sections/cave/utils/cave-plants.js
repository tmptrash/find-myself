import { createSeededRandom } from '../../../utils/seeded-random.js'
import { CAVE_CFG } from '../cfg.js'
import * as Atlas from './cave-atlas.js'
import * as Layout from './cave-layout.js'
import * as Platform from './cave-platform.js'
//
// The cave's plants (plants.png and plants2.png, mixed, and the greenery
// kit of small_plants.png), set by how each one grows:
// - up from a walkable top (grow, shroom, bush, sprout, tiny), and over
//   every top patches of the kit put together — a moss cushion, a few
//   leafy plants and grass tufts, sprouts round them — for a lot of green;
// - hanging from a ledge's underside or from the ceiling (hang, and the
//   kit's vines), with roots (roots.png, their strands drawn together at
//   the top) hanging there too, beside the hanging plants (never in front
//   of or behind one);
// - out of a wall or a ledge's free end sideways (side; a side plant's
//   root is on its left, so it is mirrored on a face that looks left);
// - small ones (FLOAT_KINDS) on the small platforms over the lake and in
//   the shaft.
// Every one grows out of the soil's very edge: its foot (where its art
// meets what it grows from: the middle of its last rows, or of its first
// for one hanging) set on the painted edge (a platform's top is read off
// its painted soil), sunk a little into it and turned square to it —
// perpendicular to the edge's curve there — and what of it would be in the
// soil is cut off along the edge (the plants are painted over the soil).
// Where the edge falls away under its foot (a dip, a rounded end) it sinks
// that much deeper, so none of it hangs in the air; where that would bury
// too much of it (more than DIP_SHARE of its height) or the edge turns
// steeper than TILT_MAX, nothing grows there.
// About every UP_GAP / HANG_GAP / SIDE_GAP px (the kit: its densities) — in clumps and
// open stretches, never evenly spaced (nextGap) — never on a stone of the
// platforms' tops: a plant that would stand on one moves on to beside it
// (STONE_CLEAR px clear of it and its joints) — never at the creatures,
// the lantern, the roots' hole or the exit; pulled toward the cave's shade
// like everything in it. Placed once per page and painted into the
// terrain bake (behind the hero).
//
const SHADE = CAVE_CFG.earth.shade
const SHADE_AMOUNT = 0.35
const SEED = 7300
//
// Growing out of the soil: the edge's slope is read SLOPE_SPAN px (or the
// foot's half width, if wider) either side of the foot; a plant leans at
// most TILT_MAX rad off its upright; it is cut CLIP_DROP px past the edge;
// the edge may fall away under its foot by at most DIP_SHARE of its
// height. A foot is the art's last (first, hanging) FOOT_ROWS of its
// height; a pixel counts as part of a piece from BASE_ALPHA alpha.
//
const SLOPE_SPAN = 14
const TILT_MAX = 0.5
const CLIP_DROP = 1
const DIP_SHARE = 0.3
const FOOT_ROWS = 0.06
const BASE_ALPHA = 128
//
// How far a plant sinks into what it grows from: standing UP_SINK px, a
// hanging plant HANG_SINK, a root ROOT_SINK px and ROOT_SINK_SHARE of its
// height more (the thin tip its strands come together at goes in), a side
// plant SIDE_SINK, a top's plant turned on a wall WALL_UP_SINK.
//
const UP_SINK = 3
const HANG_SINK = 10
const ROOT_SINK = 12
const ROOT_SINK_SHARE = 0.06
const SIDE_SINK = 10
const WALL_UP_SINK = 6
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
const HANG_LEDGE = { prefixes: ['hang', 'hangB'], hMin: 55, hRange: 35, weight: 1 }
const HANG_CEILING = { prefixes: ['hang', 'hangB'], hMin: 45, hRange: 25, weight: 1 }
const SIDE = { prefixes: ['side', 'sideB'], hMin: 45, hRange: 20, weight: 1 }
const FLOAT_KINDS = [
  { prefixes: ['sprout', 'sproutB'], hMin: 16, hRange: 8, weight: 1 },
  { prefixes: ['tiny', 'tinyB'], hMin: 12, hRange: 6, weight: 1 }
]
const ROOT_PREFIX = 'root'
const ROOT_H = 45
const ROOT_H_RANGE = 60
//
// The greenery kit (small_plants.png), drawn at its pieces' own sizes
// (KIT_SCALE world px per sheet px, the tiny sprouts SPROUT_SCALE so they
// are seen, the moss MOSS_SCALE so it does not cover the plants, give or
// take KIT_SIZE_JITTER, at least KIT_MIN_H tall), strewn as thick as a
// top's density says (KIT_GROUND; KIT_FLOAT on a small floating platform,
// far sparser): a patch every gap..+gapRange px along it — a moss cushion
// first (`moss` of them) near its middle, then leavesMin..+leavesRange
// leafy plants within KIT_SPREAD px of it (so they stand over the moss),
// `sprouts` sprouts at most round it (within SPROUT_SPREAD px); between
// the patches the tiniest sprouts strewn on their own about every
// sproutGap..+sproutGapRange px (none if sproutGap is 0); small sparse
// islands — ISLE_MIN..+RANGE plants within ISLE_SPREAD px — about every
// ISLE_GAP..+RANGE px (where `isles`); and lone plants, evenly at random
// every loneGap..+loneGapRange px (LONE_LEAF_SHARE of the islands' and
// lone ones leafy, the rest sprouts), so no stretch of a top is bare. Each
// where it can grow (moved on past a stone, else left out; the spots kept
// clear keep only their kitR clear of it). FRONT_SHARE of the kit's
// pieces on the tops grow in front of the hero (cave-front.js paints
// them), the rest behind him. Under the ledges and the ceiling VINE_CHANCE
// of the hanging plants are the kit's vines, at VINE_SCALE of their size.
//
const KIT_MOSS = 'kitMoss'
const KIT_LEAF = 'kitLeaf'
const KIT_SPROUT = 'kitSprout'
const KIT_VINE = 'kitVine'
const KIT_SCALE = 0.36
const SPROUT_SCALE = 0.48
const MOSS_SCALE = 0.24
const KIT_SIZE_JITTER = 0.15
const KIT_MIN_H = 6
const KIT_GROUND = { gap: 26, gapRange: 38, moss: 0.65, leavesMin: 1, leavesRange: 2, sprouts: 4, sproutGap: 14, sproutGapRange: 20, isles: true, loneGap: 24, loneGapRange: 46 }
const KIT_FLOAT = { gap: 50, gapRange: 70, moss: 0.15, leavesMin: 0, leavesRange: 1, sprouts: 2, sproutGap: 0, sproutGapRange: 0, isles: false, loneGap: 40, loneGapRange: 60 }
const KIT_SPREAD = 26
const SPROUT_SPREAD = 42
const MOSS_SPREAD = 0.5
const ISLE_GAP = 70
const ISLE_GAP_RANGE = 90
const ISLE_MIN = 2
const ISLE_RANGE = 1
const ISLE_SPREAD = 14
const LONE_LEAF_SHARE = 0.5
const FRONT_SHARE = 0.7
const KIT_SCALES = { [KIT_SPROUT]: SPROUT_SCALE, [KIT_MOSS]: MOSS_SCALE }
const VINE_CHANCE = 0.4
const VINE_SCALE = 0.45
const BYTE_ALPHA = 3
const RGBA = 4
//
// Spacing along a top / an underside / a wall (HANG_LEDGE_GAP: under a
// ledge, denser than under the ceiling; WALL_UP_GAP: the tops' plants
// turned on a wall): the least gap and its spread; how far from a free end
// or a wall it keeps. Under a ledge a kit's vine hangs LEDGE_VINE_CHANCE
// of the times (else one of the sheets' hanging plants, their 4th row).
//
const UP_GAP = 32
const HANG_GAP = 100
const HANG_LEDGE_GAP = 40
const LEDGE_VINE_CHANCE = 0.15
const SIDE_GAP = 110
const WALL_UP_GAP = 55
const GAP_RANGE = 60
const STONE_CLEAR = 6
const END_CLEAR = 30
const WALL_CLEAR = 20
//
// Roots hang about every ROOT_GAP..+ROOT_GAP_RANGE px under the ledges and
// the ceiling, never over one another nor over a hanging plant (ROOT_CLEAR
// px beside it at least: a root that would overlap one moves on past it).
//
const ROOT_GAP = 70
const ROOT_GAP_RANGE = 90
const ROOT_CLEAR = 6
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
// The soil is read every STEP px. A plant (a root) moved on past a stone
// (a hanging plant) goes STEP px further than just clear of it: its new
// box edge, worked out in floats, could land a hair short of the line and
// find the same stone again forever.
//
const STEP = 2
//
// A free end gets a side plant at its middle this often; an end face at
// least TALL_FACE px tall is grown over like a wall, END_FACE_CLEAR px
// clear of its top and bottom. The roots' hole (ENTRY_*) and the right
// bank's drop to the water (BANK_*) are grown over too (placeInEntry,
// placeOnBank).
//
const END_SIDE_CHANCE = 0.7
const TALL_FACE = 160
const END_FACE_CLEAR = 30
const ENTRY_TOP = 30
const ENTRY_SHRINK = 0.7
const BANK_REACH = 70
const BANK_FACE_CLEAR = 12
const BANK_SHRINK = 0.75
const BANK_FIND_STEPS = 12
//
// Plants keep this far from the lake's ends (and its surface's height);
// its bowl reaches LAKE_DEPTH px under its surface. A small platform at
// least FLOAT_PLANT_MIN_W wide gets a plant this often, off its middle by
// up to FLOAT_PLANT_SPREAD of its width; the kit's patches keep their
// middle FLOAT_KIT_CLEAR px off its ends.
//
const LAKE_CLEAR = 20
const LAKE_DEPTH = 300
const FLOAT_PLANT_MIN_W = 60
const FLOAT_PLANT_CHANCE = 0.75
const FLOAT_PLANT_SPREAD = 0.3
const FLOAT_KIT_CLEAR = 8
//
// A wall's face is open between the ceiling (WALL_CEIL_CLEAR under it)
// and the platforms running into it (kept WALL_PLATFORM_CLEAR clear).
//
const WALL_CEIL_CLEAR = 60
const WALL_PLATFORM_CLEAR = 40
//
// Spots kept clear, each on what it is on (a platform's id, or CEILING):
// x and half width round it — the stalk-eye on the passage's floor, the
// lantern on the hall's, the roots' hole (the ceiling over it and the
// ledge the hero lands on) — and the narrower half width the greenery
// kit's small plants keep (kitR: they may grow round the lantern's foot
// and where the hero lands).
//
const CEILING = 'ceiling'
const CLEAR = [
  { x: Layout.STALK_EYE.x, r: 110, kitR: 40, on: [Layout.STALK_EYE.on] },
  { x: Layout.LANTERN.x, r: 70, kitR: 45, on: [Layout.LANTERN.on] },
  { x: Layout.ENTRY_X, r: Layout.ENTRY_HALF_W + 50, kitR: 0, on: [CEILING, Layout.START_PLATFORM] }
]
let plants = null
const feet = new Map()

/**
 * Paints the plants behind the hero that reach into a world rect (placed
 * once per page).
 * @param {CanvasRenderingContext2D} ctx - World-translated context
 * @param {{x1: number, y1: number, x2: number, y2: number}} rect - World rect to cover
 */
export function paint(ctx, rect) {
  plants ??= place()
  plants.forEach(pl => !pl.front && overlaps(pl.box, rect) && paintPlant(ctx, pl))
}

/**
 * The plants that grow in front of the hero (cave-front.js bakes them).
 * @returns {Array<{box: {x1: number, y1: number, x2: number, y2: number}}>} Plants, each with its world box
 */
export function frontPlants() {
  plants ??= place()
  return plants.filter(pl => pl.front)
}

/**
 * Paints one plant at its world place (cut off along the soil it grows
 * from).
 * @param {CanvasRenderingContext2D} ctx - World-translated context
 * @param {Object} pl - A plant (from frontPlants)
 */
export function paintPlant(ctx, pl) {
  clipTo(ctx, pl.clip)
  Atlas.drawPiece(ctx, pl.name, pl.x, pl.y, pl.h, { flip: pl.flip, hang: pl.hang, angle: pl.angle, pivot: pl.pivot, shade: SHADE, shadeAmount: SHADE_AMOUNT })
  ctx.restore()
}
function overlaps(box, rect) {
  return box.x2 >= rect.x1 && box.x1 <= rect.x2 && box.y2 >= rect.y1 && box.y1 <= rect.y2
}
//
// Only what is inside the outline is painted (until ctx.restore()).
//
function clipTo(ctx, pts) {
  ctx.save()
  ctx.beginPath()
  pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))
  ctx.closePath()
  ctx.clip()
}
//
// Every plant: up on the tops (the kit's patches behind the bigger ones),
// hanging under the ledges and the ceiling, sideways on the walls and the
// ledges' free ends. The hanging ones are placed first so the roots can
// keep clear of them; the roots come first in the list (painted behind
// everything).
//
function place() {
  const rng = createSeededRandom(SEED)
  const hangs = []
  Layout.PLATFORMS.filter(p => p.kind === Layout.PLATFORM_KIND.LEDGE).forEach(p => placeUnder(rng, hangs, p))
  placeUnderCeiling(rng, hangs)
  const out = []
  Layout.PLATFORMS.filter(p => p.kind === Layout.PLATFORM_KIND.LEDGE).forEach(p => placeRoots(rng, out, hangs, { ...runOf(p), on: p.id }, x => Platform.undersideAt(p, x)))
  placeRoots(rng, out, hangs, { from: Layout.WALL_COLLIDE_W + WALL_CLEAR, to: Layout.WORLD_W - Layout.WALL_COLLIDE_W - WALL_CLEAR, on: CEILING }, Layout.ceilingBottomAt)
  Layout.PLATFORMS.forEach(p => placeKit(rng, out, p))
  Layout.PLATFORMS.filter(p => p.kind !== Layout.PLATFORM_KIND.FLOAT).forEach(p => placeOnTop(rng, out, p))
  hangs.forEach(pl => out.push(pl))
  placeOnWall(rng, out, -1)
  placeOnWall(rng, out, 1)
  placeInEntry(rng, out)
  placeOnBank(rng, out)
  Layout.PLATFORMS.filter(p => p.kind === Layout.PLATFORM_KIND.FLOAT && p.w >= FLOAT_PLANT_MIN_W).forEach(p => placeOnFloat(rng, out, p))
  return out
}
function placeOnFloat(rng, out, p) {
  if (rng() > FLOAT_PLANT_CHANCE) return
  const x = p.x + (rng() * 2 - 1) * p.w * FLOAT_PLANT_SPREAD
  const kind = pickKind(rng, FLOAT_KINDS)
  const plant = standing(pickName(rng, kind), x, kind.hMin + rng() * kind.hRange, rng() < HALF, topOf(p))
  plant.fits && out.push(plant)
}
function placeOnTop(rng, out, p) {
  const { from, to } = runOf(p)
  const stones = Platform.stoneSpansOn(p)
  const ground = topOf(p)
  for (let x = from + rng() * UP_GAP; x < to; x += nextGap(rng, UP_GAP, GAP_RANGE)) {
    const kind = pickKind(rng, UP_KINDS)
    const name = pickName(rng, kind)
    const h = kind.hMin + rng() * kind.hRange
    const flip = rng() < HALF
    let plant = standing(name, x, h, flip, ground)
    for (let stone = onStone(plant, stones); stone; stone = onStone(plant, stones)) {
      x = stone.x2 + STONE_CLEAR + (x - plant.box.x1) + STEP
      plant = standing(name, x, h, flip, ground)
    }
    x < to && plant.fits && isClear(x, p.id) && !inLake(x, ground(x)) && out.push(plant)
  }
}
//
// The kit's patches along a platform's top: a moss cushion, leafy plants
// over it, sprouts round them; sprouts strewn between them, small sparse
// islands and lone plants
// — each one only where it can grow (on the soil, off the big stones —
// over the small ones baked into the top it grows on as on the soil —, the
// lake and the spots kept clear).
//
function placeKit(rng, out, p) {
  const float = p.kind === Layout.PLATFORM_KIND.FLOAT
  const run = runOf(p)
  const from = float ? p.x1 + FLOAT_KIT_CLEAR : run.from
  const to = float ? p.x2 - FLOAT_KIT_CLEAR : run.to
  const top = { from, to, on: p.id, stones: bigStonesOn(p), ground: topOf(p) }
  const d = float ? KIT_FLOAT : KIT_GROUND
  for (let x = from + rng() * d.gap; x < to; x += nextGap(rng, d.gap, d.gapRange)) {
    rng() < d.moss && growKit(rng, out, KIT_MOSS, x + (rng() * 2 - 1) * KIT_SPREAD * MOSS_SPREAD, top)
    const leaves = d.leavesMin + Math.floor(rng() * (d.leavesRange + 1))
    for (let i = 0; i < leaves; i++) growKit(rng, out, KIT_LEAF, x + (rng() * 2 - 1) * KIT_SPREAD, top)
    const sprouts = Math.floor(rng() * (d.sprouts + 1))
    for (let i = 0; i < sprouts; i++) growKit(rng, out, KIT_SPROUT, x + (rng() * 2 - 1) * SPROUT_SPREAD, top)
  }
  d.sproutGap && strewSprouts(rng, out, top, d)
  d.isles && strewIsles(rng, out, top)
  for (let x = from + rng() * d.loneGap; x < to; x += d.loneGap + rng() * d.loneGapRange) growKit(rng, out, strayKind(rng), x, top)
}
//
// The tiniest sprouts strewn on their own along a top.
//
function strewSprouts(rng, out, top, d) {
  for (let x = top.from + rng() * d.sproutGap; x < top.to; x += nextGap(rng, d.sproutGap, d.sproutGapRange)) growKit(rng, out, KIT_SPROUT, x, top)
}
//
// Small sparse islands along a top.
//
function strewIsles(rng, out, top) {
  for (let x = top.from + rng() * ISLE_GAP; x < top.to; x += nextGap(rng, ISLE_GAP, ISLE_GAP_RANGE)) {
    const count = ISLE_MIN + Math.floor(rng() * (ISLE_RANGE + 1))
    for (let i = 0; i < count; i++) growKit(rng, out, strayKind(rng), x + (rng() * 2 - 1) * ISLE_SPREAD, top)
  }
}
//
// A lone plant's or a sparse island's kind: leafy or a sprout.
//
function strayKind(rng) {
  return rng() < LONE_LEAF_SHARE ? KIT_LEAF : KIT_SPROUT
}
//
// One of the kit's pieces of a kind at x on a top ({from, to, on, stones,
// ground}) — moved on past a stone it would stand on, by up to KIT_SPREAD
// px more (so the ones that met the same stone do not pile up past it) —
// if it can grow there.
//
function growKit(rng, out, prefix, x, top) {
  const names = Atlas.pieceNames(prefix)
  const name = names[Math.floor(rng() * names.length)]
  const h = kitHeight(rng, name, KIT_SCALES[prefix] ?? KIT_SCALE)
  const flip = rng() < HALF
  let plant = standing(name, x, h, flip, top.ground)
  for (let stone = onStone(plant, top.stones); stone; stone = onStone(plant, top.stones)) {
    x = stone.x2 + STONE_CLEAR + (x - plant.box.x1) + STEP + rng() * KIT_SPREAD
    plant = standing(name, x, h, flip, top.ground)
  }
  plant.front = rng() < FRONT_SHARE
  const ok = x >= top.from && x <= top.to && plant.fits && isClear(x, top.on, true) && !inLake(x, top.ground(x))
  ok && out.push(plant)
}
function kitHeight(rng, name, scale) {
  return Math.max(KIT_MIN_H, Atlas.piece(name).height * scale * (1 + (rng() * 2 - 1) * KIT_SIZE_JITTER))
}
//
// A platform's big stones (the ones in front of the hero) as spans along
// its top.
//
function bigStonesOn(p) {
  return Platform.frontStones().filter(stone => stone.p === p).map(stone => ({ x1: stone.x - Atlas.widthAt(stone.name, stone.h) / 2, x2: stone.x + Atlas.widthAt(stone.name, stone.h) / 2 }))
}
//
// The stone (with its joints) a plant would stand on, if any.
//
function onStone(plant, stones) {
  return stones.find(s => plant.box.x2 > s.x1 - STONE_CLEAR && plant.box.x1 < s.x2 + STONE_CLEAR)
}
function placeUnder(rng, out, p) {
  const { from, to } = runOf(p)
  const under = x => Platform.undersideAt(p, x)
  for (let x = from + rng() * HANG_LEDGE_GAP; x < to; x += nextGap(rng, HANG_LEDGE_GAP, GAP_RANGE)) {
    const plant = hangingPlant(rng, HANG_LEDGE, x, under, LEDGE_VINE_CHANCE)
    isClear(x, p.id) && plant.fits && out.push(plant)
  }
  placeOnEnd(rng, out, p, -1)
  placeOnEnd(rng, out, p, 1)
}
//
// A ledge's free end (side -1: the left one): a short face gets a side
// plant at its middle now and then; a face at least TALL_FACE px tall is
// grown over like a wall, END_FACE_CLEAR px clear of its top and bottom.
//
function placeOnEnd(rng, out, p, side) {
  const face = Platform.endFace(p, side)
  if (!face) return
  if (face.y2 - face.y1 < TALL_FACE) {
    const mid = (face.y1 + face.y2) * HALF
    rng() < END_SIDE_CHANCE && out.push(sideways(rng, face.at(mid), mid, side, face.at))
    return
  }
  placeAlong(rng, out, { at: face.at, out: side, y1: face.y1 + END_FACE_CLEAR, y2: face.y2 - END_FACE_CLEAR })
}
function placeUnderCeiling(rng, out) {
  for (let x = Layout.WALL_COLLIDE_W + WALL_CLEAR + rng() * HANG_GAP; x < Layout.WORLD_W - Layout.WALL_COLLIDE_W - WALL_CLEAR; x += nextGap(rng, HANG_GAP, GAP_RANGE)) {
    const plant = hangingPlant(rng, HANG_CEILING, x, Layout.ceilingBottomAt)
    isClear(x, CEILING) && plant.fits && out.push(plant)
  }
}
//
// A plant hanging from what is over x: one of the kind's (its height
// picked), or now and then one of the kit's vines (at its own size).
//
function hangingPlant(rng, kind, x, ceilingAt, vineChance = VINE_CHANCE) {
  const flip = rng() < HALF
  if (rng() < vineChance) {
    const names = Atlas.pieceNames(KIT_VINE)
    const name = names[Math.floor(rng() * names.length)]
    return hanging(name, x, kitHeight(rng, name, VINE_SCALE), flip, ceilingAt, HANG_SINK)
  }
  return hanging(pickName(rng, kind), x, kind.hMin + rng() * kind.hRange, flip, ceilingAt, HANG_SINK)
}
//
// Roots along a run ({from, to, on}) under what they hang from: none over
// another one or over a hanging plant (moved on past it).
//
function placeRoots(rng, out, hangs, run, ceilingAt) {
  const names = Atlas.pieceNames(ROOT_PREFIX)
  let right = -Infinity
  for (let x = run.from + rng() * ROOT_GAP; x < run.to; x += nextGap(rng, ROOT_GAP, ROOT_GAP_RANGE)) {
    const name = names[Math.floor(rng() * names.length)]
    const h = ROOT_H + rng() * ROOT_H_RANGE
    const flip = rng() < HALF
    const sink = ROOT_SINK + h * ROOT_SINK_SHARE
    x = Math.max(x, right + ROOT_CLEAR + Atlas.widthAt(name, h) / 2)
    let root = x < run.to ? hanging(name, x, h, flip, ceilingAt, sink) : null
    for (let hang = root && overHang(root, hangs); hang; hang = root && overHang(root, hangs)) {
      x = Math.max(x + STEP, hang.box.x2 + ROOT_CLEAR * 2 + x - root.box.x1)
      root = x < run.to ? hanging(name, x, h, flip, ceilingAt, sink) : null
    }
    if (!root || !root.fits || !isClear(x, run.on)) continue
    right = root.box.x2
    out.push(root)
  }
}
//
// The hanging plant a root would cover (or hang behind), if any.
//
function overHang(root, hangs) {
  return hangs.find(pl => pl.box.x2 > root.box.x1 - ROOT_CLEAR && pl.box.x1 < root.box.x2 + ROOT_CLEAR && pl.box.y2 > root.box.y1 && pl.box.y1 < root.box.y2)
}
//
// A plant standing with its foot at x on the ground under it (`groundAt`:
// the soil's top edge at an X), square to that edge, sunk UP_SINK px into
// it (and as much deeper as the edge falls away under its foot), cut off
// along the edge.
//
function standing(name, x, h, flip, groundAt) {
  return rooted(name, x, h, flip, { lineAt: groundAt, up: true, sink: UP_SINK })
}
//
// A plant (a root) hanging with its foot at x from what is over it
// (`ceilingAt`: the soil's lower edge at an X), square to that edge, sunk
// `sink` px into it, cut off along the edge.
//
function hanging(name, x, h, flip, ceilingAt, sink) {
  return rooted(name, x, h, flip, { lineAt: ceilingAt, up: false, sink })
}
//
// A plant growing out of a soil edge at x (`edge.lineAt`, the edge's Y at
// an X; `edge.up`: it grows up off a top, else hangs down off an
// underside): its foot (the middle of its art's first or last rows) at
// the edge, the plant turned square to the edge about the foot (the edge
// sloping down to the right turns it clockwise), `edge.sink` px into the
// soil — and deeper by as far as the edge falls away from its line under
// the foot, so no part of the foot is in the air; `fits` unless that
// would bury too much of it or the edge is too steep. Cut off along the
// edge: its outline runs along the edge over its width (CLIP_DROP px on
// the open side) and round its far side.
//
function rooted(name, x, h, flip, edge) {
  const w = Atlas.widthAt(name, h)
  const foot = footOf(name, edge.up)
  const span = Math.max(SLOPE_SPAN, foot.w * w * HALF)
  const slope = (edge.lineAt(x + span) - edge.lineAt(x - span)) / (2 * span)
  const angle = Math.max(-TILT_MAX, Math.min(TILT_MAX, Math.atan(slope)))
  const away = edge.up ? 1 : -1
  let gap = 0
  for (let dx = -foot.w * w * HALF; dx <= foot.w * w * HALF; dx += STEP) gap = Math.max(gap, (edge.lineAt(x + dx) - edge.lineAt(x) - slope * dx) * away)
  const sink = edge.sink + gap
  const fits = gap <= h * DIP_SHARE && Math.abs(Math.atan(slope)) <= TILT_MAX
  const pivot = (edge.up ? foot.at * h - sink : foot.at * h + sink) / h
  const off = (foot.cx - HALF) * w * (flip ? -1 : 1)
  const cx = x - off * Math.cos(angle)
  const py = edge.lineAt(x) - off * Math.sin(angle)
  const top = py - pivot * h
  const box = turnedBox(cx, py, w, h, pivot * h, angle)
  const clip = [{ x: box.x1, y: edge.up ? box.y1 : box.y2 }]
  for (let ex = box.x1; ex < box.x2 + STEP; ex += STEP) clip.push({ x: ex, y: edge.lineAt(ex) + CLIP_DROP * away })
  clip.push({ x: box.x2 + STEP, y: edge.up ? box.y1 : box.y2 })
  return { name, x: cx, y: edge.up ? top + h : top, h, flip, hang: !edge.up, angle, pivot, box, clip, fits }
}
//
// The box round a piece w × h turned by `angle` about a point `pivot` px
// down its middle line, that point at (px, py).
//
function turnedBox(px, py, w, h, pivot, angle) {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  const xs = []
  const ys = []
  for (const lx of [-w / 2, w / 2]) {
    for (const ly of [-pivot, h - pivot]) {
      xs.push(px + lx * c - ly * s)
      ys.push(py + lx * s + ly * c)
    }
  }
  return { x1: Math.min(...xs), y1: Math.min(...ys), x2: Math.max(...xs), y2: Math.max(...ys) }
}
//
// A piece's foot: the middle and width of its last (`up`) or first rows
// (shares of its width) and the share of its height down to that end;
// read once.
//
function footOf(name, up) {
  const key = `${name}:${up}`
  if (feet.has(key)) return feet.get(key)
  const src = Atlas.piece(name)
  const data = src.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, src.width, src.height).data
  const rows = Math.max(1, Math.round(src.height * FOOT_ROWS))
  let end = up ? src.height - 1 : 0
  while (end > 0 && end < src.height - 1 && !rowHas(data, src.width, end)) end += up ? -1 : 1
  let x1 = src.width
  let x2 = 0
  for (let i = 0; i < rows; i++) {
    const y = up ? end - i : end + i
    if (y < 0 || y >= src.height) break
    for (let x = 0; x < src.width; x++) {
      if (data[(y * src.width + x) * RGBA + BYTE_ALPHA] < BASE_ALPHA) continue
      x1 = Math.min(x1, x)
      x2 = Math.max(x2, x)
    }
  }
  const at = (up ? end + 1 : end) / src.height
  const foot = x2 >= x1 ? { at, w: (x2 - x1 + 1) / src.width, cx: (x1 + x2 + 1) * HALF / src.width } : { at, w: 1, cx: HALF }
  feet.set(key, foot)
  return foot
}
function rowHas(data, w, y) {
  for (let x = 0; x < w; x++) if (data[(y * w + x) * RGBA + BYTE_ALPHA] >= BASE_ALPHA) return true
  return false
}
//
// Plants up an open stretch of a wall's face (dir -1: the left wall, its
// face looking right): the side plants, and between them the tops' own
// plants turned to grow out of the face.
//
function placeOnWall(rng, out, dir) {
  const at = y => dir < 0 ? Layout.leftWallX(y) : Layout.rightWallX(y)
  wallOpenings(dir).forEach(open => placeAlong(rng, out, { at, out: -dir, y1: open.y1, y2: open.y2 }))
}
//
// Both sides of the roots' hole the hero drops in through, from ENTRY_TOP
// down to END_FACE_CLEAR px over where the ceiling's underside meets them;
// smaller (ENTRY_SHRINK) so the hole stays open.
//
function placeInEntry(rng, out) {
  ;[-1, 1].forEach(side => {
    const at = y => Layout.entrySideX(y, side)
    const lip = Layout.ceilingBottomAt(Layout.ENTRY_X + side * Layout.ENTRY_HALF_W)
    placeAlong(rng, out, { at, out: -side, y1: ENTRY_TOP, y2: lip - END_FACE_CLEAR, shrink: ENTRY_SHRINK })
  })
}
//
// The right bank's steep drop to the water: from BANK_FACE_CLEAR px under
// the bank's top down to LAKE_CLEAR px over the water; smaller
// (BANK_SHRINK). Its face is found on the bank's soil (BANK_FIND_STEPS
// halvings between the water's end and BANK_REACH px past it).
//
function placeOnBank(rng, out) {
  const p = Layout.lakeFloor()
  const x1 = Layout.LAKE_X2 - BANK_REACH
  const x2 = Layout.LAKE_X2 + BANK_REACH
  const at = y => bankFaceAt(p, x1, x2, y)
  placeAlong(rng, out, { at, out: -1, y1: Platform.surfaceAt(p, x2) + BANK_FACE_CLEAR, y2: Layout.LAKE_SURFACE_Y - LAKE_CLEAR, shrink: BANK_SHRINK })
}
function bankFaceAt(p, x1, x2, y) {
  let a = x1
  let b = x2
  for (let i = 0; i < BANK_FIND_STEPS; i++) {
    const m = (a + b) * HALF
    Platform.surfaceAt(p, m) > y ? (a = m) : (b = m)
  }
  return (a + b) * HALF
}
//
// Plants up a stretch of a face ({at: its X at a Y, out: the way it looks,
// y1..y2, shrink}): the side plants, and between them the tops' own
// plants turned to grow out of the face.
//
function placeAlong(rng, out, face) {
  const shrink = face.shrink ?? 1
  for (let y = face.y1 + rng() * SIDE_GAP; y < face.y2; y += nextGap(rng, SIDE_GAP, GAP_RANGE)) out.push(sideways(rng, face.at(y), y, face.out, face.at, shrink))
  for (let y = face.y1 + rng() * WALL_UP_GAP; y < face.y2; y += nextGap(rng, WALL_UP_GAP, GAP_RANGE)) out.push(turnedUp(rng, face.at(y), y, face.out, face.at, shrink))
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
// A side plant rooted in a face at (x, y) (`faceAt`: the face's X at a Y),
// growing out toward `out` (1: right, as on its sheet; -1: left,
// mirrored), turned square to the face there (about its middle, set off
// the root), SIDE_SINK px into it and cut off along it.
//
function sideways(rng, x, y, out, faceAt, shrink = 1) {
  const name = pickName(rng, SIDE)
  const h = (SIDE.hMin + rng() * SIDE.hRange) * shrink
  const w = Atlas.widthAt(name, h)
  const lean = (faceAt(y + SLOPE_SPAN) - faceAt(y - SLOPE_SPAN)) / (2 * SLOPE_SPAN)
  const angle = Math.max(-TILT_MAX, Math.min(TILT_MAX, Math.atan(-lean)))
  const reach = out * (w / 2 - SIDE_SINK)
  const cx = x + reach * Math.cos(angle)
  const cy = y + reach * Math.sin(angle)
  const box = turnedBox(cx, cy, w, h, h * HALF, angle)
  return { name, x: cx, y: cy + h * HALF, h, flip: out < 0, hang: false, angle, pivot: HALF, box, clip: faceClip(box, out, faceAt) }
}
//
// A plant of the tops (UP_KINDS) rooted in a wall's face at (x, y), turned
// a quarter round to grow out toward `out` (1: right) square to the face
// there, its foot WALL_UP_SINK px into it, cut off along it.
//
function turnedUp(rng, x, y, out, faceAt, shrink = 1) {
  const kind = pickKind(rng, UP_KINDS)
  const name = pickName(rng, kind)
  const h = (kind.hMin + rng() * kind.hRange) * shrink
  const flip = rng() < HALF
  const w = Atlas.widthAt(name, h)
  const foot = footOf(name, true)
  const lean = (faceAt(y + SLOPE_SPAN) - faceAt(y - SLOPE_SPAN)) / (2 * SLOPE_SPAN)
  const angle = out * Math.PI * HALF + Math.max(-TILT_MAX, Math.min(TILT_MAX, Math.atan(-lean)))
  const pivot = (foot.at * h - WALL_UP_SINK) / h
  const off = (foot.cx - HALF) * w * (flip ? -1 : 1)
  const px = x - off * Math.cos(angle)
  const py = y - off * Math.sin(angle)
  const box = turnedBox(px, py, w, h, pivot * h, angle)
  return { name, x: px, y: py - pivot * h + h, h, flip, hang: false, angle, pivot, box, clip: faceClip(box, out, faceAt) }
}
//
// The outline a plant growing out of a face is cut off along: the face
// over the plant's box (CLIP_DROP px out of it), round the box's far side.
//
function faceClip(box, out, faceAt) {
  const far = out > 0 ? box.x2 : box.x1
  const clip = [{ x: far, y: box.y1 }]
  for (let ey = box.y1; ey < box.y2 + STEP; ey += STEP) clip.push({ x: faceAt(ey) + CLIP_DROP * out, y: ey })
  clip.push({ x: far, y: box.y2 + STEP })
  return clip
}
//
// The soil's top edge of a platform at an X (read off its painted soil).
//
function topOf(p) {
  return x => Platform.surfaceAt(p, x)
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
function isClear(x, on, kit = false) {
  return CLEAR.every(c => !c.on.includes(on) || Math.abs(x - c.x) > (kit ? c.kitR : c.r))
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
