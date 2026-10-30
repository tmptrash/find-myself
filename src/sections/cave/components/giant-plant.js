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
// (leaf-mouth.js) in the middle of its pad. Landing on an open mouth makes
// its own tendrils coil round the hero, lift him, set him on the middle of
// the mouth and close over him;
// only then it snaps shut and he is eaten; it can also be fed the spore swarm,
// staying shut (a low bud, a safe step) for a while before it swells,
// opens again and lets the spores go.
//
const SPRITE_PREFIX = 'cave0-leaf-v11'
const GRAIN_SEED_BASE = 9900
const GRAIN_HANG_SEED = 50
const BAKE_PAD = 6
//
// Side room in the bake for the rim's lobes reaching past the leaf ends.
//
const SIDE_ROOM = 0.16
//
// The near rim sprite reaches this far above the rim line (the lit lip).
//
const RIM_BAND = 8
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
//
// On a trap leaf the raised lobes are lower and kept to the front right,
// clear of the mouth in the middle (span of angles from the right end).
//
const TRAP_RAISE_SCALE = 0.4
const TRAP_RAISE_SPAN = 0.55
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
// the light, warm light / highlight / glow to the upper left, veins from a
// navel near the middle, speckles.
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
const LOBE_TOP_STEPS = 6
const LEAF_DROP_CHANCE = 0.3
const LEAF_DROP_R = 2
const LEAF_DROP_ALPHA = 0.9
const STRAND_EVERY = 22
const STRAND_LEN_MIN = 12
const STRAND_LEN_RANGE = 90
const STRAND_SHORT_POW = 1.8
const STRAND_EDGE_FROM = 0.06
const STRAND_EDGE_SPAN = 0.88
//
// Strands hang from the leaf's rim (the dark line between the lit lip and
// the underside), pinned this far below it so their top bud sits on it.
//
const STRAND_PIN = 1
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
const MOUTH_R_SHARE = 0.3
const MOUTH_LIFT = 3
//
// The plant as a picture outside the level (the menu): each trap snaps
// shut on its own after a random wait (min + random range, seconds), then
// opens again like after a meal.
//
const DECOR_SNAP_MIN = 5
const DECOR_SNAP_RANGE = 7
const ALERT_PAD_X = 60
const ALERT_ABOVE = 260
//
// Grab timeline (seconds), like the forest flower: the mouth's tendrils
// strike out to the hero, coil round him, lift him up off the pad, hold
// him squeezing, set him down on the middle of the mouth, all of them
// close over him and crush him: he is squeezed narrow and flat in pulses
// while sinking down into the hole (below the pad's face) and swallowed.
//
const GRAB_STRIKE = 0.22
const GRAB_WRAP = 0.22
const GRAB_LIFT = 0.32
const GRAB_HOLD = 0.2
const GRAB_PLACE = 0.4
const GRAB_CLOSE = 0.3
const GRAB_CRUSH = 0.8
const CRUSH_SINK = 36
const CRUSH_SX = 0.5
const CRUSH_SY = 0.45
const CRUSH_PULSE = 0.08
const CRUSH_PULSE_SPEED = 26
const CRUSH_COIL = 0.25
const HERO_FEET_DY = 38
const GRAB_LIFT_PX = 30
const GRAB_SQUEEZE = 0.12
const GRAB_SQUEEZE_PULSE = 0.05
const GRAB_SQUEEZE_SPEED = 20
//
// Colliders along each leaf top.
//
const COLLIDE_H = 14
const LEAF_STATE = {
  OPEN: 'open',
  GRABBING: 'grabbing',
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
 * The plant's leaves and trap mouths as a picture outside the level (the
 * menu): no colliders, every piece placed at a scale through a world →
 * screen mapping, the traps now and then snapping shut and opening again.
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay instance
 * @param {(x: number, y: number) => {x: number, y: number}} cfg.toScreen - World point → screen point
 * @param {number} cfg.scale - Screen px per world px
 * @returns {Object} Decor instance
 */
export function createDecor(cfg) {
  const { k, toScreen, scale } = cfg
  const sprites = bakeLeaves(k)
  const leaves = Layout.PLANT_LEAVES.map((def, i) => {
    const sp = sprites[def.id]
    const mouthAt = toScreen((def.x1 + def.x2) / 2, def.y - MOUTH_LIFT)
    const at = toScreen(def.x1 - sp.padX, def.y - sp.lineY)
    return {
      sprites: sp,
      pos: k.vec2(at.x, at.y),
      state: S.OPEN,
      timer: 0,
      prey: null,
      wait: decorWait(),
      mouth: def.kind === Layout.LEAF_KIND.TRAP ? Mouth.create({
        k,
        x: mouthAt.x,
        y: mouthAt.y,
        r: Math.round((def.x2 - def.x1) * MOUTH_R_SHARE * scale),
        seed: GRAIN_SEED_BASE + i
      }) : null
    }
  })
  return { k, scale, leaves }
}

/**
 * Runs the picture's traps: open for a while, snap shut, open again.
 * @param {Object} inst - Decor instance
 */
export function onUpdateDecor(inst) {
  const dt = inst.k.dt()
  inst.leaves.forEach(leaf => {
    if (!leaf.mouth) return
    leaf.timer += dt
    leaf.state === S.OPEN && leaf.timer > leaf.wait && snapDecor(leaf)
    stepTrap(leaf)
    Mouth.setState(leaf.mouth, trapOpenness(leaf), trapSwell(leaf), false)
  })
}

/**
 * Draws the picture's leaves back to front like the level (far halves,
 * then each leaf's near face, mouth, rim and hanging strands).
 * @param {Object} inst - Decor instance
 * @param {number} opacity - Fade 0 … 1
 */
export function onDrawDecor(inst, opacity) {
  const k = inst.k
  const scale = k.vec2(inst.scale, inst.scale)
  inst.leaves.forEach(leaf => k.drawSprite({ sprite: leaf.sprites.back, pos: leaf.pos, scale, opacity }))
  inst.leaves.forEach(leaf => {
    k.drawSprite({ sprite: leaf.sprites.face, pos: leaf.pos, scale, opacity })
    leaf.mouth && Mouth.setOpacity(leaf.mouth, opacity)
    leaf.mouth && Mouth.onDraw(leaf.mouth)
    k.drawSprite({ sprite: leaf.sprites.rim, pos: leaf.pos, scale, opacity })
    k.drawSprite({ sprite: leaf.sprites.hang, pos: leaf.pos, scale, opacity })
  })
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
 * Runs the trap mouths. Returns what happened this frame: a trap that just
 * seized the hero, where it holds him while dragging him in, a trap that
 * swallowed him (to be eaten), and traps that just let their spores go.
 * @param {Object} inst - Plant instance
 * @param {Object|null} heroInst - Hero instance
 * @returns {{grabbedBy: Object|null, hold: {x: number, y: number, sx: number, sy: number}|null, eatenBy: Object|null, released: Object[]}}
 */
export function onUpdate(inst, heroInst) {
  const dt = inst.k.dt()
  const out = { grabbedBy: null, hold: null, eatenBy: null, released: [] }
  const char = heroInst?.character
  const standing = char?.exists?.() && char.isGrounded?.() ? char.curPlatform?.() : null
  inst.leaves.forEach(leaf => {
    if (!leaf.mouth) return
    leaf.timer += dt
    leaf.state === S.OPEN && standing === leaf.body && startGrab(leaf, char, out)
    leaf.state === S.GRABBING && stepGrab(leaf, out)
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
 * Draws what lies behind the hero: the far half of every leaf and the
 * parts of grabbing tendrils that pass behind him.
 * @param {Object} inst - Plant instance
 */
export function onDrawBack(inst) {
  const k = inst.k
  inst.leaves.forEach(leaf => {
    k.drawSprite({ sprite: leaf.sprites.back, pos: k.vec2(leaf.x1 - leaf.sprites.padX, leaf.y - leaf.sprites.lineY) })
    leaf.mouth && Mouth.onDrawBack(leaf.mouth)
  })
}

/**
 * Draws what lies in front of the hero, back to front: the near part of the
 * leaf's top face, the trap mouth on it, the near rim (raised lobes, lit
 * lip, underside) in front of the mouth, then everything hanging from it.
 * @param {Object} inst - Plant instance
 */
export function onDrawFront(inst) {
  const k = inst.k
  inst.leaves.forEach(leaf => {
    const sp = leaf.sprites
    const pos = k.vec2(leaf.x1 - sp.padX, leaf.y - sp.lineY)
    k.drawSprite({ sprite: sp.face, pos })
    leaf.mouth && Mouth.onDraw(leaf.mouth)
    k.drawSprite({ sprite: sp.rim, pos })
    k.drawSprite({ sprite: sp.hang, pos })
  })
}
//
// The hero landed on an open mouth: its tendrils seize him where he stands.
//
function startGrab(leaf, char, out) {
  leaf.state = S.GRABBING
  leaf.timer = 0
  leaf.prey = 'hero'
  leaf.grabFrom = { x: char.pos.x, y: char.pos.y }
  out.grabbedBy = leaf
}
//
// One frame of the grab: where the tendrils are and where the hero is.
// When he is in the throat, the mouth snaps shut on him.
//
function stepGrab(leaf, out) {
  const t = leaf.timer
  const from = leaf.grabFrom
  const mouth = leaf.mouth
  const placeAt = GRAB_STRIKE + GRAB_WRAP + GRAB_LIFT + GRAB_HOLD
  const lift = smooth(phase(t, GRAB_STRIKE + GRAB_WRAP, GRAB_LIFT))
  const hold = phase(t, GRAB_STRIKE + GRAB_WRAP + GRAB_LIFT, GRAB_HOLD)
  const place = smooth(phase(t, placeAt, GRAB_PLACE))
  const close = smooth(phase(t, placeAt + GRAB_PLACE, GRAB_CLOSE))
  const crush = phase(t, placeAt + GRAB_PLACE + GRAB_CLOSE, GRAB_CRUSH)
  const pulse = Math.sin(t * CRUSH_PULSE_SPEED) * CRUSH_PULSE * Math.sin(Math.PI * crush)
  const sx = 1 - (1 - CRUSH_SX) * smooth(crush) + pulse
  const sy = 1 - (1 - CRUSH_SY) * smooth(crush) - pulse
  const pos = {
    x: from.x + (mouth.x - from.x) * place,
    y: from.y - GRAB_LIFT_PX * lift * (1 - place) + HERO_FEET_DY * (1 - sy) + CRUSH_SINK * smooth(crush),
    sx,
    sy
  }
  const squeeze = lift * GRAB_SQUEEZE + Math.sin(t * GRAB_SQUEEZE_SPEED) * GRAB_SQUEEZE_PULSE * hold + CRUSH_COIL * crush
  Mouth.setGrab(mouth, { reach: phase(t, 0, GRAB_STRIKE), wrap: smooth(phase(t, GRAB_STRIKE, GRAB_WRAP)), squeeze, close, ...pos })
  out.hold = pos
  if (t < placeAt + GRAB_PLACE + GRAB_CLOSE + GRAB_CRUSH) return
  Mouth.setGrab(mouth, null)
  leaf.state = S.CLOSING
  leaf.timer = 0
  out.eatenBy = leaf
}
//
// Progress 0 … 1 through a phase starting at `from` and lasting `time`.
//
function phase(t, from, time) {
  return Math.max(0, Math.min(1, (t - from) / time))
}
function smooth(u) {
  return u * u * (3 - 2 * u)
}
//
// Advances a trap's state clock; true when it just opened again after
// holding the spores.
//
function stepTrap(leaf) {
  if (leaf.state === S.OPEN || leaf.state === S.GRABBING || leaf.timer < stateTime(leaf)) return false
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
  if (leaf.state === S.OPEN || leaf.state === S.GRABBING) return 1
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
// A picture trap snaps shut (nothing caught) and waits anew for the next.
//
function snapDecor(leaf) {
  leaf.state = S.CLOSING
  leaf.timer = 0
  leaf.wait = decorWait()
}
function decorWait() {
  return DECOR_SNAP_MIN + Math.random() * DECOR_SNAP_RANGE
}
//
// Static body along the leaf top, trimmed at both ends by collideInset and
// lowered by walkDrop.
//
function addCollider(k, def) {
  const inset = def.collideInset ?? 0
  return k.add([
    k.rect(def.x2 - def.x1 - inset * 2, COLLIDE_H),
    k.pos(def.x1 + inset, def.y + (def.walkDrop ?? 0)),
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
    const geo = leafGeometry(padX + len / 2, lineY, len / 2, ry, createSeededRandom(seed), def.kind === Layout.LEAF_KIND.TRAP)
    const rng = createSeededRandom(seed)
    const hang = bakeCanvas(w, h, ctx => paintLeafHang(ctx, geo, tones, rng, len))
    applyForestFilmGrainToCanvas(hang.canvas, seed + GRAIN_HANG_SEED)
    const body = bakeCanvas(w, h, ctx => paintPad(ctx, geo, tones, rng))
    applyForestFilmGrainToCanvas(body.canvas, seed)
    const front = frontMask(geo, w, h, lineY + (def.walkDrop ?? 0))
    const near = maskedCopy(body.canvas, front, 'destination-in')
    const rim = rimMask(geo, w, h)
    const name = `${SPRITE_PREFIX}-${def.id}`
    out[def.id] = {
      w,
      h,
      lineY,
      padX,
      hang: loadCanvas(k, `${name}-hang`, hang.canvas),
      back: loadCanvas(k, `${name}-back`, maskedCopy(body.canvas, front, 'destination-out')),
      face: loadCanvas(k, `${name}-face`, maskedCopy(near, rim, 'destination-out')),
      rim: loadCanvas(k, `${name}-rim`, maskedCopy(near, rim, 'destination-in')),
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
// stands on (walkY), and below the near rim where a lobe curls up above
// that line.
//
function frontMask(geo, w, h, walkY) {
  const path = new Path2D()
  path.moveTo(0, walkY)
  geo.front.slice().reverse().forEach(p => path.lineTo(p.x, Math.min(walkY, p.y)))
  path.lineTo(w, walkY)
  path.lineTo(w, h)
  path.lineTo(0, h)
  path.closePath()
  return path
}
//
// The near rim and everything under it: below the rim line raised by the
// lit lip's width, so the lip goes with the rim.
//
function rimMask(geo, w, h) {
  const path = new Path2D()
  path.moveTo(0, h)
  geo.front.slice().reverse().forEach(p => path.lineTo(p.x, p.y - RIM_BAND))
  path.lineTo(w, geo.front[0].y - RIM_BAND)
  path.lineTo(w, h)
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
function leafGeometry(cx, cy, rx, ry, rng, trap = false) {
  const geo = { cx, cy, rx, ry, ph1: rng() * Math.PI * 2, ph2: rng() * Math.PI * 2, ph3: rng() * Math.PI * 2 }
  geo.raises = trap
    ? randomBumps(rng, RAISES_MAX, () => RAISE_FROM + rng() * TRAP_RAISE_SPAN, RAISE_MIN * TRAP_RAISE_SCALE, RAISE_RANGE * TRAP_RAISE_SCALE, RAISE_W_MIN, RAISE_W_RANGE)
    : randomBumps(rng, RAISES_MAX, () => RAISE_FROM + rng() * RAISE_SPAN, RAISE_MIN, RAISE_RANGE, RAISE_W_MIN, RAISE_W_RANGE)
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
// What hangs from the leaf's rim (drawn over its near half): short moss
// strands and slime lobes. Returns drip tips and the rim anchors for the
// long swaying strands.
//
function paintLeafHang(ctx, geo, tones, rng, len) {
  const tips = []
  for (let i = 0; i < Math.round(len / STRAND_EVERY); i++) {
    const p = rimPoint(geo, rng)
    tips.push(paintMossStrand(ctx, p.x, p.y + STRAND_PIN, STRAND_LEN_MIN + Math.pow(rng(), STRAND_SHORT_POW) * STRAND_LEN_RANGE, rng))
  }
  paintLobes(ctx, geo.front, rng, tones, tips)
  const anchors = []
  for (let i = 0; i < Math.round(len / SWAY_EVERY); i++) {
    const p = rimPoint(geo, rng)
    anchors.push({ x: p.x, y: p.y + STRAND_PIN })
  }
  return { tips, anchors }
}
//
// Random point on the leaf's near rim, away from the very ends.
//
function rimPoint(geo, rng) {
  return geo.front[Math.floor(geo.front.length * (STRAND_EDGE_FROM + rng() * STRAND_EDGE_SPAN))]
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
// upper left, cool shade to the right, veins from a navel,
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
// Fleshy slime lobes hanging from the rim; some end in a drop. A lobe's
// top follows the rim's curve right under its dark line (so it grows out
// of the line, whatever its slope); only its sides and bottom get a
// contour.
//
function paintLobes(ctx, rim, rng, tones, tips) {
  const [contour, deep, dark, , , , glow] = tones
  for (let i = 1; i < rim.length - 1; i++) {
    if (rng() > LEAF_LOBE_CHANCE) continue
    const p = rim[i]
    const len = LEAF_LOBE_LEN_MIN + rng() * (LEAF_LOBE_LEN_MAX - LEAF_LOBE_LEN_MIN)
    const w = LEAF_LOBE_W_MIN + rng() * LEAF_LOBE_W_RANGE
    const top = []
    for (let s = 0; s <= LOBE_TOP_STEPS; s++) {
      const x = p.x - w / 2 + w * s / LOBE_TOP_STEPS
      top.push({ x, y: rimYAt(rim, x) + LEAF_CONTOUR_W / 2 })
    }
    const left = top[0]
    const right = top[top.length - 1]
    const tipY = Math.max(left.y, right.y) + len
    const body = new Path2D()
    body.moveTo(right.x, right.y)
    body.quadraticCurveTo(right.x, tipY, p.x, tipY)
    body.quadraticCurveTo(left.x, tipY, left.x, left.y)
    const shape = new Path2D()
    top.forEach((q, k) => (k ? shape.lineTo(q.x, q.y) : shape.moveTo(q.x, q.y)))
    shape.addPath(body)
    ctx.fillStyle = css(rng() < HALF ? dark : deep)
    ctx.fill(shape)
    ctx.strokeStyle = css(contour)
    ctx.lineWidth = 1
    ctx.stroke(body)
    if (rng() > LEAF_DROP_CHANCE) continue
    ctx.fillStyle = css(glow, LEAF_DROP_ALPHA)
    ctx.beginPath()
    ctx.arc(p.x, tipY + LEAF_DROP_R, LEAF_DROP_R, 0, Math.PI * 2)
    ctx.fill()
    tips.push({ x: p.x, y: tipY + LEAF_DROP_R * 2 })
  }
}
//
// Y of the rim line at an X (interpolated between rim points).
//
function rimYAt(rim, x) {
  for (let i = 1; i < rim.length; i++) {
    const a = rim[i - 1]
    const b = rim[i]
    if ((x - a.x) * (x - b.x) <= 0) return a.y + (b.y - a.y) * ((x - a.x) / ((b.x - a.x) || 1))
  }
  return Math.abs(x - rim[0].x) < Math.abs(x - rim[rim.length - 1].x) ? rim[0].y : rim[rim.length - 1].y
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
