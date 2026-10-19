import { CFG } from '../../../cfg.js'
import * as IkChain from '../../../utils/ik-chain.js'
import * as PolyBatch from '../../../utils/poly-batch.js'
import { createSeededRandom, nextSeed } from '../../../utils/seeded-random.js'
import { drawFernToCanvas } from '../../../utils/draw-fern.js'
import { drawFeatherPlumeToCanvas } from '../../../utils/draw-feather-plume.js'
import { drawGrassTuftToCanvas } from '../../../utils/draw-grass-tuft.js'
import { drawMossyHillToCanvas, mossyHillBounds, mossyHillTopY } from '../../../utils/draw-mossy-hill.js'
import { drawSmallMushroomGroupToCanvas } from '../../../utils/draw-small-mushroom.js'
import { GLOW_PAL, glowRgb } from '../utils/glow-palette.js'
import { drawStaticDecorSprite, ensureStaticDecorSprite } from '../utils/glow-static-bake.js'
import { forestFloorPainterColors } from './forest-floor.js'

//
// Hill island in the left lake carrying a calla bush: a cream spathe whose
// spadix holds a watching eye, a few closed buds and long grass blades. The
// closer the hero comes, the harder the whole bush bends and stretches to him.
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
const ISLAND_BAKE_KEY = 'v7'
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
// Walkable box extends past the hill crest on the right and sits slightly lower
// than the baked top line so landings feel grounded on the slope.
//
const COLLIDER_EXTEND_RIGHT = 52
const COLLIDER_DROP = 14
const COLLIDER_HIDE_POS = -5000
const STAND_X_SLACK = 6
const STAND_ABOVE = 14
const STAND_BELOW = 14
//
// Past the collider the hero still visibly lands on the bank while his body
// overlaps the painted shore (feet up to this far beyond it).
//
const BANK_BODY_REACH = 14
//
// Hero body height: feet below the collider top by less than this put the
// body against the collider's right side.
//
const SIDE_WALL_HERO_H = 74
//
// Open water kept between the island edge and a swimming centipede's head.
//
const PREDATOR_CLEAR_X = 28
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
// flower head stops just short of the hero (spathe + eye + a small gap).
//
const STEM_SEGMENTS = 14
const STEM_LEN = 156
const STEM_REST_BEND = 2
const STEM_BEND_POW = 1.6
const STEM_SWAY_AMP = 0.08
const STEM_SWAY_SPEED = 0.9
const STEM_HERO_GAP = 104
//
// Main calla stem — at full lean its tip stops at this fraction of the lake
// width (blades may reach farther; whisper still uses hero-to-head distance).
//
const STEM_LAKE_REACH_FRAC = 0.5
const STEM_W_BASE = 6
const STEM_W_TIP = 4
const CONTOUR_PAD = 2
//
// Bud spathe in its own frame (u along the stem axis, v across it): a slim
// furled funnel with a curled point.
//
const SPATHE_SHAPE = [[0, 0], [0.12, 0.16], [0.4, 0.42], [0.7, 0.6], [0.92, 0.5], [1.02, 0.28], [1.06, 0], [1.14, -0.35], [1.22, -0.75], [1.32, -1.05], [1, -1], [0.7, -0.82], [0.42, -0.5], [0.15, -0.18]]
const HOOK_PATH = [[1.22, -0.75], [1.32, -1.05], [1.25, -1.22], [1.12, -1.14]]
const HOOK_W_BASE = 3
const HOOK_W_TIP = 1.2
//
// Flower head: two broad calla petals hinged at the stem tip, the eye on its
// spadix between them. Each petal lives in its own frame (u along its spine,
// v away from the head axis); the inner edge reaches over the axis so the
// closed pair hides the eye, and the wide outer edge is the cream lobe with a
// pink cupped face. The petal tip curls outward like the reference calla.
//
const FLOWER_LEN = 60
const FLOWER_TURN = 0.7
const PETAL_HALF_W = 26
const PETAL_SHAPE = [[0, 0], [0.15, 0.35], [0.4, 0.85], [0.65, 1], [0.85, 0.8], [1, 0.42], [1.08, 0.05], [0.95, -0.22], [0.7, -0.4], [0.42, -0.42], [0.18, -0.25]]
const PETAL_FACE_SHAPE = [[0.08, 0], [0.22, 0.28], [0.42, 0.66], [0.64, 0.78], [0.82, 0.6], [0.94, 0.28], [0.98, 0.04], [0.86, -0.12], [0.64, -0.24], [0.4, -0.26], [0.2, -0.14]]
const PETAL_HOOK_PATH = [[1.04, 0.24], [1.16, 0.4], [1.2, 0.62], [1.1, 0.74]]
//
// Spread of each petal off the head axis (radians): nearly shut while the
// hero is far, wide apart as he comes close.
//
const PETAL_SPREAD_CLOSED = 0.04
const PETAL_SPREAD_OPEN = 0.72
const THROAT_SHOW = 0.05
const THROAT_U = [0.45, 0.9]
//
// Whispering: the petals flap apart and back in an uneven, syllable-like
// rhythm, as wide as the whisper is loud.
//
const MOUTH_SPREAD = 0.22
const MOUTH_SYLLABLE_A = 9.3
const MOUTH_SYLLABLE_B = 14.1
const MOUTH_SYLLABLE_B_PHASE = 1.7
const MOUTH_SYLLABLE_A_W = 0.55
const MOUTH_SYLLABLE_B_W = 0.45
const MOUTH_WHISPER_SPEED = 3
//
// Openness follows distance from hero to the flower head (far = closed).
//
const OPEN_FAR = 850
const OPEN_NEAR = 450
const OPEN_SPEED = 1.2
//
// Eye on the yellow spadix: tucked between the shut petals, it slides out
// along the head axis as they part, staying centred between them.
//
const EYE_STALK_SEGMENTS = 3
const EYE_ORIGIN_FRAC = 0.1
const EYE_HIDDEN_EXT = 20
const EYE_OUT_EXT = 34
const EYE_OUT_FROM = 0.35
const EYE_TURN = 0.2
const EYE_STALK_SLACK = 0.92
const EYE_STALK_STIFFNESS = 0.4
const EYE_STALK_W = 4
const EYE_R = 9
const EYE_IRIS_FRAC = 0.58
const EYE_PUPIL_FRAC = 0.32
const EYE_LOOK_FRAC = 0.35
const EYE_GLINT_FRAC = 0.18
const EYE_CONTOUR_W = 1.5
//
// Closed side buds on their own stems, like the reference plant: one droops
// left, one stands up, one droops right.
//
const BUDS = [
  { dx: -12, angle: -1.95, bend: -1.5, len: 118, size: 0.6, phase: 0.6 },
  { dx: -2, angle: -1.62, bend: 0.3, len: 146, size: 0.5, phase: 2.1 },
  { dx: 12, angle: -1.25, bend: 1.7, len: 102, size: 0.55, phase: 1.2 }
]
const BUD_LEN = 52
const BUD_HALF_W = 30
const BUD_SEGMENTS = 8
const BUD_BEND_POW = 1.8
const BUD_WIDTH = 0.38
const BUD_SWAY_AMP = 0.06
const BUD_SWAY_SPEED = 1
const BUD_STEM_W_BASE = 4
const BUD_STEM_W_TIP = 3
//
// Buds turn only part of the way toward the hero.
//
const BUD_LEAN_FOLLOW = 0.3
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
// line, and stem, head, eye and buds are held above it (the lake under the
// island is see-through).
//
const GRAB_AIM_ABOVE_GROUND = 44
const GRAB_STEM_CLEAR = 4
const GRAB_HEAD_CLEAR = 34
const GRAB_EYE_CLEAR = EYE_R + 4
const GRAB_BUD_CLEAR = 14
const GRAB_STEM_GAP = 64
const GRAB_LEAN_SPEED = 2.5
const GRAB_OPEN_SPEED = 3.2
const GRAB_CLOSE_SPEED = 0.7
const GRAB_BLADE_TILT_FOLLOW = 0.6
const GRAB_BUD_TILT_FOLLOW = 0.4
//
// Coils that pass in front of the hero draw over him.
//
const GRAB_FRONT_Z = CFG.visual.zIndex.player + 0.5
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
  const hill = {
    x1,
    x2,
    floorY: waterY + ISLAND_BELOW_WATER,
    height: ISLAND_ABOVE_WATER + ISLAND_BELOW_WATER,
    peakLeft: true,
    plateau: ISLAND_PLATEAU_FRAC
  }
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
    eyeStalk: IkChain.create({ segments: EYE_STALK_SEGMENTS, segLen: EYE_HIDDEN_EXT / EYE_STALK_SEGMENTS, x: baseX, y: baseY }),
    eyeRest: makePoints(EYE_STALK_SEGMENTS + 1),
    head: { x: baseX, y: baseY - STEM_LEN, axis: 0, eyeOut: 0 },
    buds: BUDS.map(bud => ({ ...bud, pts: makePoints(BUD_SEGMENTS + 1) })),
    blades: BLADES.map(blade => ({ ...blade, pts: makePoints(BLADE_SEGMENTS + 1) })),
    colors: buildColors(k),
    hookPts: makePoints(HOOK_PATH.length),
    petalHookPts: makePoints(PETAL_HOOK_PATH.length),
    spatheIdx: fanIndices(SPATHE_SHAPE.length),
    petalIdx: fanIndices(PETAL_SHAPE.length),
    petalFaceIdx: fanIndices(PETAL_FACE_SHAPE.length),
    throatShape: [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0]],
    throatIdx: fanIndices(5),
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
  updateEyeStalk(inst, hero)
  inst.buds.forEach(bud => updateBud(inst, bud, hero, t))
  inst.blades.forEach(blade => !blade.tentacle && updateBlade(inst, blade, hero, t))
  grab.tentacles.forEach(tent => poseTentacle(inst, tent, t))
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
  const topY = inst.colliderTopY
  return footY >= topY - STAND_ABOVE && footY <= topY + STAND_BELOW
}

/**
 * True when the feet come down on the bank right of the collider, where the
 * body still overlaps the painted shore (the collider itself is too short
 * to catch him there, so he would drop into the lake).
 * @param {Object|null} inst - Eye-flower inst
 * @param {number} footX - Feet world X
 * @param {number} footY - Feet world Y
 * @returns {boolean}
 */
export function isOnIslandBank(inst, footX, footY) {
  if (!inst?.visible) return false
  if (footX <= inst.colliderWalkX2 || footX > inst.shoreX + BANK_BODY_REACH) return false
  const topY = inst.colliderTopY
  return footY >= topY - STAND_ABOVE && footY <= topY + STAND_BELOW
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
  const groundY = mossyHillTopY(inst.hill, Math.max(inst.x1, x)) + COLLIDER_DROP
  out.water = x > inst.x2 || groundY >= inst.waterY
  out.y = out.water ? inst.waterY : groundY
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
// Shows / hides the island, then leans the bush and animates stem, eye and buds.
//
function onUpdate(inst) {
  inst.visible = inst.isVisible()
  inst.collider.pos.x = inst.visible ? inst.x1 : COLLIDER_HIDE_POS
  inst.collider.pos.y = inst.visible ? inst.colliderTopY : COLLIDER_HIDE_POS
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
  updateEyeStalk(inst, hero)
  inst.buds.forEach(bud => updateBud(inst, bud, hero, t))
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
  const prev = pts[STEM_SEGMENTS - 1]
  const stemAngle = Math.atan2(tip.y - prev.y, tip.x - prev.x)
  const aim = inst.leanHero
  const heroAngle = Math.atan2(aim.y - tip.y, aim.x - tip.x)
  inst.head.x = tip.x
  inst.head.y = tip.y
  inst.head.axis = stemAngle + angleDelta(stemAngle, heroAngle) * inst.open * FLOWER_TURN
}

//
// Spadix bends from the spathe axis toward the hero as it rises out.
//
function updateEyeStalk(inst, hero) {
  const head = inst.head
  head.eyeOut = smoothstep(EYE_OUT_FROM, 1, inst.open)
  const ext = EYE_HIDDEN_EXT + (EYE_OUT_EXT - EYE_HIDDEN_EXT) * head.eyeOut
  const ox = head.x + Math.cos(head.axis) * FLOWER_LEN * EYE_ORIGIN_FRAC
  const oy = head.y + Math.sin(head.axis) * FLOWER_LEN * EYE_ORIGIN_FRAC
  const heroAngle = hero ? Math.atan2(hero.y - oy, hero.x - ox) : head.axis
  const aim = head.axis + angleDelta(head.axis, heroAngle) * head.eyeOut * EYE_TURN
  const segLen = ext / EYE_STALK_SEGMENTS
  IkChain.setSegLen(inst.eyeStalk, segLen)
  fillArc(inst.eyeRest, ox, oy, head.axis, 0, 1, segLen)
  IkChain.solve(inst.eyeStalk, ox, oy, ox + Math.cos(aim) * ext * EYE_STALK_SLACK, oy + Math.sin(aim) * ext * EYE_STALK_SLACK, {
    rest: inst.eyeRest,
    stiffness: EYE_STALK_STIFFNESS
  })
  inst.grab && keepAboveGround(inst.eyeStalk.pts, inst.grab.clipY - GRAB_EYE_CLEAR)
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
function updateBud(inst, bud, hero, t) {
  const rootX = inst.baseX + bud.dx
  const sway = Math.sin(t * BUD_SWAY_SPEED + bud.phase) * BUD_SWAY_AMP
  const aim = inst.leanHero
  const heroAngle = Math.atan2(aim.y - inst.baseY, aim.x - rootX)
  const recoil = inst.grab ? inst.grab.tilt.v * GRAB_BUD_TILT_FOLLOW : 0
  const angle = bud.angle + sway + recoil + angleDelta(bud.angle, heroAngle) * inst.lean * BUD_LEAN_FOLLOW
  fillArc(bud.pts, rootX, inst.baseY, angle, bud.bend, BUD_BEND_POW, bud.len / BUD_SEGMENTS)
  inst.grab && keepAboveGround(bud.pts, inst.grab.clipY - GRAB_BUD_CLEAR)
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
  const { batch, colors: c } = inst
  inst.buds.forEach(bud => addBud(inst, bud))
  inst.blades.forEach(blade => addBlade(inst, blade))
  addTaperedPath(batch, inst.stemPts, STEM_W_BASE, STEM_W_TIP, c.contour, c.stem)
  addFlower(inst)
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
// Thin stem ending in a furled spathe (no throat, no eye).
//
function addBud(inst, bud) {
  const c = inst.colors
  addTaperedPath(inst.batch, bud.pts, BUD_STEM_W_BASE, BUD_STEM_W_TIP, c.contour, c.stem)
  const tip = bud.pts[BUD_SEGMENTS]
  const prev = bud.pts[BUD_SEGMENTS - 1]
  const axis = Math.atan2(tip.y - prev.y, tip.x - prev.x)
  addSpathe(inst, tip.x, tip.y, axis, BUD_LEN * bud.size, BUD_HALF_W * bud.size * BUD_WIDTH, c.petalShade)
}

//
// Pink throat between the parted petals, spadix + eye on it, then the back
// (upper) petal and the front (lower) one. Shut, the petals cover the eye;
// drawn after it, they never hide it once parted.
//
function addFlower(inst) {
  const { head, colors: c } = inst
  const side = spatheSide(head.axis)
  const spread = PETAL_SPREAD_CLOSED + (PETAL_SPREAD_OPEN - PETAL_SPREAD_CLOSED) * inst.open +
    MOUTH_SPREAD * mouthOpen(inst)
  inst.open > THROAT_SHOW && addThroat(inst, spread)
  addEye(inst)
  addPetal(inst, -side, spread, c.petal)
  addPetal(inst, side, spread, c.petalShade)
}

//
// One petal turned `dir * spread` off the head axis; v points away from the
// axis on its side, so the inner edge reaches back across it.
//
function addPetal(inst, dir, spread, rimColor) {
  const { head, colors: c, batch } = inst
  const angle = head.axis + dir * spread
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const sy = dir * PETAL_HALF_W
  const padSy = dir * (PETAL_HALF_W + CONTOUR_PAD)
  PolyBatch.addShape(batch, PETAL_SHAPE, inst.petalIdx, head.x - cos * CONTOUR_PAD, head.y - sin * CONTOUR_PAD,
    FLOWER_LEN + CONTOUR_PAD * 2, padSy, cos, sin, c.contour)
  PolyBatch.addShape(batch, PETAL_SHAPE, inst.petalIdx, head.x, head.y, FLOWER_LEN, sy, cos, sin, rimColor)
  PolyBatch.addShape(batch, PETAL_FACE_SHAPE, inst.petalFaceIdx, head.x, head.y, FLOWER_LEN, sy, cos, sin, c.petalInner)
  mapPath(inst.petalHookPts, PETAL_HOOK_PATH, head.x, head.y, FLOWER_LEN, sy, cos, sin)
  addTaperedPath(batch, inst.petalHookPts, HOOK_W_BASE, HOOK_W_TIP, c.contour, rimColor)
}

//
// Wedge between the two petal spines (head frame), behind the eye.
//
function addThroat(inst, spread) {
  const { head, colors: c } = inst
  const shape = inst.throatShape
  const cosS = Math.cos(spread)
  const sinS = Math.sin(spread)
  shape[1][0] = THROAT_U[0] * cosS
  shape[1][1] = -THROAT_U[0] * sinS
  shape[2][0] = THROAT_U[1] * cosS
  shape[2][1] = -THROAT_U[1] * sinS
  shape[3][0] = THROAT_U[1] * cosS
  shape[3][1] = THROAT_U[1] * sinS
  shape[4][0] = THROAT_U[0] * cosS
  shape[4][1] = THROAT_U[0] * sinS
  PolyBatch.addShape(inst.batch, shape, inst.throatIdx, head.x, head.y, FLOWER_LEN, FLOWER_LEN,
    Math.cos(head.axis), Math.sin(head.axis), c.petalInner)
}

//
// 0..1 mouth opening this frame: whisper loudness times an uneven syllable
// beat (two detuned waves, closed whenever their sum dips below zero), only
// as far as the spathe itself is open.
//
function mouthOpen(inst) {
  if (inst.whisperLevel <= 0) return 0
  const t = inst.k.time()
  const beat = Math.sin(t * MOUTH_SYLLABLE_A) * MOUTH_SYLLABLE_A_W +
    Math.sin(t * MOUTH_SYLLABLE_B + MOUTH_SYLLABLE_B_PHASE) * MOUTH_SYLLABLE_B_W
  return inst.whisperLevel * inst.open * Math.min(1, Math.max(0, beat))
}

//
// Contoured bud spathe plus its curled point. The long lip always faces up,
// whichever way the axis points.
//
function addSpathe(inst, x, y, axis, len, halfW, color, shape = SPATHE_SHAPE) {
  const { colors: c, batch } = inst
  const side = spatheSide(axis)
  const cos = Math.cos(axis)
  const sin = Math.sin(axis)
  PolyBatch.addShape(batch, shape, inst.spatheIdx, x - cos * CONTOUR_PAD, y - sin * CONTOUR_PAD,
    len + CONTOUR_PAD * 2, (halfW + CONTOUR_PAD) * side, cos, sin, c.contour)
  PolyBatch.addShape(batch, shape, inst.spatheIdx, x, y, len, halfW * side, cos, sin, color)
  mapPath(inst.hookPts, HOOK_PATH, x, y, len, halfW * side, cos, sin)
  addTaperedPath(batch, inst.hookPts, HOOK_W_BASE, HOOK_W_TIP, c.contour, color)
}

function addEye(inst) {
  const c = inst.colors
  const batch = inst.batch
  const pts = inst.eyeStalk.pts
  addTaperedPath(batch, pts, EYE_STALK_W, EYE_STALK_W, c.spadixDark, c.spadix)
  const eye = pts[pts.length - 1]
  const hero = inst.getHeroPos()
  const lookAngle = hero ? Math.atan2(hero.y - eye.y, hero.x - eye.x) : inst.head.axis
  const lookX = eye.x + Math.cos(lookAngle) * EYE_R * EYE_LOOK_FRAC
  const lookY = eye.y + Math.sin(lookAngle) * EYE_R * EYE_LOOK_FRAC
  PolyBatch.addDisc(batch, eye.x, eye.y, EYE_R + EYE_CONTOUR_W, c.contour)
  PolyBatch.addDisc(batch, eye.x, eye.y, EYE_R, c.sclera)
  PolyBatch.addDisc(batch, lookX, lookY, EYE_R * EYE_IRIS_FRAC, c.iris)
  PolyBatch.addDisc(batch, lookX, lookY, EYE_R * EYE_PUPIL_FRAC, c.pupil)
  PolyBatch.addDisc(batch, lookX - EYE_R * EYE_GLINT_FRAC, lookY - EYE_R * EYE_GLINT_FRAC, EYE_R * EYE_GLINT_FRAC, c.sclera)
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

//
// Round-jointed tapered polyline: a contour pass under a fill pass.
//
function addTaperedPath(batch, pts, wBase, wTip, contour, fill) {
  addTaperedPass(batch, pts, wBase + CONTOUR_PAD, wTip + CONTOUR_PAD, contour)
  addTaperedPass(batch, pts, wBase, wTip, fill)
}

function addTaperedPass(batch, pts, wBase, wTip, color) {
  const last = pts.length - 1
  for (let i = 0; i < last; i++) {
    const w = wBase + (wTip - wBase) * (i / last)
    PolyBatch.addLine(batch, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y, w, color)
    PolyBatch.addDisc(batch, pts[i + 1].x, pts[i + 1].y, w * 0.5, color)
  }
}

//
// Places a local (u, v) path into world points, same transform as addShape.
//
function mapPath(out, path, x, y, sx, sy, cos, sin) {
  path.forEach(([u, v], i) => {
    const px = u * sx
    const py = v * sy
    out[i].x = x + px * cos - py * sin
    out[i].y = y + px * sin + py * cos
  })
}

//
// Negative v is "up" for an axis pointing right; mirror it for a left axis.
//
function spatheSide(axis) {
  return Math.cos(axis) >= 0 ? 1 : -1
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
    y2: hillBounds.y2 + ISLAND_BAKE_PAD
  }
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
  const keys = ['contour', 'petal', 'petalShade', 'petalInner', 'spadix', 'spadixDark', 'sclera', 'iris', 'pupil', 'stem', 'leaf', 'leafLight']
  return Object.fromEntries(keys.map(key => [key, kaplayRgb(k, pal[key])]))
}

function kaplayRgb(k, hex) {
  const c = glowRgb(hex)
  return k.rgb(c.r, c.g, c.b)
}

function fanIndices(count) {
  const out = []
  for (let i = 1; i < count - 1; i++) out.push(0, i, i + 1)
  return out
}

function makePoints(count) {
  return Array.from({ length: count }, () => ({ x: 0, y: 0 }))
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
