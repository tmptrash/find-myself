import { CFG } from '../../../cfg.js'
import * as IkChain from '../../../utils/ik-chain.js'
import * as PolyBatch from '../../../utils/poly-batch.js'
import { createSeededRandom, nextSeed } from '../../../utils/seeded-random.js'
import { drawFernToCanvas } from '../../../utils/draw-fern.js'
import { drawFeatherPlumeToCanvas } from '../../../utils/draw-feather-plume.js'
import { drawGrassTuftToCanvas } from '../../../utils/draw-grass-tuft.js'
import { drawMossyHillToCanvas, mossyHillBounds, mossyHillTopY } from '../../../utils/draw-mossy-hill.js'
import { drawSmallMushroomGroupToCanvas } from '../../../utils/draw-small-mushroom.js'
import { addEyeBerry, addTaperedPass } from '../utils/glow-eye-berry.js'
import { GLOW_PAL, glowRgb } from '../utils/glow-palette.js'
import { drawStaticDecorSprite, ensureStaticDecorSprite } from '../utils/glow-static-bake.js'
import * as SoilSeam from '../utils/glow-soil-seam.js'
import { forestFloorPainterColors } from './forest-floor.js'

//
// Hill island in the left lake carrying a doll's-eyes bush: a red stalk whose
// top branches into short red stems, each holding a white eye-berry with a
// dark pupil, over long grass blades. The closer the hero comes, the harder
// the whole bush bends and stretches to him, and every berry watches him.
//
// The island runs off the left edge of the playfield (its left part sits under
// the frame) and is the same mossy boulder hill as the one right of the tree,
// mirrored: a flat crest under the frame, then a long slope that slides into
// the lake instead of a cut bank.
//
const ISLAND_W = 360
const ISLAND_OFFSCREEN_W = 80
const ISLAND_ABOVE_WATER = 28
const ISLAND_BELOW_WATER = 30
const ISLAND_PLATEAU_FRAC = 0.58
//
// Walkable span ends once the slope has dropped this far below the crest, so
// the hero never hovers over the descending bank.
//
const ISLAND_WALK_DROP = 4
const ISLAND_SAMPLE_STEP = 2
const ISLAND_BAKE_PAD = 4
const ISLAND_DECOR_UP = 96
const ISLAND_BAKE_SEED = 0x65796566
const ISLAND_BAKE_SLOT = 'island'
const ISLAND_BAKE_KEY = 'v9'
const ISLAND_BAKE_BELOW_WATER = 10
//
// Rock-to-soil seam: centred this far under the water line so even its
// highest tongue stays below the ground line (water line + 8 px); the last
// stretch before the shore eases up to ISLAND_BAKE_BELOW_WATER.
//
const ISLAND_SEAM_BELOW_WATER = 21
const ISLAND_SEAM_INDEX = 7
const ISLAND_SEAM_SHORE_BLEND = 24
//
// Moss, tufts and plants stop above the lake surface; submerged stones may go lower.
//
const ISLAND_GREENERY_ABOVE_WATER = 12
//
// Surface dressing, placed by offset from the lake's left edge (negative = under
// the frame). Same painters and colours as the forest floor right of the tree.
//
const KIND = { FERN: 'fern', PLUME: 'plume', MUSHROOMS: 'mushrooms' }
const ISLAND_PLANTS = [
  { kind: KIND.FERN, dx: -34, size: 60 },
  { kind: KIND.PLUME, dx: -6, size: 42 },
  { kind: KIND.FERN, dx: 14, size: 48 },
  { kind: KIND.PLUME, dx: 84, size: 36 },
  { kind: KIND.FERN, dx: 106, size: 52 },
  { kind: KIND.MUSHROOMS, dx: 128 },
  { kind: KIND.PLUME, dx: 138, size: 30 }
]
const ISLAND_TUFT_STEP = 13
const ISLAND_TUFT_CHANCE = 0.55
//
// Island sits under the lake fill (LAKE_Z = 12) so the water hides its
// submerged half; the plant draws just behind the hero.
//
const ISLAND_Z = 11.8
const PLANT_Z = CFG.visual.zIndex.player - 0.5
//
// Static collider over the walkable top (hidden far away while the plant is off).
//
const COLLIDER_H = 10
//
// Walkable box extends past the hill crest on the right; its top edge aligns
// with the lake surface so the hero lands at the waterline on the slope.
//
const COLLIDER_EXTEND_RIGHT = 52
const COLLIDER_DROP = ISLAND_ABOVE_WATER
//
// Painted soil line (grab hole, landing crumbs) sits this far under the
// mossy crest, above the waterline collider.
//
const SOIL_LINE_DROP = 14
const COLLIDER_HIDE_POS = -5000
const STAND_X_SLACK = 6
const STAND_ABOVE = 14
const STAND_BELOW = 14
//
// Open water kept between the island edge and a swimming centipede's head.
//
const PREDATOR_CLEAR_X = 28
//
// Past the collider the grab still takes the hero anywhere up to the
// centipede's stop line: a short hop off the stick lands in that strip with
// the body against the painted shore, and it must read as "on the island".
//
const BANK_BODY_REACH = PREDATOR_CLEAR_X
//
// Hero body height: feet below the collider top by less than this put the
// body against the collider's right side.
//
const SIDE_WALL_HERO_H = 74
//
// Plant root just right of the frame, so the flower and its buds are on screen.
//
const PLANT_BASE_DX = ISLAND_OFFSCREEN_W + 44
const PLANT_BASE_SINK = 2
//
// Whole bush leans toward the hero as he approaches (0 = standing like an
// ordinary plant, 1 = stretched almost to him). Distances are from the plant
// root to the hero; the lean eases in over time so it never snaps.
//
const LEAN_FAR = 1300
const LEAN_NEAR = 600
const LEAN_SPEED = 0.42
//
// Lagged aim point the stem and blades chase (hero position snaps instantly
// without this — the flower would move in lockstep with him).
//
const LEAN_HERO_LAG_SPEED = 105
//
// Stretched blades and the stem bow upward over the water: each is a circular
// arc whose chord points at its target and whose half-turn is this angle.
//
const LEAN_ARC_HALF = 0.42
const LEAN_MIN_LEN_FRAC = 0.6
//
// Nothing stretches past this gap short of the big tree.
//
const REACH_TREE_GAP = 70
//
// Stem: an arc drooping toward the lake at rest; leaning, it stretches so the
// berry cluster stops just short of the hero (berries + a small gap).
//
const STEM_SEGMENTS = 14
const STEM_LEN = 156
const STEM_REST_BEND = 2
const STEM_BEND_POW = 1.6
const STEM_SWAY_AMP = 0.08
const STEM_SWAY_SPEED = 0.9
const STEM_HERO_GAP = 104
//
// Main stalk — at full lean its tip stops at this fraction of the lake
// width (blades may reach farther; whisper still uses hero-to-head distance).
//
const STEM_LAKE_REACH_FRAC = 0.5
const STEM_W_BASE = 6
const STEM_W_TIP = 3
const STEM_LIGHT_FRAC = 0.35
const CONTOUR_PAD = 2
//
// Eye-berries on short red stems branching off the upper stalk, like the
// doll's-eyes reference: big berries on long stems at the top, smaller ones
// lower down. `at` is where the stem leaves the stalk (0 = root, 1 = tip),
// `turn` its angle off the stalk heading (negative = left of it), `len` the
// stem length and `r` the berry radius.
//
const BERRIES = [
  { at: 1, turn: -0.3, len: 26, r: 10, phase: 0.3 },
  { at: 1, turn: 0.45, len: 20, r: 8.5, phase: 1.1 },
  { at: 0.95, turn: -1, len: 38, r: 9.5, phase: 2.4 },
  { at: 0.91, turn: 1.05, len: 40, r: 10, phase: 0.8 },
  { at: 0.86, turn: -0.6, len: 18, r: 6, phase: 1.9 },
  { at: 0.82, turn: 0.7, len: 22, r: 7, phase: 2.9 },
  { at: 0.77, turn: -1.15, len: 32, r: 8.5, phase: 0.5 },
  { at: 0.72, turn: 1.1, len: 18, r: 5.5, phase: 1.5 },
  { at: 0.67, turn: -0.8, len: 22, r: 6.5, phase: 2.2 },
  { at: 0.62, turn: 0.95, len: 26, r: 7, phase: 3.1 },
  { at: 0.56, turn: -1, len: 15, r: 5, phase: 0.1 },
  { at: 0.52, turn: 0.85, len: 17, r: 5.5, phase: 1.7 }
]
const BERRY_STEM_SEGMENTS = 4
const BERRY_STEM_W_BASE = 3
const BERRY_STEM_W_TIP = 2
//
// Berry stems curl upward toward their tips and sway on their own.
//
const BERRY_STEM_CURL = 0.45
const BERRY_SWAY_AMP = 0.12
const BERRY_SWAY_SPEED = 1.4
//
// Berry look: shaded underside, then one dark pupil off centre. Pupils drift
// at rest and lock onto the hero as the bush wakes (openness).
//
const BERRY_CONTOUR_W = 1.5
const BERRY_PUPIL_FRAC = 0.4
const BERRY_LOOK_FRAC = 0.4
const BERRY_REST_LOOK = Math.PI / 2
const BERRY_REST_LOOK_SPREAD = 1.2
//
// Whispering: the pupils dilate in an uneven, syllable-like rhythm.
//
const PUPIL_WHISPER_DILATE = 0.35
const MOUTH_SYLLABLE_A = 9.3
const MOUTH_SYLLABLE_B = 14.1
const MOUTH_SYLLABLE_B_PHASE = 1.7
const MOUTH_SYLLABLE_A_W = 0.55
const MOUTH_SYLLABLE_B_W = 0.45
const MOUTH_WHISPER_SPEED = 3
//
// Openness follows distance from hero to the berry cluster (far = asleep).
//
const OPEN_FAR = 850
const OPEN_NEAR = 450
const OPEN_SPEED = 1.2
//
// Long grass-like blades of the bush. `follow` is how far a blade turns toward
// the hero at full lean (back blades on the far side barely move), `reach` the
// share of the root-to-hero distance it stretches over.
//
const BLADES = [
  { dx: -14, angle: -2.55, len: 70, w: 9, phase: 0.4, follow: 0.25, reach: 0.18 },
  { dx: -9, angle: -2.2, len: 92, w: 10, phase: 1.3, follow: 0.45, reach: 0.3 },
  { dx: -5, angle: -1.9, len: 64, w: 8, phase: 2.2, follow: 0.6, reach: 0.38 },
  { dx: -2, angle: -1.65, len: 104, w: 10, phase: 0.2, follow: 0.75, reach: 0.5 },
  { dx: 2, angle: -1.4, len: 96, w: 11, phase: 0.9, follow: 0.9, reach: 0.62 },
  { dx: 5, angle: -1.15, len: 84, w: 10, phase: 2.8, follow: 1, reach: 0.72 },
  { dx: 8, angle: -0.9, len: 76, w: 9, phase: 1.9, follow: 1, reach: 0.58 },
  { dx: 11, angle: -0.6, len: 58, w: 8, phase: 3.4, follow: 0.85, reach: 0.42 }
]
const BLADE_SEGMENTS = 14
const BLADE_REST_BEND = 0.35
const BLADE_SWAY_AMP = 0.05
const BLADE_SWAY_SPEED = 1.3
//
// Blade width profile: narrow at the root, widest near 40 %, pointed tip.
//
const BLADE_ROOT_PHASE = 0.15
const BLADE_TIP_PHASE = 0.98
const BLADE_MIDRIB_FRAC = 0.35
//
// Whisper grows as the hero approaches the flower head (loudest at closest range).
//
const WHISPER_FAR = 1400
const WHISPER_NEAR = 450
//
// Spawn east of the branch trampoline must clear this whisper falloff band.
//
const WHISPER_SPAWN_X_MARGIN = 12
//
// Grab sequence (timeline in flower-grab.js). Four front blades turn into
// tentacles: they coil back, whip out on curved paths one after another, wrap
// around the hero and drag him under; the stem rears, lunges and wobbles on
// damped springs. Everything integrates in fixed sub-steps so the motion is
// the same at any frame rate.
//
export const GRAB_PHASE = {
  AWARE: 'aware',
  STRIKE: 'strike',
  LIFT: 'lift',
  HOLD: 'hold',
  PULL: 'pull',
  RELEASE: 'release'
}
const GRAB_STEP = 1 / 240
const GRAB_MAX_DT = 1 / 20
//
// Per tentacle: source blade, strike delay (staggered, never in sync), band
// height on the hero body (from his centre, negative = up), coil direction,
// bow of the reach arc (sign = over / under swing) and wind-up scale.
//
const GRAB_TENTACLES = [
  { bladeIndex: 5, delay: 0, bandDY: -14, wrapDir: 1, bow: 0.95, windup: 1 },
  { bladeIndex: 4, delay: 0.07, bandDY: 2, wrapDir: -1, bow: -0.6, windup: 0.8 },
  { bladeIndex: 6, delay: 0.13, bandDY: -28, wrapDir: -1, bow: 1.2, windup: 1.2 },
  { bladeIndex: 3, delay: 0.2, bandDY: 16, wrapDir: 1, bow: -0.85, windup: 0.9 }
]
//
// The last blade segments become the coil; the rest is the IK reach chain.
//
const GRAB_WRAP_SEGMENTS = 5
const GRAB_REACH_SEGMENTS = BLADE_SEGMENTS - GRAB_WRAP_SEGMENTS
//
// Coil: a band around the body seen slightly from above (flat ellipse) that
// spirals down a little; segments on its lower half pass in front of him.
//
const GRAB_BAND_RX = 17
const GRAB_BAND_RY = 5
const GRAB_BAND_SPIRAL = 7
const GRAB_WRAP_SWEEP = Math.PI * 1.8
const GRAB_WRAP_SEC = 0.2
const GRAB_UNWRAP_SEC = 0.45
const GRAB_HOLDING_WRAP = 0.85
const GRAB_SQUEEZE = 0.12
const GRAB_SQUEEZE_PULSE = 0.06
const GRAB_SQUEEZE_PULSE_SPEED = 9
//
// Anticipation: tips draw back away from the hero and up before the strike.
//
const GRAB_WINDUP_BACK = 34
const GRAB_WINDUP_UP = 24
//
// Tip springs (stiffness, damping) — soft coil-back, snappy overshooting
// strike, lazy retreat out of the soil afterwards.
//
const GRAB_TIP_SPRING = {
  windup: { k: 55, c: 9 },
  strike: { k: 340, c: 15 },
  release: { k: 26, c: 6 }
}
//
// Strike path: the target starts displaced sideways and slides onto the grip,
// so the tip travels a curve; the catch radius grows if a tip lags behind.
//
const GRAB_STRIKE_ARC_PX = 70
const GRAB_STRIKE_ARC_SEC = 0.22
const GRAB_CATCH_PX = 9
const GRAB_CATCH_GROW_PER_SEC = 120
//
// Reach chain length follows the distance to its target with some slack
// (curved, not a rigid rod), taut while hauling.
//
const GRAB_LEN_SLACK = { aware: 1.25, strike: 1.18, lift: 1.08, hold: 1.04, pull: 1, release: 1.2 }
const GRAB_LEN_SPRING = { k: 260, c: 24 }
const GRAB_IK_STIFFNESS = 0.3
//
// Reach arc bow per phase: coiled while waiting, straightening under load,
// almost straight when the tentacles contract.
//
const GRAB_BOW = { aware: 1.5, strike: 1, lift: 0.55, hold: 0.4, pull: 0.12, release: 1.1 }
const GRAB_WOBBLE_SPEED = 7
const GRAB_WOBBLE_AMP = 0.25
//
// Stem springs: tilt (radians, positive = toward the hero and down) and
// length multiplier. The plant crouches back, lunges at the strike, leans
// back with the weight, trembles before the pull, slams down, then settles
// with a loose, wobbling follow-through.
//
const GRAB_BODY = {
  aware: { tilt: -0.2, stretch: 0.88, k: 70, c: 9 },
  strike: { tilt: 0.1, stretch: 1.12, k: 140, c: 10 },
  lift: { tilt: -0.16, stretch: 1.04, k: 110, c: 12 },
  hold: { tilt: -0.22, stretch: 0.94, k: 160, c: 14 },
  pull: { tilt: 0.34, stretch: 0.72, k: 260, c: 16 },
  release: { tilt: 0, stretch: 1, k: 45, c: 3.5 }
}
const GRAB_STRIKE_TILT_KICK = 2.4
const GRAB_PULL_TILT_KICK = 4
const GRAB_HOLD_TREMBLE = 120
const GRAB_AIM_SPRING = { k: 90, c: 15 }
//
// While the hero is hauled the stem aims no lower than this above the ground
// line, and stalk and berries are held above it (the lake under the island
// is see-through).
//
const GRAB_AIM_ABOVE_GROUND = 44
const GRAB_STEM_CLEAR = 4
const GRAB_HEAD_CLEAR = 34
const GRAB_BERRY_CLEAR = 12
const GRAB_STEM_GAP = 64
const GRAB_LEAN_SPEED = 2.5
const GRAB_OPEN_SPEED = 3.2
const GRAB_CLOSE_SPEED = 0.7
const GRAB_BLADE_TILT_FOLLOW = 0.6
//
// Coils that pass in front of the hero draw over him; the grabbed hero is
// drawn just above the island and its torn-earth hole (flower-grab), so the
// coils sit above that, still under the lake fill.
//
const GRAB_FRONT_Z = ISLAND_Z + 0.18
//
// Right after the pull the whole plant follows the hero down, accelerating.
// Vertices that pass the ground line are flattened onto it there: the line
// sits inside the island soil, which draws over the plant and hides them,
// so nothing reaches the see-through lake below.
//
const GRAB_SINK_DELAY = 0.08
const GRAB_SINK_SEC = 0.75
const GRAB_SINK_DEPTH = 300
//
// Scratch points for ground clipping and coil sampling (no per-segment allocations).
//
const CLIP_SEG = { ax: 0, ay: 0, bx: 0, by: 0, cut: false }
const COIL_PT = { x: 0, y: 0, front: false }

/**
 * Creates the island, its walkable collider and the eye-flower plant.
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay inst
 * @param {number} cfg.x - Island centre X (see islandWorldX)
 * @param {number} cfg.waterY - Lake surface Y at rest
 * @param {number} cfg.lakeX1 - Lake left edge (world X)
 * @param {number} cfg.lakeX2 - Lake right edge (world X)
 * @param {number} cfg.reachTriggerX - Big tree X: stretched blades and the flower head never pass just short of it
 * @param {function(): ({x: number, y: number}|null)} cfg.getHeroPos - Hero body centre
 * @param {function(): boolean} cfg.isVisible - True while the island exists (colour world + lake)
 * @returns {Object} Eye-flower inst
 */
export function create(cfg) {
  const { k, x, waterY } = cfg
  const x1 = x - ISLAND_W * 0.5
  const x2 = x1 + ISLAND_W
  const topY = waterY - ISLAND_ABOVE_WATER
  const hill = buildIslandHill(x1, waterY)
  const walkX2 = hillXWhereTopReaches(hill, topY + ISLAND_WALK_DROP)
  const colliderWalkX2 = walkX2 + COLLIDER_EXTEND_RIGHT
  const colliderTopY = topY + COLLIDER_DROP
  const baseX = x1 + PLANT_BASE_DX
  const baseY = mossyHillTopY(hill, baseX) + PLANT_BASE_SINK
  const reachLimitX = cfg.reachTriggerX - REACH_TREE_GAP
  const lakeSpan = cfg.lakeX2 - cfg.lakeX1
  const stemReachMaxX = cfg.lakeX1 + lakeSpan * STEM_LAKE_REACH_FRAC
  const collider = k.add([
    k.rect(colliderWalkX2 - x1, COLLIDER_H),
    k.pos(COLLIDER_HIDE_POS, COLLIDER_HIDE_POS),
    k.area(),
    k.body({ isStatic: true }),
    k.opacity(0),
    CFG.game.platformName,
    CFG.game.noCeilingTag
  ])
  const inst = {
    k,
    x,
    x1,
    x2,
    waterY,
    topY,
    hill,
    walkX2,
    colliderWalkX2,
    colliderTopY,
    shoreX: hillXWhereTopReaches(hill, waterY),
    baseX,
    baseY,
    collider,
    reachLimitX,
    stemReachMaxX,
    getHeroPos: cfg.getHeroPos,
    isVisible: cfg.isVisible,
    visible: false,
    open: 0,
    lean: 0,
    leanHero: { x: baseX, y: baseY },
    stemPts: makePoints(STEM_SEGMENTS + 1),
    head: { x: baseX, y: baseY - STEM_LEN },
    berries: BERRIES.map(berry => ({ ...berry, pts: makePoints(BERRY_STEM_SEGMENTS + 1) })),
    blades: BLADES.map(blade => ({ ...blade, pts: makePoints(BLADE_SEGMENTS + 1) })),
    colors: buildColors(k),
    batch: PolyBatch.create(),
    frontBatch: PolyBatch.create(),
    grab: null,
    whisper: 0,
    whisperLevel: 0
  }
  k.add([
    k.z(ISLAND_Z),
    {
      draw() {
        drawIsland(inst)
      }
    }
  ])
  k.add([
    k.z(PLANT_Z),
    {
      update() {
        onUpdate(inst)
      },
      draw() {
        onDraw(inst)
      }
    }
  ])
  k.add([
    k.z(GRAB_FRONT_Z),
    {
      draw() {
        drawGrabFront(inst)
      }
    }
  ])
  return inst
}

/**
 * Turns the bush into a hunter: four front blades become tentacles aimed at
 * `prey`. From here on the plant is driven by tickGrab() (its own update
 * stops) so the grip and the hero move in the same frame.
 * @param {Object} inst - Eye-flower inst
 * @param {Object} prey - Hero body the tentacles hold, mutated by the caller
 * @param {number} prey.x - Body centre X
 * @param {number} prey.y - Body centre Y
 * @param {number} prey.scale - Hero sprite scale (band size)
 * @param {number} prey.angle - Body rotation in radians
 * @param {number} clipY - Ground line: tentacle parts below it are hidden once the pull starts
 */
export function startGrab(inst, prey, clipY) {
  if (inst.grab) return
  const side = prey.x >= inst.baseX ? 1 : -1
  inst.grab = {
    prey,
    clipY,
    clip: false,
    side,
    phase: GRAB_PHASE.AWARE,
    phaseTime: 0,
    time: 0,
    sinkTime: 0,
    tilt: { v: 0, vel: 0 },
    stretch: { v: 1, vel: 0 },
    aim: { x: inst.leanHero.x, y: inst.leanHero.y, vx: 0, vy: 0 },
    tentacles: GRAB_TENTACLES.map(spec => createTentacle(inst, spec, side))
  }
}

/**
 * Moves the grab to its next beat (see GRAB_PHASE); kicks the stem springs.
 * @param {Object} inst - Eye-flower inst
 * @param {string} phase - GRAB_PHASE value
 */
export function setGrabPhase(inst, phase) {
  const grab = inst.grab
  if (!grab || grab.phase === phase) return
  grab.phase = phase
  grab.phaseTime = 0
  grab.clip = phase === GRAB_PHASE.PULL || phase === GRAB_PHASE.RELEASE
  phase === GRAB_PHASE.STRIKE && (grab.tilt.vel += GRAB_STRIKE_TILT_KICK * grab.side)
  phase === GRAB_PHASE.PULL && (grab.tilt.vel += GRAB_PULL_TILT_KICK * grab.side)
  phase === GRAB_PHASE.RELEASE && grab.tentacles.forEach(releaseTentacle)
}

/**
 * True once every tentacle has caught the hero and mostly coiled around him.
 * @param {Object} inst - Eye-flower inst
 * @returns {boolean}
 */
export function isGrabHolding(inst) {
  return !!inst.grab?.tentacles.every(tent => tent.caught && tent.wrap >= GRAB_HOLDING_WRAP)
}

/**
 * Advances the grab by dt (fixed sub-steps) and rebuilds the plant pose.
 * Call after updating the prey position for this frame.
 * @param {Object} inst - Eye-flower inst
 * @param {number} dt - Frame time in seconds
 */
export function tickGrab(inst, dt) {
  const grab = inst.grab
  if (!grab || !inst.visible) return
  const step = Math.min(dt, GRAB_MAX_DT)
  grab.phaseTime += step
  grab.time += step
  const sinking = grab.phase === GRAB_PHASE.PULL || grab.phase === GRAB_PHASE.RELEASE
  sinking && (grab.sinkTime += step)
  if (grabSink(inst) >= GRAB_SINK_DEPTH) return
  for (let left = step; left > 0; left -= GRAB_STEP) stepGrab(inst, Math.min(GRAB_STEP, left))
  const t = inst.k.time()
  const releasing = grab.phase === GRAB_PHASE.RELEASE
  inst.whisperLevel = approach(inst.whisperLevel, inst.whisper, MOUTH_WHISPER_SPEED * step)
  inst.lean = approach(inst.lean, 1, GRAB_LEAN_SPEED * step)
  inst.open = approach(inst.open, releasing ? 0 : 1, (releasing ? GRAB_CLOSE_SPEED : GRAB_OPEN_SPEED) * step)
  inst.leanHero.x = grab.aim.x
  inst.leanHero.y = grab.aim.y
  const hero = { x: grab.prey.x, y: grab.prey.y }
  updateStem(inst, hero, t)
  inst.berries.forEach(berry => updateBerry(inst, berry, t))
  inst.blades.forEach(blade => !blade.tentacle && updateBlade(inst, blade, hero, t))
  grab.tentacles.forEach(tent => poseTentacle(inst, tent, t))
}

/**
 * Refreshes island visibility and parks / places its collider. The level
 * calls this before its own island checks: the plant's update runs after the
 * level's, so on a spawn right on the island the first frame would still see
 * no island and drown the hero.
 * @param {Object|null} inst - Eye-flower inst
 */
export function syncVisible(inst) {
  if (!inst) return
  inst.visible = inst.isVisible()
  inst.collider.pos.x = inst.visible ? inst.x1 : COLLIDER_HIDE_POS
  inst.collider.pos.y = inst.visible ? inst.colliderTopY : COLLIDER_HIDE_POS
}

/**
 * Island centre X: the island starts under the left frame and runs out into
 * the lake from its left edge.
 * @param {number} lakeX1 - Lake left edge
 * @returns {number}
 */
export function islandWorldX(lakeX1) {
  return lakeX1 - ISLAND_OFFSCREEN_W + ISLAND_W * 0.5
}

/**
 * World X where the island's east slope meets the water line, known before
 * the island exists so the lake bake can start shore ripples there.
 * @param {number} lakeX1 - Lake left edge X
 * @param {number} waterY - Lake surface Y
 * @returns {number}
 */
export function islandShoreWorldX(lakeX1, waterY) {
  return hillXWhereTopReaches(buildIslandHill(islandWorldX(lakeX1) - ISLAND_W * 0.5, waterY), waterY)
}

/**
 * Minimum centipede head X while the island exists: the crawler stops in the
 * water just east of it so a rider can hop over, never wading onto it.
 * @param {Object|null} inst - Eye-flower inst
 * @returns {number|null}
 */
export function predatorMinX(inst) {
  if (!inst?.visible) return null
  return inst.shoreX + PREDATOR_CLEAR_X
}

/**
 * True when the feet stand on the island top (lake checks must not drown him).
 * @param {Object|null} inst - Eye-flower inst
 * @param {number} footX - Feet world X
 * @param {number} footY - Feet world Y
 * @returns {boolean}
 */
export function isOnIsland(inst, footX, footY) {
  if (!inst?.visible) return false
  if (footX < inst.x1 - STAND_X_SLACK || footX > inst.colliderWalkX2 + STAND_X_SLACK) return false
  return isInIslandStandBand(inst, footY)
}

/**
 * True when the feet are anywhere over the island (collider top and the bank
 * up to the shore) at island height — the flower's grab trigger, regardless
 * of velocity or what he stands on.
 * @param {Object|null} inst - Eye-flower inst
 * @param {number} footX - Feet world X
 * @param {number} footY - Feet world Y
 * @returns {boolean}
 */
export function containsHero(inst, footX, footY) {
  if (!inst?.visible) return false
  if (footX < inst.x1 - STAND_X_SLACK || footX > inst.shoreX + BANK_BODY_REACH) return false
  return isInIslandStandBand(inst, footY)
}

/**
 * Right edge of the island collider when a hero with feet at footY would
 * hit its side instead of walking over it (null when he passes above/below).
 * @param {Object} inst - Eye-flower inst
 * @param {number} footY - Hero feet Y
 * @returns {number|null}
 */
export function sideWallX(inst, footY) {
  if (!inst?.visible) return null
  const topY = inst.colliderTopY
  if (footY <= topY || footY - SIDE_WALL_HERO_H >= topY + COLLIDER_H) return null
  return inst.colliderWalkX2
}

/**
 * Where something falling at world X comes to rest: the island ground (it
 * sinks lower along the mound's slope) or the lake surface past the shore.
 * Writes into `out` to stay allocation-free for per-frame particle checks.
 * @param {Object} inst - Eye-flower inst
 * @param {number} x - World X
 * @param {{y: number, water: boolean}} out - Receives the surface Y and whether it is water
 */
export function landingSurface(inst, x, out) {
  const groundY = soilLineY(inst, x)
  out.water = x > inst.x2 || groundY >= inst.waterY
  out.y = out.water ? inst.waterY : groundY
}

/**
 * Painted island soil line at world X (never below the lake surface).
 * @param {Object} inst - Eye-flower inst
 * @param {number} x - World X
 * @returns {number}
 */
export function soilLineY(inst, x) {
  return Math.min(inst.waterY, mossyHillTopY(inst.hill, Math.max(inst.x1, x)) + SOIL_LINE_DROP)
}

/**
 * Top of the island turf at world X (the mound outline above the soil line).
 * @param {Object} inst - Eye-flower inst
 * @param {number} x - World X
 * @returns {number}
 */
export function surfaceY(inst, x) {
  return Math.min(inst.waterY, mossyHillTopY(inst.hill, Math.max(inst.x1, x)))
}

/**
 * 0..1 whisper loudness for a hero at (x, y): rises as he nears the flower
 * head and peaks at the closest approach (same far/near band as before).
 * @param {Object|null} inst - Eye-flower inst
 * @param {number} x - World X
 * @param {number} y - World Y
 * @returns {number}
 */
export function whisperProximity(inst, x, y) {
  if (!inst?.visible) return 0
  const head = inst.head
  return smoothstep(WHISPER_FAR, WHISPER_NEAR, Math.hypot(x - head.x, y - head.y))
}

/**
 * Current whisper loudness (0..1, as played by the level) — drives the mouth.
 * @param {Object|null} inst - Eye-flower inst
 * @param {number} amount - 0 = silent, 1 = loudest
 */
export function setWhisper(inst, amount) {
  inst && (inst.whisper = amount)
}
/**
 * Rest pose of the flower head before gameplay lean (for spawn layout).
 * @param {number} lakeX1 - Lake left edge
 * @param {number} waterSurfaceY - Lake surface Y
 * @returns {{ x: number, y: number }}
 */
export function estimatePlantHeadWorldPos(lakeX1, waterSurfaceY) {
  const centreX = islandWorldX(lakeX1)
  const x1 = centreX - ISLAND_W * 0.5
  const hill = {
    x1,
    x2: x1 + ISLAND_W,
    floorY: waterSurfaceY + ISLAND_BELOW_WATER,
    height: ISLAND_ABOVE_WATER + ISLAND_BELOW_WATER,
    peakLeft: true,
    plateau: ISLAND_PLATEAU_FRAC
  }
  const baseX = x1 + PLANT_BASE_DX
  const baseY = mossyHillTopY(hill, baseX) + PLANT_BASE_SINK
  return { x: baseX, y: baseY - STEM_LEN }
}
/**
 * Minimum hero centre X on the ground line so plant whisper is silent.
 * @param {number} lakeX1 - Lake left edge
 * @param {number} waterSurfaceY - Lake surface Y
 * @param {number} heroY - Hero centre Y at spawn
 * @returns {number}
 */
export function minHeroXOutsidePlantWhisper(lakeX1, waterSurfaceY, heroY) {
  const head = estimatePlantHeadWorldPos(lakeX1, waterSurfaceY)
  const dy = heroY - head.y
  const absDy = Math.min(Math.abs(dy), WHISPER_FAR - 1)
  const minDx = Math.sqrt(WHISPER_FAR * WHISPER_FAR - absDy * absDy)
  return head.x + minDx + WHISPER_SPAWN_X_MARGIN
}

//
// Shows / hides the island, then leans the bush and animates stalk and berries.
//
function onUpdate(inst) {
  syncVisible(inst)
  if (!inst.visible || inst.grab) return
  const dt = inst.k.dt()
  const t = inst.k.time()
  const hero = inst.getHeroPos()
  const heroDist = hero ? Math.hypot(hero.x - inst.baseX, hero.y - inst.baseY) : Infinity
  inst.whisperLevel = approach(inst.whisperLevel, inst.whisper, MOUTH_WHISPER_SPEED * dt)
  inst.lean = approach(inst.lean, smoothstep(LEAN_FAR, LEAN_NEAR, heroDist), LEAN_SPEED * dt)
  tickLeanHeroAim(inst, hero, dt)
  const headDist = hero ? Math.hypot(hero.x - inst.head.x, hero.y - inst.head.y) : Infinity
  inst.open = approach(inst.open, smoothstep(OPEN_FAR, OPEN_NEAR, headDist), OPEN_SPEED * dt)
  updateStem(inst, hero, t)
  inst.berries.forEach(berry => updateBerry(inst, berry, t))
  inst.blades.forEach(blade => updateBlade(inst, blade, hero, t))
}

//
// Drooping rest arc blended with an upward-bowed arc whose tip stops just
// short of the hero, so the flower head reaches out to him.
//
function updateStem(inst, hero, t) {
  const sway = Math.sin(t * STEM_SWAY_SPEED) * STEM_SWAY_AMP
  const rest = { angle: -Math.PI / 2, bend: STEM_REST_BEND + sway, len: STEM_LEN, pow: STEM_BEND_POW }
  const gap = inst.grab ? GRAB_STEM_GAP : STEM_HERO_GAP
  const pose = blendArc(rest, leanArc(inst, inst.leanHero, inst.baseX, inst.baseY, 1, gap, STEM_LEN * LEAN_MIN_LEN_FRAC), inst.lean)
  if (inst.grab) {
    pose.angle += inst.grab.tilt.v
    pose.len *= inst.grab.stretch.v
  }
  fillArc(inst.stemPts, inst.baseX, inst.baseY, pose.angle, pose.bend, pose.pow, pose.len / STEM_SEGMENTS)
  const pts = inst.stemPts
  const tip = pts[STEM_SEGMENTS]
  if (inst.grab) {
    keepAboveGround(pts, inst.grab.clipY - GRAB_STEM_CLEAR)
    tip.y = Math.min(tip.y, inst.grab.clipY - GRAB_HEAD_CLEAR)
  }
  inst.head.x = tip.x
  inst.head.y = tip.y
}

//
// Berry stem: leaves the stalk at its `at` point, angled off the stalk's
// local heading, curling upward toward the berry.
//
function updateBerry(inst, berry, t) {
  const pts = inst.stemPts
  const f = Math.min(berry.at * STEM_SEGMENTS, STEM_SEGMENTS - 0.001)
  const i = Math.floor(f)
  const a = pts[i]
  const b = pts[i + 1]
  const u = f - i
  const heading = Math.atan2(b.y - a.y, b.x - a.x)
  const sway = Math.sin(t * BERRY_SWAY_SPEED + berry.phase) * BERRY_SWAY_AMP
  const curl = -Math.sign(berry.turn) * BERRY_STEM_CURL
  const x = a.x + (b.x - a.x) * u
  const y = a.y + (b.y - a.y) * u
  fillArc(berry.pts, x, y, heading + berry.turn + sway, curl, 1, berry.len / BERRY_STEM_SEGMENTS)
  inst.grab && keepAboveGround(berry.pts, inst.grab.clipY - GRAB_BERRY_CLEAR)
}

//
// Calla stem aim — toward the hero but never past the middle of the lake.
//
function stemLeanHeroTarget(inst, hero) {
  if (!hero) return null
  const maxX = inst.stemReachMaxX
  if (hero.x <= maxX) return hero
  const dx = hero.x - inst.baseX
  if (dx <= 1) return hero
  const t = (maxX - inst.baseX) / dx
  return { x: maxX, y: inst.baseY + (hero.y - inst.baseY) * t }
}
//
// Eases the lean aim toward the hero (capped stem target) or back to the root.
//
function tickLeanHeroAim(inst, hero, dt) {
  const step = LEAN_HERO_LAG_SPEED * dt
  let tx = inst.baseX
  let ty = inst.baseY
  if (hero) {
    const aim = stemLeanHeroTarget(inst, hero)
    tx = aim.x
    ty = aim.y
  }
  const lag = inst.leanHero
  lag.x = approach(lag.x, tx, step)
  lag.y = approach(lag.y, ty, step)
}
//
// Grass blade: a slightly curved rest pose blended toward a bowed arc that
// stretches over its share of the way to the hero.
//
function updateBlade(inst, blade, hero, t) {
  const rootX = inst.baseX + blade.dx
  const sway = Math.sin(t * BLADE_SWAY_SPEED + blade.phase) * BLADE_SWAY_AMP
  const rest = { angle: blade.angle + sway, bend: BLADE_REST_BEND * Math.sign(Math.cos(blade.angle)), len: blade.len, pow: 1 }
  const pose = blendArc(rest, leanArc(inst, inst.leanHero, rootX, inst.baseY, blade.reach, 0, blade.len * LEAN_MIN_LEN_FRAC), inst.lean * blade.follow)
  inst.grab && (pose.angle += inst.grab.tilt.v * GRAB_BLADE_TILT_FOLLOW)
  fillArc(blade.pts, rootX, inst.baseY, pose.angle, pose.bend, pose.pow, pose.len / BLADE_SEGMENTS)
}

//
// Tentacle state; its reach chain starts on the blade's current pose so the
// switch into hunting is seamless.
//
function createTentacle(inst, spec, side) {
  const blade = inst.blades[spec.bladeIndex]
  blade.tentacle = true
  const pts = blade.pts
  const segLen = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y)
  const chain = IkChain.create({ segments: GRAB_REACH_SEGMENTS, segLen, x: pts[0].x, y: pts[0].y })
  chain.pts.forEach((p, i) => {
    p.x = pts[i].x
    p.y = pts[i].y
  })
  const tip = pts[GRAB_REACH_SEGMENTS]
  return {
    ...spec,
    blade,
    chain,
    rest: makePoints(GRAB_REACH_SEGMENTS + 1),
    frontMask: new Array(BLADE_SEGMENTS).fill(false),
    rootX: inst.baseX + blade.dx,
    tip: { x: tip.x, y: tip.y, vx: 0, vy: 0 },
    len: { v: segLen * GRAB_REACH_SEGMENTS, vel: 0 },
    windupX: tip.x - side * GRAB_WINDUP_BACK * spec.windup,
    windupY: tip.y - GRAB_WINDUP_UP * spec.windup,
    restTipX: tip.x,
    restTipY: tip.y,
    caught: false,
    released: false,
    wrap: 0
  }
}

//
// Lets go: the coil unwinds and the tip drifts back to the blade's rest spot.
//
function releaseTentacle(tent) {
  const reach = tent.blade.len * GRAB_REACH_SEGMENTS / BLADE_SEGMENTS
  tent.caught = false
  tent.released = true
  tent.restTipX = tent.rootX + Math.cos(tent.blade.angle) * reach
  tent.restTipY = tent.blade.pts[0].y + Math.sin(tent.blade.angle) * reach
}

//
// One fixed sub-step of every grab spring: stem tilt / stretch, the aim the
// stem leans at, and each tentacle tip and length.
//
function stepGrab(inst, h) {
  const grab = inst.grab
  const body = GRAB_BODY[grab.phase]
  stepSpring(grab.tilt, body.tilt * grab.side, body.k, body.c, h)
  stepSpring(grab.stretch, body.stretch, body.k, body.c, h)
  grab.phase === GRAB_PHASE.HOLD && (grab.tilt.vel += (Math.random() - 0.5) * GRAB_HOLD_TREMBLE * h)
  stepSpring2D(grab.aim, grab.prey.x, Math.min(grab.prey.y, grab.clipY - GRAB_AIM_ABOVE_GROUND), GRAB_AIM_SPRING, h)
  grab.tentacles.forEach(tent => stepTentacle(inst, tent, h))
}

//
// Wind-up, curved strike, pinned grip with a tightening coil, or retreat.
// Once the hero is being hauled every tentacle holds (a late one snaps on).
//
function stepTentacle(inst, tent, h) {
  const grab = inst.grab
  const phase = grab.phase
  const hauling = phase === GRAB_PHASE.LIFT || phase === GRAB_PHASE.HOLD || phase === GRAB_PHASE.PULL
  hauling && !tent.caught && !tent.released && (tent.caught = true)
  coilPointInto(COIL_PT, inst, tent, 0)
  const tip = tent.tip
  if (tent.caught) {
    tent.wrap = Math.min(1, tent.wrap + h / GRAB_WRAP_SEC)
    tip.x = COIL_PT.x
    tip.y = COIL_PT.y
    tip.vx = 0
    tip.vy = 0
  } else if (tent.released) {
    tent.wrap = Math.max(0, tent.wrap - h / GRAB_UNWRAP_SEC)
    stepSpring2D(tip, tent.restTipX, tent.restTipY, GRAB_TIP_SPRING.release, h)
  } else if (phase === GRAB_PHASE.STRIKE && grab.phaseTime >= tent.delay) {
    strikeTentacle(inst, tent, h)
  } else {
    stepSpring2D(tip, tent.windupX, tent.windupY, GRAB_TIP_SPRING.windup, h)
  }
  const dist = Math.hypot(tip.x - tent.rootX, tip.y - inst.baseY)
  const restReach = tent.blade.len * GRAB_REACH_SEGMENTS / BLADE_SEGMENTS
  const target = tent.released ? restReach : Math.max(restReach * LEAN_MIN_LEN_FRAC, dist * GRAB_LEN_SLACK[phase])
  stepSpring(tent.len, target, GRAB_LEN_SPRING.k, GRAB_LEN_SPRING.c, h)
  tent.len.v = Math.max(tent.len.v, dist)
}

//
// Strike: the target slides onto the grip from a sideways offset (curved
// path), the stiff spring overshoots a touch, and the tip latches on.
//
function strikeTentacle(inst, tent, h) {
  const grab = inst.grab
  const since = grab.phaseTime - tent.delay
  const arcT = Math.min(1, since / GRAB_STRIKE_ARC_SEC)
  const gx = COIL_PT.x
  const gy = COIL_PT.y
  const ox = gx - tent.rootX
  const oy = gy - inst.baseY
  const d = Math.max(Math.hypot(ox, oy), 1)
  const off = -tent.bow * grab.side * GRAB_STRIKE_ARC_PX * (1 - arcT) * (1 - arcT)
  stepSpring2D(tent.tip, gx - oy / d * off, gy + ox / d * off, GRAB_TIP_SPRING.strike, h)
  const catchR = GRAB_CATCH_PX + Math.max(0, since - GRAB_STRIKE_ARC_SEC) * GRAB_CATCH_GROW_PER_SEC
  arcT >= 1 && Math.hypot(tent.tip.x - gx, tent.tip.y - gy) < catchR && (tent.caught = true)
}

//
// Point `s` (0 = where the tentacle meets the body, 1 = its tip) along the
// coil band around the hero, rotated with his body. `front` marks the half
// of the band that passes in front of him.
//
function coilPointInto(out, inst, tent, s) {
  const grab = inst.grab
  const prey = grab.prey
  const scale = prey.scale
  const wrapE = smoothstep(0, 1, tent.wrap)
  const hauling = grab.phase === GRAB_PHASE.LIFT || grab.phase === GRAB_PHASE.HOLD
  const pulse = hauling ? GRAB_SQUEEZE_PULSE * (0.5 + 0.5 * Math.sin(grab.time * GRAB_SQUEEZE_PULSE_SPEED + tent.blade.phase)) : 0
  const squeeze = 1 - GRAB_SQUEEZE * wrapE - pulse
  const a = (grab.side > 0 ? Math.PI : 0) + tent.wrapDir * s * GRAB_WRAP_SWEEP * wrapE
  const lx = Math.cos(a) * GRAB_BAND_RX * scale * squeeze
  const ly = (tent.bandDY + Math.sin(a) * GRAB_BAND_RY * squeeze + s * GRAB_BAND_SPIRAL * wrapE) * scale
  const cos = Math.cos(prey.angle)
  const sin = Math.sin(prey.angle)
  out.x = prey.x + lx * cos - ly * sin
  out.y = prey.y + lx * sin + ly * cos
  out.front = Math.sin(a) > 0
}

//
// Reach chain solved by IK toward the tip over a bowed rest arc (so it
// travels in curves, wobbling), then the last segments blend from a free
// continuation of the blade into the coil around the hero.
//
function poseTentacle(inst, tent, t) {
  const grab = inst.grab
  const chain = tent.chain
  const segLen = Math.max(1, tent.len.v / GRAB_REACH_SEGMENTS)
  const rootY = inst.baseY
  const tip = tent.tip
  IkChain.setSegLen(chain, segLen)
  const chord = Math.atan2(tip.y - rootY, tip.x - tent.rootX)
  const wobble = Math.sin(t * GRAB_WOBBLE_SPEED + tent.blade.phase) * GRAB_WOBBLE_AMP
  const bend = grab.side * tent.bow * GRAB_BOW[grab.phase] * (1 + wobble)
  fillArc(tent.rest, tent.rootX, rootY, chord - bend * 0.5, bend, 1, segLen)
  IkChain.solve(chain, tent.rootX, rootY, tip.x, tip.y, { rest: tent.rest, stiffness: GRAB_IK_STIFFNESS })
  const out = tent.blade.pts
  const cp = chain.pts
  for (let i = 0; i <= GRAB_REACH_SEGMENTS; i++) {
    out[i].x = cp[i].x
    out[i].y = cp[i].y
  }
  const end = cp[GRAB_REACH_SEGMENTS]
  const prev = cp[GRAB_REACH_SEGMENTS - 1]
  const before = cp[GRAB_REACH_SEGMENTS - 2]
  const dir = Math.atan2(end.y - prev.y, end.x - prev.x)
  const turn = angleDelta(Math.atan2(prev.y - before.y, prev.x - before.x), dir)
  const wrapE = smoothstep(0, 1, tent.wrap)
  let fx = end.x
  let fy = end.y
  for (let j = 1; j <= GRAB_WRAP_SEGMENTS; j++) {
    const s = j / GRAB_WRAP_SEGMENTS
    const a = dir + turn * j
    fx += Math.cos(a) * segLen
    fy += Math.sin(a) * segLen
    coilPointInto(COIL_PT, inst, tent, s)
    const w = Math.min(1, Math.max(0, 2 * wrapE - s))
    const p = out[GRAB_REACH_SEGMENTS + j]
    p.x = fx + (COIL_PT.x - fx) * w
    p.y = fy + (COIL_PT.y - fy) * w
    tent.frontMask[GRAB_REACH_SEGMENTS + j - 1] = COIL_PT.front && w > 0.5
  }
}

//
// Flattens any point that dipped below `maxY` back onto that line.
//
function keepAboveGround(pts, maxY) {
  pts.forEach(p => {
    p.y > maxY && (p.y = maxY)
  })
}

//
// Damped spring on a scalar { v, vel } (stiffness k, damping c).
//
function stepSpring(s, target, k, c, h) {
  s.vel += ((target - s.v) * k - s.vel * c) * h
  s.v += s.vel * h
}

function stepSpring2D(p, tx, ty, spring, h) {
  p.vx += ((tx - p.x) * spring.k - p.vx * spring.c) * h
  p.vy += ((ty - p.y) * spring.k - p.vy * spring.c) * h
  p.x += p.vx * h
  p.y += p.vy * h
}

//
// Arc from the root toward the hero, ending `share` of the way there minus
// `gap` (never past the big tree, never shorter than `minReach`). The bow
// always rises over the chord.
//
function leanArc(inst, hero, rootX, rootY, share, gap, minReach) {
  if (!hero) return null
  const dx = hero.x - rootX
  const dy = hero.y - rootY
  const dist = Math.max(Math.hypot(dx, dy), 1)
  let reach = dist * share - gap
  if (dx > 0) reach = Math.min(reach, (inst.reachLimitX - rootX) * dist / dx)
  reach = Math.max(minReach, reach)
  const aim = Math.atan2(dy, dx)
  const side = Math.cos(aim) >= 0 ? 1 : -1
  return {
    angle: aim - side * LEAN_ARC_HALF,
    bend: side * LEAN_ARC_HALF * 2,
    len: reach * LEAN_ARC_HALF / Math.sin(LEAN_ARC_HALF),
    pow: 1
  }
}

function blendArc(rest, lean, amount) {
  if (!lean || amount <= 0) return rest
  return {
    angle: rest.angle + angleDelta(rest.angle, lean.angle) * amount,
    bend: rest.bend + (lean.bend - rest.bend) * amount,
    len: rest.len + (lean.len - rest.len) * amount,
    pow: rest.pow + (lean.pow - rest.pow) * amount
  }
}

function onDraw(inst) {
  const sink = grabSink(inst)
  if (!inst.visible || sink >= GRAB_SINK_DEPTH) return
  const batch = inst.batch
  inst.blades.forEach(blade => addBlade(inst, blade))
  addStalk(inst)
  inst.berries.forEach(berry => addBerry(inst, berry))
  PolyBatch.flush(batch, inst.k, 1, sink, sinkFloorY(inst, sink))
}

//
// Eased-in depth the plant has sunk to (0 until the pull starts).
//
function grabSink(inst) {
  const grab = inst.grab
  if (!grab) return 0
  const u = Math.min(1, Math.max(0, (grab.sinkTime - GRAB_SINK_DELAY) / GRAB_SINK_SEC))
  return GRAB_SINK_DEPTH * u * u
}

function sinkFloorY(inst, sink) {
  return sink > 0 ? inst.grab.clipY : Infinity
}

//
// Red stalk and berry stems: every contour first, then every fill, so no
// contour cuts across the stalk where a stem branches off. A thin lit line
// runs up the stalk.
//
function addStalk(inst) {
  const { batch, colors: c, stemPts, berries } = inst
  addTaperedPass(batch, stemPts, STEM_W_BASE + CONTOUR_PAD, STEM_W_TIP + CONTOUR_PAD, c.contour)
  berries.forEach(berry => addTaperedPass(batch, berry.pts, BERRY_STEM_W_BASE + CONTOUR_PAD, BERRY_STEM_W_TIP + CONTOUR_PAD, c.contour))
  addTaperedPass(batch, stemPts, STEM_W_BASE, STEM_W_TIP, c.stem)
  berries.forEach(berry => addTaperedPass(batch, berry.pts, BERRY_STEM_W_BASE, BERRY_STEM_W_TIP, c.stem))
  addTaperedPass(batch, stemPts, STEM_W_BASE * STEM_LIGHT_FRAC, STEM_W_TIP * STEM_LIGHT_FRAC, c.stemLight)
}

//
// White eye-berry at the end of its stem: contour, shaded underside, lit
// face, then one dark pupil. Pupils drift down at rest, each a little
// differently, and swing onto the hero as the bush wakes; whispering dilates them.
//
function addBerry(inst, berry) {
  const { batch, colors: c } = inst
  const eye = berry.pts[BERRY_STEM_SEGMENTS]
  const r = berry.r
  const hero = inst.getHeroPos()
  const restLook = BERRY_REST_LOOK + Math.sin(berry.phase * 2) * BERRY_REST_LOOK_SPREAD
  const heroLook = hero ? Math.atan2(hero.y - eye.y, hero.x - eye.x) : restLook
  const look = restLook + angleDelta(restLook, heroLook) * inst.open
  const pupilR = r * BERRY_PUPIL_FRAC * (1 + whisperPulse(inst) * PUPIL_WHISPER_DILATE)
  addEyeBerry(batch, eye.x, eye.y, r, eye.x + Math.cos(look) * r * BERRY_LOOK_FRAC,
    eye.y + Math.sin(look) * r * BERRY_LOOK_FRAC, pupilR, c, BERRY_CONTOUR_W)
}

//
// 0..1 whisper beat this frame: whisper loudness times an uneven syllable
// beat (two detuned waves, silent whenever their sum dips below zero), only
// as far as the bush is awake.
//
function whisperPulse(inst) {
  if (inst.whisperLevel <= 0) return 0
  const t = inst.k.time()
  const beat = Math.sin(t * MOUTH_SYLLABLE_A) * MOUTH_SYLLABLE_A_W +
    Math.sin(t * MOUTH_SYLLABLE_B + MOUTH_SYLLABLE_B_PHASE) * MOUTH_SYLLABLE_B_W
  return inst.whisperLevel * inst.open * Math.min(1, Math.max(0, beat))
}

//
// Blade with a leaf-shaped width profile: contour, body, then a lit midrib.
//
function addBlade(inst, blade, batch = inst.batch, mask = null) {
  const c = inst.colors
  const clipY = inst.grab?.clip ? inst.grab.clipY : null
  addBladePass(batch, blade.pts, blade.w + CONTOUR_PAD, c.contour, clipY, mask)
  addBladePass(batch, blade.pts, blade.w, c.leaf, clipY, mask)
  addBladePass(batch, blade.pts, blade.w * BLADE_MIDRIB_FRAC, c.leafLight, clipY, mask)
}

//
// One width pass along the blade. `clipY` hides what went under the ground,
// `mask` keeps only the flagged segments (coils drawn over the hero).
//
function addBladePass(batch, pts, wMax, color, clipY = null, mask = null) {
  const last = pts.length - 1
  for (let i = 0; i < last; i++) {
    if (mask && !mask[i]) continue
    const seg = clipSegment(pts[i], pts[i + 1], clipY)
    if (!seg) continue
    const u = (i + 0.5) / last
    const w = wMax * Math.sin(Math.PI * (BLADE_ROOT_PHASE + (BLADE_TIP_PHASE - BLADE_ROOT_PHASE) * u))
    PolyBatch.addLine(batch, seg.ax, seg.ay, seg.bx, seg.by, w, color)
    !seg.cut && PolyBatch.addDisc(batch, seg.bx, seg.by, w * 0.5, color)
  }
}

//
// Segment a→b cut at the ground line (null when it is entirely below).
//
function clipSegment(a, b, clipY) {
  const seg = CLIP_SEG
  seg.ax = a.x
  seg.ay = a.y
  seg.bx = b.x
  seg.by = b.y
  seg.cut = false
  if (clipY == null) return seg
  const aBelow = a.y > clipY
  const bBelow = b.y > clipY
  if (aBelow && bBelow) return null
  if (!aBelow && !bBelow) return seg
  const f = (clipY - a.y) / (b.y - a.y)
  const cx = a.x + (b.x - a.x) * f
  if (bBelow) {
    seg.bx = cx
    seg.by = clipY
    seg.cut = true
  } else {
    seg.ax = cx
    seg.ay = clipY
  }
  return seg
}

//
// Coil segments that pass in front of the hero, drawn over him.
//
function drawGrabFront(inst) {
  const grab = inst.grab
  const sink = grabSink(inst)
  if (!inst.visible || !grab || sink >= GRAB_SINK_DEPTH) return
  grab.tentacles.forEach(tent => tent.wrap > 0 && addBlade(inst, tent.blade, inst.frontBatch, tent.frontMask))
  PolyBatch.flush(inst.frontBatch, inst.k, 1, sink, sinkFloorY(inst, sink))
}

function drawIsland(inst) {
  if (!inst.visible) return
  const baked = ensureStaticDecorSprite(inst.k, inst, ISLAND_BAKE_SLOT, ISLAND_BAKE_KEY, islandBounds(inst),
    ctx => paintIsland(ctx, inst), ISLAND_BAKE_SEED)
  drawStaticDecorSprite(inst.k, baked)
}

function islandBounds(inst) {
  const hillBounds = mossyHillBounds(inst.hill, ISLAND_DECOR_UP)
  return {
    x1: hillBounds.x1 - ISLAND_BAKE_PAD,
    y1: hillBounds.y1,
    x2: hillBounds.x2 + ISLAND_BAKE_PAD,
    y2: Math.min(hillBounds.y2 + ISLAND_BAKE_PAD, inst.waterY + ISLAND_SEAM_BELOW_WATER + SoilSeam.seamFringeMaxOffset())
  }
}

//
// Where the island's rock gives way to the soil: rounded tongues like the
// topsoil/subsoil seam, kept below the ground line. Towards the shore it eases
// up to just under the water line, so no cut-off underwater mound shows
// through the see-through lake.
//
function islandSeamY(inst, x) {
  const soilY = inst.waterY + ISLAND_SEAM_BELOW_WATER + SoilSeam.seamFringeOffset(x, ISLAND_SEAM_INDEX)
  const shoreT = Math.max(0, Math.min(1, (x - inst.shoreX + ISLAND_SEAM_SHORE_BLEND) / ISLAND_SEAM_SHORE_BLEND))
  return soilY + (inst.waterY + ISLAND_BAKE_BELOW_WATER - soilY) * shoreT
}

//
// Erases everything under the seam (the bake has no grain yet at this point).
//
function cutIslandSeam(ctx, inst) {
  const x1 = inst.hill.x1 - ISLAND_BAKE_PAD
  const x2 = inst.hill.x2 + ISLAND_BAKE_PAD
  const bottomY = inst.waterY + ISLAND_SEAM_BELOW_WATER + SoilSeam.seamFringeMaxOffset() + ISLAND_BAKE_PAD
  ctx.save()
  ctx.globalCompositeOperation = 'destination-out'
  ctx.beginPath()
  ctx.moveTo(x1, islandSeamY(inst, x1))
  for (let x = x1 + 1; x <= x2; x++) ctx.lineTo(x, islandSeamY(inst, x))
  ctx.lineTo(x2, bottomY)
  ctx.lineTo(x1, bottomY)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

//
// Mossy boulder hill (same painter and colours as the hill right of the tree),
// then plumes, tufts, ferns and mushrooms rooted on its top line.
//
function paintIsland(ctx, inst) {
  const rng = createSeededRandom(ISLAND_BAKE_SEED)
  const colors = forestFloorPainterColors()
  const greeneryMaxY = inst.waterY - ISLAND_GREENERY_ABOVE_WATER
  const rootY = x => mossyHillTopY(inst.hill, x)
  const dryRootY = x => {
    const y = rootY(x)
    return y < greeneryMaxY ? y : null
  }
  drawMossyHillToCanvas(ctx, {
    hill: inst.hill,
    rng,
    colors: colors.hill,
    greeneryMaxY
  })
  cutIslandSeam(ctx, inst)
  const lakeX1 = inst.x1 + ISLAND_OFFSCREEN_W
  ISLAND_PLANTS.filter(p => p.kind === KIND.PLUME).forEach(p => {
    const baseY = dryRootY(lakeX1 + p.dx)
    baseY != null &&
      drawFeatherPlumeToCanvas(ctx, { x: lakeX1 + p.dx, baseY, height: p.size, rng: createSeededRandom(nextSeed(rng)), colors: colors.plume })
  })
  for (let x = inst.x1 + ISLAND_TUFT_STEP; x < inst.walkX2; x += ISLAND_TUFT_STEP) {
    const baseY = dryRootY(x)
    baseY != null && rng() < ISLAND_TUFT_CHANCE &&
      drawGrassTuftToCanvas(ctx, { x, baseY, rng, colors: colors.tuft })
  }
  ISLAND_PLANTS.filter(p => p.kind === KIND.FERN).forEach(p => {
    const baseY = dryRootY(lakeX1 + p.dx)
    baseY != null &&
      drawFernToCanvas(ctx, { x: lakeX1 + p.dx, baseY, size: p.size, rng: createSeededRandom(nextSeed(rng)), colors: colors.fern })
  })
  ISLAND_PLANTS.filter(p => p.kind === KIND.MUSHROOMS).forEach(p => {
    const baseY = dryRootY(lakeX1 + p.dx)
    baseY != null &&
      drawSmallMushroomGroupToCanvas(ctx, { x: lakeX1 + p.dx, baseY, rng: createSeededRandom(nextSeed(rng)), colors: colors.mushroom })
  })
}

//
// Mossy hill shape of the island whose left edge is `x1`.
//
function buildIslandHill(x1, waterY) {
  return {
    x1,
    x2: x1 + ISLAND_W,
    floorY: waterY + ISLAND_BELOW_WATER,
    height: ISLAND_ABOVE_WATER + ISLAND_BELOW_WATER,
    peakLeft: true,
    plateau: ISLAND_PLATEAU_FRAC
  }
}

//
// First X (walking right from the crest) where the hill top sinks to `y`.
//
function hillXWhereTopReaches(hill, y) {
  for (let x = hill.x1; x <= hill.x2; x += ISLAND_SAMPLE_STEP) {
    if (mossyHillTopY(hill, x) >= y) return x
  }
  return hill.x2
}

//
// Fills `out` with an arc of equal segments whose heading turns by `bend`
// from root to tip (eased by `pow` so the curl gathers near the tip).
//
function fillArc(out, x, y, angle, bend, pow, segLen) {
  const last = out.length - 1
  out[0].x = x
  out[0].y = y
  for (let i = 1; i <= last; i++) {
    const a = angle + bend * Math.pow((i - 0.5) / last, pow)
    out[i].x = out[i - 1].x + Math.cos(a) * segLen
    out[i].y = out[i - 1].y + Math.sin(a) * segLen
  }
}

function buildColors(k) {
  const pal = GLOW_PAL.glowEyeFlower
  const keys = ['contour', 'berry', 'berryShade', 'pupil', 'stem', 'stemLight', 'leaf', 'leafLight']
  return Object.fromEntries(keys.map(key => [key, kaplayRgb(k, pal[key])]))
}

function kaplayRgb(k, hex) {
  const c = glowRgb(hex)
  return k.rgb(c.r, c.g, c.b)
}

function makePoints(count) {
  return Array.from({ length: count }, () => ({ x: 0, y: 0 }))
}

//
// The collider sits at the waterline but the painted crest (and the stick a
// rider docks with) is higher — feet anywhere from the crest down count.
//
function isInIslandStandBand(inst, footY) {
  return footY >= inst.topY - STAND_ABOVE && footY <= inst.colliderTopY + STAND_BELOW
}

function smoothstep(edge0, edge1, v) {
  const u = Math.min(1, Math.max(0, (v - edge0) / (edge1 - edge0)))
  return u * u * (3 - 2 * u)
}

function approach(v, target, step) {
  return v < target ? Math.min(target, v + step) : Math.max(target, v - step)
}

function angleDelta(from, to) {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from))
}
