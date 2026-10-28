import { CFG } from '../../../cfg.js'
import { applyForestFilmGrainToCanvas } from '../../forest/utils/forest-parallax-grain.js'
import { createSeededRandom } from '../../../utils/seeded-random.js'
import * as Layout from '../utils/cave-layout.js'
import { CAVE_PAL, css, paintMossStrand } from '../utils/cave-paint.js'
import * as Mouth from './leaf-mouth.js'
//
// Leaves of the monster plant: one wide fleshy pad each, which the hero can
// stand on, with big rounded lobes whose ends and a few folds bend down over
// the sides. A trap leaf carries a red mouth
// (leaf-mouth.js) in the middle of its pad. Landing on an open mouth snaps
// it shut and the hero is eaten; it can also be fed the spore swarm,
// staying shut (a low bud, a safe step) for a while before it swells,
// opens again and lets the spores go.
//
const SPRITE_PREFIX = 'cave0-leaf-v9'
const GRAIN_SEED_BASE = 9900
const GRAIN_HANG_SEED = 50
const BAKE_PAD = 6
//
// Side room in the bake for the rim's lobes reaching past the leaf ends.
//
const SIDE_ROOM = 0.16
//
// Leaf in depth (the reference's fleshy pads): a flat top the hero walks
// on, a slightly raised near lip, the very ends hanging down, and the rim
// ruffling in little waves. The bake is split along the line the hero
// stands on: what lies below it (and below the near rim, where a lobe of
// the rim curls up) is drawn in front of the hero, the rest behind him —
// his feet stay on the surface, a raised lobe covers part of him.
//
const LEAF_DEPTH_SHARE = 0.22
const LEAF_DEPTH_MIN = 26
const LEAF_DEPTH_MAX = 60
const FRONT_LIFT = 0.2
const LIFT_POW = 1.6
const SIDE_DROOP = 0.8
const SIDE_DROOP_POW = 10
const LOBE_AMP = 0.07
const LOBE_F = 5
//
// Lobes of the rim bending away from the flat top, different on every
// leaf: 1–3 raised lobes somewhere along the front curl up in front of the
// hero (each its own height and width), 1–3 folds near the ends hang down
// over the edge. The underside follows them down, so a raised lobe shows
// its outer side.
//
const RAISES_MAX = 3
const RAISE_FROM = 0.45
const RAISE_SPAN = Math.PI - RAISE_FROM * 2
const RAISE_MIN = 8
const RAISE_RANGE = 18
const RAISE_W_MIN = 0.1
const RAISE_W_RANGE = 0.2
const FOLDS_MAX = 3
const FOLD_SPREAD = 0.5
const FOLD_MIN = 6
const FOLD_RANGE = 10
const FOLD_W_MIN = 0.15
const FOLD_W_RANGE = 0.15
const FOLD_SAG = FOLD_MIN + FOLD_RANGE
const RUFFLE_AMP = 2.2
const RUFFLE_F = 9
const SCALLOP_AMP = 0.025
const SCALLOP_F = 26
const LEAF_WOBBLE_F1 = 5
const LEAF_WOBBLE_1 = 0.035
const LEAF_WOBBLE_F2 = 13
const LEAF_WOBBLE_2 = 0.018
const LEAF_RING_STEPS = 128
const LEAF_FRONT_STEPS = 64
const LEAF_CONTOUR_W = 1.8
//
// Underside seen below the raised lip: thick in the middle, thin at the
// ends, soft folds on its lower edge, fractal ribs fanning from a point
// below the leaf (drawn like the top veins, RIB_ALPHA times stronger, fewer
// fork levels), darker toward the bottom, lit just under the lip.
//
const LEAF_THICK = 20
const LEAF_THICK_EDGE = 0.3
const LEAF_FOLD_F = 11
const LEAF_FOLD_AMP = 2.5
const RIB_EVERY = 3
const RIB_CONVERGE = 0.55
const RIB_DROP = 3
const RIB_W = 1.3
const RIB_ALPHA = 1.6
const RIB_DEPTH = 2
const UNDER_DEEP_ALPHA = 0.7
const UNDER_LIT_W = 2.5
//
// Top face lighting: drooping far part in shade, raised near lip catching
// the light, warm light / highlight / glow to the upper left, a shallow
// hollow, veins from a navel near the middle, speckles.
//
const BACK_SHADE_ALPHA = 0.55
const LIP_LIGHT_W = 7
const LIP_LIGHT_ALPHA = 0.55
const LIP_HIGH_W = 2
const LIP_HIGH_ALPHA = 0.8
const LIP_INSET = 3
const LEAF_SHADE_X = 0.45
const LEAF_SHADE_Y = 0.3
const LEAF_SHADE_R = 0.8
const LEAF_SHADE_ALPHA = 0.45
const LEAF_LIGHT_X = 0.3
const LEAF_LIGHT_Y = 0.25
const LEAF_LIGHT_R = 0.7
const LEAF_LIGHT_ALPHA = 0.85
const LEAF_HIGH_R = 0.38
const LEAF_HIGH_ALPHA = 0.6
const LEAF_GLOW_R = 0.18
const LEAF_GLOW_X = 0.36
const HALF = 0.5
const LEAF_GLOW_ALPHA = 0.4
const LEAF_HOLLOW_SCALE = 0.62
const LEAF_HOLLOW_W = 0.3
const LEAF_HOLLOW_ALPHA = 0.16
const LEAF_HUB_X = 0.04
const LEAF_HUB_Y = 0.05
const NAVEL_R = 3.5
const NAVEL_RIM_W = 1.2
//
// Veins: a few main ones from the navel to the rim, each a wandering line
// (midpoint displacement) that keeps forking into thinner, fainter side
// veins — a soft branching net rather than clean spokes.
//
const LEAF_VEINS = 13
const LEAF_VEIN_JITTER = 0.5
const LEAF_VEIN_W = 1.4
const LEAF_VEIN_DARK_ALPHA = 0.32
const LEAF_VEIN_LIT_ALPHA = 0.22
const VEIN_WANDER = 0.12
const VEIN_SUBDIV = 4
const VEIN_DEPTH = 3
const VEIN_FORKS = 2
const VEIN_FORK_FROM = 0.3
const VEIN_FORK_SPAN = 0.5
const VEIN_FORK_ANGLE = 0.6
const VEIN_FORK_LEN = 0.45
const VEIN_FADE = 0.65
const LEAF_SPECKLES = 180
const LEAF_SPECKLE_ALPHA = 0.3
const LEAF_SPECKLE_R_MIN = 0.5
const LEAF_SPECKLE_R_RANGE = 1
const LEAF_BACK_RIM_W = 1.5
const LEAF_BACK_RIM_ALPHA = 0.5
//
// Slime lobes with drops, and moss strands hanging under the lower edge:
// short ones baked in (one per STRAND_EVERY px), long ones swaying (one
// per SWAY_EVERY px, see plant-strands.js).
//
const LEAF_LOBE_CHANCE = 0.4
const LEAF_LOBE_LEN_MIN = 4
const LEAF_LOBE_LEN_MAX = 18
const LEAF_LOBE_W_MIN = 5
const LEAF_LOBE_W_RANGE = 6
const LEAF_DROP_CHANCE = 0.3
const LEAF_DROP_R = 2
const LEAF_DROP_ALPHA = 0.9
const STRAND_EVERY = 22
const STRAND_LEN_MIN = 12
const STRAND_LEN_RANGE = 90
const STRAND_SHORT_POW = 1.8
const STRAND_EDGE_FROM = 0.06
const STRAND_EDGE_SPAN = 0.88
const STRAND_SINK = 3
const SWAY_EVERY = 55
//
// Room above the pad inside the bake.
//
const TOP_ROOM = 14
//
// Trap mouth: snap / open durations, how long it stays shut after eating
// the hero or catching the spores; before opening it swells (anticipation
// share of the opening time); size and lift on the pad; prey counts as
// near within this box around the leaf.
//
const SNAP_TIME = 0.16
const OPEN_TIME = 0.9
const HERO_HOLD = 2
const SPORE_HOLD = 3
const ANTICIPATE_SHARE = 0.35
const SWELL = 0.08
const MOUTH_R_SHARE = 0.22
const MOUTH_LIFT = 3
const ALERT_PAD_X = 60
const ALERT_ABOVE = 260
//
// Colliders along each leaf top.
//
const COLLIDE_H = 14
const LEAF_STATE = {
  OPEN: 'open',
  CLOSING: 'closing',
  CLOSED: 'closed',
  OPENING: 'opening'
}
const S = LEAF_STATE
const NEXT_STATE = {
  [S.CLOSING]: S.CLOSED,
  [S.CLOSED]: S.OPENING,
  [S.OPENING]: S.OPEN
}
const bakedByK = new WeakMap()

/**
 * Creates the plant's leaves and their colliders.
 * @param {Object} k - Kaplay instance
 * @returns {Object} Plant instance
 */
export function create(k) {
  const sprites = bakeLeaves(k)
  const leaves = Layout.PLANT_LEAVES.map((def, i) => ({
    ...def,
    sprites: sprites[def.id],
    body: addCollider(k, def),
    state: S.OPEN,
    timer: 0,
    prey: null,
    mouth: def.kind === Layout.LEAF_KIND.TRAP ? Mouth.create({
      k,
      x: (def.x1 + def.x2) / 2,
      y: def.y - MOUTH_LIFT,
      r: Math.round((def.x2 - def.x1) * MOUTH_R_SHARE),
      seed: GRAIN_SEED_BASE + i
    }) : null
  }))
  return { k, leaves }
}

/**
 * World points under the leaves where water drips from (ends of the short
 * moss strands and of dripping slime lobes).
 * @param {Object} inst - Plant instance
 * @returns {Array<{x: number, y: number}>}
 */
export function dripTips(inst) {
  return inst.leaves.flatMap(leaf => leaf.sprites.tips.map(t => ({ x: leaf.x1 - leaf.sprites.padX + t.x, y: leaf.y - leaf.sprites.lineY + t.y })))
}

/**
 * Snaps a trap shut on its prey ('hero' or 'spores').
 * @param {Object} inst - Plant instance
 * @param {string} id - Leaf id
 * @param {string} prey - What it caught
 * @returns {boolean} True when the trap was open and snapped
 */
export function snap(inst, id, prey) {
  const leaf = inst.leaves.find(l => l.id === id)
  if (!leaf || leaf.kind !== Layout.LEAF_KIND.TRAP || leaf.state !== S.OPEN) return false
  leaf.state = S.CLOSING
  leaf.timer = 0
  leaf.prey = prey
  return true
}

/**
 * Runs the trap mouths. Returns what happened this frame: a trap the hero is
 * standing on (to be eaten), and traps that just let their spores go.
 * @param {Object} inst - Plant instance
 * @param {Object|null} heroInst - Hero instance
 * @returns {{eatenBy: Object|null, released: Object[]}}
 */
export function onUpdate(inst, heroInst) {
  const dt = inst.k.dt()
  const out = { eatenBy: null, released: [] }
  const char = heroInst?.character
  const standing = char?.exists?.() && char.isGrounded?.() ? char.curPlatform?.() : null
  inst.leaves.forEach(leaf => {
    if (!leaf.mouth) return
    leaf.timer += dt
    if (leaf.state === S.OPEN && standing === leaf.body && snap(inst, leaf.id, 'hero')) out.eatenBy = leaf
    stepTrap(leaf) && out.released.push(leaf)
    Mouth.setState(leaf.mouth, trapOpenness(leaf), trapSwell(leaf), leaf.state === S.OPEN && preyNear(leaf, char))
  })
  return out
}

/**
 * World points under the leaves where long swaying moss strands hang from.
 * @param {Object} inst - Plant instance
 * @returns {Array<{x: number, y: number}>}
 */
export function strandAnchors(inst) {
  return inst.leaves.flatMap(leaf => leaf.sprites.anchors.map(t => ({ x: leaf.x1 - leaf.sprites.padX + t.x, y: leaf.y - leaf.sprites.lineY + t.y })))
}

/**
 * Draws what lies behind the hero: everything hanging under the leaves and
 * the far half of every leaf.
 * @param {Object} inst - Plant instance
 */
export function onDrawBack(inst) {
  const k = inst.k
  inst.leaves.forEach(leaf => {
    const sp = leaf.sprites
    const pos = k.vec2(leaf.x1 - sp.padX, leaf.y - sp.lineY)
    k.drawSprite({ sprite: sp.hang, pos })
    k.drawSprite({ sprite: sp.back, pos })
  })
}

/**
 * Draws what lies in front of the hero: the near half of every leaf (its
 * raised lip and underside), then the trap mouths.
 * @param {Object} inst - Plant instance
 */
export function onDrawFront(inst) {
  const k = inst.k
  inst.leaves.forEach(leaf => {
    const sp = leaf.sprites
    k.drawSprite({ sprite: sp.front, pos: k.vec2(leaf.x1 - sp.padX, leaf.y - sp.lineY) })
    leaf.mouth && Mouth.onDraw(leaf.mouth)
  })
}
//
// Advances a trap's state clock; true when it just opened again after
// holding the spores.
//
function stepTrap(leaf) {
  if (leaf.state === S.OPEN || leaf.timer < stateTime(leaf)) return false
  const spores = leaf.state === S.OPENING && leaf.prey === 'spores'
  leaf.timer = 0
  leaf.state = NEXT_STATE[leaf.state]
  leaf.state === S.OPEN && (leaf.prey = null)
  return spores
}
//
// How long a trap stays in its current (timed) state.
//
function stateTime(leaf) {
  if (leaf.state === S.CLOSING) return SNAP_TIME
  if (leaf.state === S.OPENING) return OPEN_TIME
  return leaf.prey === 'spores' ? SPORE_HOLD : HERO_HOLD
}
//
// Mouth openness by state: snapping shut fast, opening after a swell.
//
function trapOpenness(leaf) {
  if (leaf.state === S.OPEN) return 1
  if (leaf.state === S.CLOSED) return 0
  if (leaf.state === S.CLOSING) return Math.max(0, 1 - leaf.timer / SNAP_TIME)
  const u = leaf.timer / OPEN_TIME
  return Math.max(0, Math.min(1, (u - ANTICIPATE_SHARE) / (1 - ANTICIPATE_SHARE)))
}
//
// The shut bud swells before it opens (anticipation).
//
function trapSwell(leaf) {
  const u = leaf.timer / OPEN_TIME
  return leaf.state === S.OPENING && u < ANTICIPATE_SHARE ? Math.sin(Math.PI * u / ANTICIPATE_SHARE) * SWELL : 0
}
//
// Hero over the leaf and not far above it.
//
function preyNear(leaf, char) {
  if (!char?.exists?.()) return false
  const { x, y } = char.pos
  return x > leaf.x1 - ALERT_PAD_X && x < leaf.x2 + ALERT_PAD_X && y < leaf.y && y > leaf.y - ALERT_ABOVE
}
//
// Static body along the leaf top, trimmed at both ends by collideInset.
//
function addCollider(k, def) {
  const inset = def.collideInset ?? 0
  return k.add([
    k.rect(def.x2 - def.x1 - inset * 2, COLLIDE_H),
    k.pos(def.x1 + inset, def.y),
    k.area(),
    k.body({ isStatic: true }),
    k.opacity(0),
    CFG.game.platformName
  ])
}
//
// Per leaf, once per k: the hanging layer (strands, lobes) and the body split
// at the hero's feet into a far and a near sprite; plus drip tips and
// swaying-strand anchors.
//
function bakeLeaves(k) {
  const cached = bakedByK.get(k)
  if (cached) return cached
  const out = {}
  Layout.PLANT_LEAVES.forEach((def, i) => {
    const len = def.x2 - def.x1
    const ry = Math.max(LEAF_DEPTH_MIN, Math.min(LEAF_DEPTH_MAX, len * LEAF_DEPTH_SHARE)) / 2
    const padX = Math.ceil(len / 2 * SIDE_ROOM) + BAKE_PAD
    const w = Math.ceil(len + padX * 2)
    const lineY = Math.ceil(BAKE_PAD + TOP_ROOM + RUFFLE_AMP + RAISE_MIN + RAISE_RANGE + ry)
    const h = Math.ceil(lineY + ry * (1 + SIDE_DROOP) + FOLD_SAG + LEAF_THICK + LEAF_FOLD_AMP + STRAND_LEN_MIN + STRAND_LEN_RANGE + LEAF_DROP_R * 2 + BAKE_PAD)
    const tones = CAVE_PAL.leaf3d
    const seed = GRAIN_SEED_BASE + i
    const geo = leafGeometry(padX + len / 2, lineY, len / 2, ry, createSeededRandom(seed))
    const rng = createSeededRandom(seed)
    const hang = bakeCanvas(w, h, ctx => paintLeafHang(ctx, geo, tones, rng, len))
    applyForestFilmGrainToCanvas(hang.canvas, seed + GRAIN_HANG_SEED)
    const body = bakeCanvas(w, h, ctx => paintPad(ctx, geo, tones, rng))
    applyForestFilmGrainToCanvas(body.canvas, seed)
    const front = frontMask(geo, w, h)
    const name = `${SPRITE_PREFIX}-${def.id}`
    out[def.id] = {
      w,
      h,
      lineY,
      padX,
      hang: loadCanvas(k, `${name}-hang`, hang.canvas),
      back: loadCanvas(k, `${name}-back`, maskedCopy(body.canvas, front, 'destination-out')),
      front: loadCanvas(k, `${name}-front`, maskedCopy(body.canvas, front, 'destination-in')),
      tips: hang.result.tips,
      anchors: hang.result.anchors
    }
  })
  bakedByK.set(k, out)
  return out
}
function bakeCanvas(w, h, paint) {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  return { canvas, result: paint(canvas.getContext('2d')) }
}
function loadCanvas(k, name, canvas) {
  k.loadSprite(name, canvas)
  return name
}
//
// The part of the bake in front of the hero: everything below the line he
// stands on, and below the near rim where a lobe curls up above that line.
//
function frontMask(geo, w, h) {
  const path = new Path2D()
  path.moveTo(0, geo.cy)
  geo.front.slice().reverse().forEach(p => path.lineTo(p.x, Math.min(geo.cy, p.y)))
  path.lineTo(w, geo.cy)
  path.lineTo(w, h)
  path.lineTo(0, h)
  path.closePath()
  return path
}
//
// A copy of a canvas kept inside ('destination-in') or outside
// ('destination-out') a mask path.
//
function maskedCopy(src, mask, mode) {
  const canvas = document.createElement('canvas')
  canvas.width = src.width
  canvas.height = src.height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(src, 0, 0)
  ctx.globalCompositeOperation = mode
  ctx.fill(mask)
  return canvas
}
//
// Leaf outline in depth: the rim ring, its near half (left end → right end
// along the front) and the underside's lower edge below that.
//
function leafGeometry(cx, cy, rx, ry, rng) {
  const geo = { cx, cy, rx, ry, ph1: rng() * Math.PI * 2, ph2: rng() * Math.PI * 2, ph3: rng() * Math.PI * 2 }
  geo.raises = randomBumps(rng, RAISES_MAX, () => RAISE_FROM + rng() * RAISE_SPAN, RAISE_MIN, RAISE_RANGE, RAISE_W_MIN, RAISE_W_RANGE)
  geo.folds = randomBumps(rng, FOLDS_MAX, () => (rng() < HALF ? 0 : Math.PI) + (rng() - HALF) * FOLD_SPREAD * 2, FOLD_MIN, FOLD_RANGE, FOLD_W_MIN, FOLD_W_RANGE)
  geo.ring = []
  for (let i = 0; i < LEAF_RING_STEPS; i++) geo.ring.push(leafEdge(geo, i / LEAF_RING_STEPS * Math.PI * 2))
  geo.front = []
  geo.lower = []
  for (let i = 0; i <= LEAF_FRONT_STEPS; i++) {
    const a = i / LEAF_FRONT_STEPS * Math.PI
    const p = leafEdge(geo, a)
    geo.front.push(p)
    geo.lower.push({ x: p.x, y: p.y + underThick(geo, a) })
  }
  return geo
}
//
// Rim point at an angle (sin > 0: the near side): an uneven scalloped oval
// with big lobes, near lip slightly raised, both ends and a few folds bent
// down over the edge, a few front lobes curled up, small vertical waves.
//
function leafEdge(geo, a) {
  const { cx, cy, rx, ry, ph1, ph2, ph3 } = geo
  const s = Math.sin(a)
  const c = Math.cos(a)
  const r = 1 + Math.sin(a * LEAF_WOBBLE_F1 + ph1) * LEAF_WOBBLE_1 + Math.sin(a * LEAF_WOBBLE_F2 + ph2) * LEAF_WOBBLE_2 +
    SCALLOP_AMP * (Math.abs(Math.sin(a * SCALLOP_F / 2 + ph3)) - HALF) + Math.sin(a * LOBE_F + ph3) * LOBE_AMP
  const lift = FRONT_LIFT * ry * Math.pow(Math.max(0, s), LIFT_POW)
  const ends = SIDE_DROOP * ry * Math.pow(Math.abs(c), SIDE_DROOP_POW)
  return { x: cx + c * rx * r, y: cy + s * ry * r - lift + ends + bumps(a, geo.folds) - bumps(a, geo.raises) + Math.sin(a * RUFFLE_F + ph1) * RUFFLE_AMP }
}
//
// 1–max bumps on the rim: angle (from angleAt), size and width each random.
//
function randomBumps(rng, max, angleAt, sizeMin, sizeRange, wMin, wRange) {
  const out = []
  const count = 1 + Math.floor(rng() * max)
  for (let i = 0; i < count; i++) out.push({ a: angleAt(), size: sizeMin + rng() * sizeRange, w: wMin + rng() * wRange })
  return out
}
//
// Sum of soft bumps at an angle (each its full size at its centre, fading
// over its width).
//
function bumps(a, list) {
  return list.reduce((sum, b) => {
    const d = Math.atan2(Math.sin(a - b.a), Math.cos(a - b.a)) / b.w
    return sum + b.size * Math.exp(-d * d)
  }, 0)
}
//
// Underside height below the near rim: thick in the middle, soft folds.
//
function underThick(geo, a) {
  return LEAF_THICK * (LEAF_THICK_EDGE + (1 - LEAF_THICK_EDGE) * Math.sin(a)) + Math.sin(a * LEAF_FOLD_F + geo.ph2) * LEAF_FOLD_AMP + bumps(a, geo.folds) / 2 + bumps(a, geo.raises)
}
//
// What hangs under the leaf (behind the hero): short moss strands and
// slime lobes. Returns drip tips and anchors for the long
// swaying strands, all on the underside's lower edge.
//
function paintLeafHang(ctx, geo, tones, rng, len) {
  const tips = []
  for (let i = 0; i < Math.round(len / STRAND_EVERY); i++) {
    const p = lowerEdgePoint(geo, rng)
    tips.push(paintMossStrand(ctx, p.x, p.y - STRAND_SINK, STRAND_LEN_MIN + Math.pow(rng(), STRAND_SHORT_POW) * STRAND_LEN_RANGE, rng))
  }
  paintLobes(ctx, geo.lower, rng, tones, tips)
  const anchors = []
  for (let i = 0; i < Math.round(len / SWAY_EVERY); i++) {
    const p = lowerEdgePoint(geo, rng)
    anchors.push({ x: p.x, y: p.y - STRAND_SINK })
  }
  return { tips, anchors }
}
//
// Random point on the underside's lower edge, away from the very ends.
//
function lowerEdgePoint(geo, rng) {
  return geo.lower[Math.floor(geo.lower.length * (STRAND_EDGE_FROM + rng() * STRAND_EDGE_SPAN))]
}
//
// One pad: the underside under the raised near lip, then the top face.
//
function paintPad(ctx, geo, tones, rng) {
  paintUnderside(ctx, geo, tones, rng)
  const face = closedPath(geo.ring)
  paintLeafFace(ctx, face, geo, tones, rng)
  ctx.strokeStyle = css(tones[0])
  ctx.lineWidth = LEAF_CONTOUR_W
  ctx.stroke(face)
}
//
// Underside below the near rim: dark flesh deepening downward, ribs
// fanning out from a point under the leaf toward the rim (wandering and
// forking like the veins on top), a lit band just under the lip.
//
function paintUnderside(ctx, geo, tones, rng) {
  const [contour, deep, dark, mid, , high] = tones
  const { front, lower, cx } = geo
  const wall = closedPath([...front, ...lower.slice().reverse()])
  const top = Math.min(...front.map(p => p.y))
  const bottom = Math.max(...lower.map(p => p.y))
  ctx.fillStyle = css(dark)
  ctx.fill(wall)
  ctx.save()
  ctx.clip(wall)
  const g = ctx.createLinearGradient(0, top, 0, bottom)
  g.addColorStop(0, css(deep, 0))
  g.addColorStop(1, css(deep, UNDER_DEEP_ALPHA))
  ctx.fillStyle = g
  ctx.fillRect(geo.cx - geo.rx, top, geo.rx * 2, bottom - top)
  for (let i = 1; i < front.length - 1; i += RIB_EVERY) {
    const end = { x: cx + (lower[i].x - cx) * RIB_CONVERGE, y: lower[i].y + RIB_DROP }
    paintVein(ctx, end, front[i], RIB_W, RIB_ALPHA, RIB_DEPTH, contour, high, rng)
  }
  ctx.strokeStyle = css(mid)
  ctx.lineWidth = UNDER_LIT_W
  strokePolyline(ctx, front.map(p => ({ x: p.x, y: p.y + UNDER_LIT_W })))
  ctx.restore()
  ctx.strokeStyle = css(contour)
  ctx.lineWidth = LEAF_CONTOUR_W
  ctx.stroke(wall)
}
//
// Top face: base tone, the drooping far part in shade, warm light to the
// upper left, cool shade to the right, a shallow hollow, veins from a navel,
// speckles, the raised near lip catching the light, a glow on the far rim.
//
function paintLeafFace(ctx, face, geo, tones, rng) {
  const [, deep, dark, mid, light, high, glow] = tones
  const { cx, cy, rx, ry, ring, front } = geo
  const backY = Math.min(...ring.map(p => p.y))
  ctx.save()
  ctx.fillStyle = css(mid)
  ctx.fill(face)
  ctx.clip(face)
  const g = ctx.createLinearGradient(0, backY, 0, cy)
  g.addColorStop(0, css(dark, BACK_SHADE_ALPHA))
  g.addColorStop(1, css(dark, 0))
  ctx.fillStyle = g
  ctx.fillRect(cx - rx, backY, rx * 2, cy - backY)
  radial(ctx, cx + rx * LEAF_SHADE_X, cy + ry * LEAF_SHADE_Y, rx * LEAF_SHADE_R, dark, LEAF_SHADE_ALPHA)
  radial(ctx, cx - rx * LEAF_LIGHT_X, cy - ry * LEAF_LIGHT_Y, rx * LEAF_LIGHT_R, light, LEAF_LIGHT_ALPHA)
  radial(ctx, cx - rx * LEAF_LIGHT_X, cy - ry * LEAF_LIGHT_Y, rx * LEAF_HIGH_R, high, LEAF_HIGH_ALPHA)
  radial(ctx, cx - rx * LEAF_GLOW_X, cy - ry * LEAF_LIGHT_Y, rx * LEAF_GLOW_R, glow, LEAF_GLOW_ALPHA)
  ctx.strokeStyle = css(deep, LEAF_HOLLOW_ALPHA)
  ctx.lineWidth = ry * LEAF_HOLLOW_W
  ctx.beginPath()
  ctx.ellipse(cx, cy, rx * LEAF_HOLLOW_SCALE, ry * LEAF_HOLLOW_SCALE, 0, 0, Math.PI * 2)
  ctx.stroke()
  const hub = { x: cx + rx * LEAF_HUB_X, y: cy + ry * LEAF_HUB_Y }
  paintVeins(ctx, ring, hub, rx, deep, high, rng)
  paintSpeckles(ctx, cx, cy, rx, ry, deep, high, rng)
  ctx.fillStyle = css(deep)
  ctx.beginPath()
  ctx.ellipse(hub.x, hub.y, NAVEL_R, NAVEL_R * ry / rx * 2, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = css(high)
  ctx.lineWidth = NAVEL_RIM_W
  ctx.stroke()
  ctx.lineWidth = LIP_LIGHT_W
  ctx.strokeStyle = css(light, LIP_LIGHT_ALPHA)
  strokePolyline(ctx, front.map(p => ({ x: p.x, y: p.y - LIP_INSET })))
  ctx.lineWidth = LIP_HIGH_W
  ctx.strokeStyle = css(high, LIP_HIGH_ALPHA)
  strokePolyline(ctx, front.map(p => ({ x: p.x, y: p.y - LIP_HIGH_W })))
  ctx.restore()
  ctx.strokeStyle = css(glow, LEAF_BACK_RIM_ALPHA)
  ctx.lineWidth = LEAF_BACK_RIM_W
  strokePolyline(ctx, ring.slice(LEAF_RING_STEPS / 2).map(p => ({ x: p.x, y: p.y + LEAF_BACK_RIM_W })))
}
//
// Veins from the navel toward the rim, each forking into fainter branches.
//
function paintVeins(ctx, ring, hub, rx, deep, high, rng) {
  for (let i = 0; i < LEAF_VEINS; i++) {
    const p = ring[Math.floor((i + rng() * LEAF_VEIN_JITTER) / LEAF_VEINS * ring.length) % ring.length]
    paintVein(ctx, hub, p, LEAF_VEIN_W, 1, VEIN_DEPTH, deep, high, rng)
  }
}
//
// One vein: a wandering line from a to b (dark groove, faint lit edge),
// then a few forks leaving it part way and heading off at an angle.
//
function paintVein(ctx, a, b, width, alpha, depth, deep, high, rng) {
  const pts = wanderLine(a, b, VEIN_SUBDIV, rng)
  ctx.lineWidth = width
  ctx.strokeStyle = css(deep, LEAF_VEIN_DARK_ALPHA * alpha)
  strokePolyline(ctx, pts)
  ctx.lineWidth = 1
  ctx.strokeStyle = css(high, LEAF_VEIN_LIT_ALPHA * alpha)
  strokePolyline(ctx, pts.map(p => ({ x: p.x - 1, y: p.y - 1 })))
  if (depth <= 1) return
  for (let f = 0; f < VEIN_FORKS; f++) {
    const from = pts[Math.floor(pts.length * (VEIN_FORK_FROM + rng() * VEIN_FORK_SPAN))]
    const turn = (rng() < HALF ? -1 : 1) * VEIN_FORK_ANGLE * (HALF + rng())
    const dx = (b.x - from.x) * VEIN_FORK_LEN
    const dy = (b.y - from.y) * VEIN_FORK_LEN
    const to = { x: from.x + dx * Math.cos(turn) - dy * Math.sin(turn), y: from.y + dx * Math.sin(turn) + dy * Math.cos(turn) }
    paintVein(ctx, from, to, width * VEIN_FADE, alpha * VEIN_FADE, depth - 1, deep, high, rng)
  }
}
//
// Points of a line from a to b bent by repeated midpoint displacement.
//
function wanderLine(a, b, levels, rng) {
  let pts = [a, b]
  let wander = Math.hypot(b.x - a.x, b.y - a.y) * VEIN_WANDER
  for (let l = 0; l < levels; l++) {
    const next = [pts[0]]
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i - 1]
      const q = pts[i]
      next.push({ x: (p.x + q.x) / 2 + (rng() - HALF) * wander, y: (p.y + q.y) / 2 + (rng() - HALF) * wander * HALF }, q)
    }
    pts = next
    wander *= HALF
  }
  return pts
}
//
// Skin speckles over the top face.
//
function paintSpeckles(ctx, cx, cy, rx, ry, deep, high, rng) {
  for (let i = 0; i < LEAF_SPECKLES; i++) {
    const a = rng() * Math.PI * 2
    const d = Math.sqrt(rng())
    ctx.fillStyle = css(rng() < HALF ? deep : high, LEAF_SPECKLE_ALPHA)
    ctx.beginPath()
    ctx.arc(cx + Math.cos(a) * rx * d, cy + Math.sin(a) * ry * d, LEAF_SPECKLE_R_MIN + rng() * LEAF_SPECKLE_R_RANGE, 0, Math.PI * 2)
    ctx.fill()
  }
}
//
// Fleshy slime lobes hanging from the lower edge; some end in a drop.
//
function paintLobes(ctx, lower, rng, tones, tips) {
  const [contour, deep, dark, , , , glow] = tones
  for (let i = 1; i < lower.length - 1; i++) {
    if (rng() > LEAF_LOBE_CHANCE) continue
    const p = lower[i]
    const len = LEAF_LOBE_LEN_MIN + rng() * (LEAF_LOBE_LEN_MAX - LEAF_LOBE_LEN_MIN)
    const w = LEAF_LOBE_W_MIN + rng() * LEAF_LOBE_W_RANGE
    ctx.beginPath()
    ctx.moveTo(p.x - w / 2, p.y - 2)
    ctx.quadraticCurveTo(p.x - w / 2, p.y + len, p.x, p.y + len)
    ctx.quadraticCurveTo(p.x + w / 2, p.y + len, p.x + w / 2, p.y - 2)
    ctx.closePath()
    ctx.fillStyle = css(rng() < HALF ? dark : deep)
    ctx.fill()
    ctx.strokeStyle = css(contour)
    ctx.lineWidth = 1
    ctx.stroke()
    if (rng() > LEAF_DROP_CHANCE) continue
    ctx.fillStyle = css(glow, LEAF_DROP_ALPHA)
    ctx.beginPath()
    ctx.arc(p.x, p.y + len + LEAF_DROP_R, LEAF_DROP_R, 0, Math.PI * 2)
    ctx.fill()
    tips.push({ x: p.x, y: p.y + len + LEAF_DROP_R * 2 })
  }
}
function radial(ctx, x, y, r, hex, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, css(hex, alpha))
  g.addColorStop(1, css(hex, 0))
  ctx.fillStyle = g
  ctx.fillRect(x - r, y - r, r * 2, r * 2)
}
function closedPath(pts) {
  const path = new Path2D()
  pts.forEach((p, i) => (i === 0 ? path.moveTo(p.x, p.y) : path.lineTo(p.x, p.y)))
  path.closePath()
  return path
}
function strokePolyline(ctx, pts) {
  ctx.beginPath()
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
  ctx.stroke()
}
