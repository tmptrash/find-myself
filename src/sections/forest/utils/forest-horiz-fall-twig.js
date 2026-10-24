import { CFG } from '../../../cfg.js'
import { FOREST_PAL, getTreePaletteColor, forestRgb } from './forest-palette.js'
import * as PolyBatch from '../../../utils/poly-batch.js'
import { predatorBackCatchPoint } from '../components/predator.js'
import * as EyeFlower from '../components/eye-flower.js'
import { beginIslandShoreRetreat } from '../components/predator-move.js'
import { samplePredatorSpineHitPoints } from '../components/predator-body.js'

//
// Dry twigs hung under the shore tree's horizontal branch — they drop on the
// second hero landing on that branch, then regrow after a pause with fade-in.
//
const TWIG_ATTACH_BELOW_BRANCH = 5
const TWIG_MAIN_LEN = 52
const TWIG_MAIN_W = 6
const TWIG_OUTLINE_PAD = 2
//
// Darker strip along the underside gives the thick stick a second wood tone.
//
const TWIG_UNDERSIDE_OFFSET = TWIG_MAIN_W * 0.22
const TWIG_UNDERSIDE_W = TWIG_MAIN_W * 0.4
const TWIG_SIDE_W = 2.6
const TWIG_SIDE_OUTLINE_PAD = 1.2
//
// Side twigs in the stick's local frame: `at` is the fraction of the main
// length, `angle` the heading off the main axis (negative = up while lying),
// `len` the twig length in px.
//
const TWIG_SIDES = [
  { at: 0.3, angle: -0.75, len: 15 },
  { at: 0.62, angle: -0.45, len: 17 },
  { at: 0.82, angle: 0.6, len: 11 }
]
const TWIG_TIP_LEAF_ANGLE = 0.3
//
// Leaves around every twig tip: `turn` off the twig heading, `back` px back
// from the tip along the twig, `size` leaf length in px.
//
const TWIG_LEAF_CLUSTER = [
  { turn: -0.7, back: 4, size: 6 },
  { turn: 0.15, back: 0, size: 8 },
  { turn: 0.85, back: 6, size: 5 }
]
//
// Asymmetric leaf (base at the origin, tip at +X, fuller on the -Y side),
// fan-triangulated from the base vertex.
//
const LEAF_SHAPE = [
  [0, 0], [0.18, -0.3], [0.46, -0.42], [0.76, -0.3],
  [1, 0], [0.72, 0.19], [0.42, 0.25], [0.16, 0.15]
]
const LEAF_INDICES = [0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 5, 0, 5, 6, 0, 6, 7]
//
// Shadow, base and light layers of one leaf (leaf units), each tone index
// maps to the colour tree palette's leafShades.
//
const LEAF_TONES = [
  { scale: 1, dx: 0, dy: 0 },
  { scale: 0.76, dx: 0.1, dy: -0.07 },
  { scale: 0.38, dx: 0.24, dy: -0.14 }
]
const TWIG_HANG_ANGLE = 0.72
const TWIG_FALL_GRAVITY = 1900
const TWIG_GROUND_LINGER_SEC = 5
const TWIG_FADE_SEC = 0.85
const TWIG_RESPAWN_PAUSE_SEC = 2.5
const TWIG_REGROW_FADE_SEC = 0.75
const TWIG_ROT_SPEED = 2.4
//
// The near end of a mounted stick is pinned this far behind the head centre;
// the stick never follows the lagging body segments, so its length on the back
// stays the same however far the centipede stretches.
//
const TWIG_BEHIND_HEAD = 6
//
// The stick's centre line sits this far above the highest shell top under it,
// so it lies on the back instead of sinking into the segments.
//
const TWIG_BACK_REST = TWIG_MAIN_W * 0.5 + 0.5
//
// The hero stands on the stick's top face, not on its centre line.
//
const TWIG_TOP_ABOVE_AXIS = TWIG_MAIN_W * 0.5
//
// A turn squeezes the stick through zero width instead of tilting it.
//
const TWIG_TURN_SPEED = 1.15
const TWIG_RIDE_TURN_DURATION = 0.85
const TWIG_ISLAND_DISBARK_TURN_DURATION = 1.25
const TWIG_RIDE_EDGE_SLACK = 12
const TWIG_RIDE_EDGE_INSET = 4
const TWIG_RIDE_SHIELD_BELOW = 6
const TWIG_RIDE_JUMP_VEL_Y = -220
const TWIG_RIDE_TURN_MIN_SPEED = 40
const TWIG_FALL_SUBSTEPS = 5
const TWIG_RIDE_PLAT_H = 8
const TWIG_RIDE_PLAT_HALF_W = TWIG_MAIN_LEN * 0.46
//
// Over the centipede, under the hero, the mushrooms and the big trees.
//
const TWIG_Z = CFG.visual.zIndex.player - 0.5
const TWIG_OUTLINE = FOREST_PAL.forestContour.platform
const PLATFORM_HIDE_X = -500
const PLATFORM_HIDE_Y = -5000

/**
 * Creates hanging twigs under the shore horizontal branch (world layout).
 * @param {Object} cfg - Configuration
 * @param {Object} cfg.k - Kaplay inst
 * @param {number} cfg.branchX1 - Branch platform left
 * @param {number} cfg.branchX2 - Branch platform right
 * @param {number} cfg.branchY - Branch walk surface Y
 * @returns {Object} Twig inst
 */
export function create(cfg) {
  const { k, branchX1, branchX2, branchY } = cfg
  const inst = {
    k,
    branchX1,
    branchX2,
    branchY,
    twigs: [],
    batch: PolyBatch.create(),
    colors: null,
    leafPts: LEAF_SHAPE.map(() => [0, 0]),
    dropped: false,
    regrowing: false,
    respawnWait: 0,
    regrowT: 0,
    onCycleReset: null,
    ridePlat: makeRidePlatform(k)
  }
  resetTwigsToHang(inst)
  return inst
}

/**
 * Starts the fall animation for every twig (when idle under the branch).
 * @param {Object} inst - Twig inst
 */
export function dropHorizFallTwigs(inst) {
  if (!inst || inst.dropped || inst.regrowing) return
  if (!inst.twigs.every(t => t.phase === 'idle')) return
  inst.dropped = true
  inst.respawnWait = 0
  inst.twigs.forEach(twig => {
    twig.phase = 'falling'
    twig.vy = 0
    twig.vx = (twig.seed - 0.5) * 28
    twig.rotVel = (twig.seed - 0.5) * TWIG_ROT_SPEED
  })
}

/**
 * Physics, fade-out on the ground, pause, then fade-in regrow under the branch.
 * @param {Object} inst - Twig inst
 * @param {number} dt - Frame delta
 * @param {number} floorY - Ground line Y
 * @param {Object} [predator] - Centipede inst (twig may mount its back)
 */
/**
 * Advances a delayed stick turn and exposes pause flags for predator movement.
 * Call before Predator.update() each frame.
 * @param {Object} inst - Twig inst
 * @param {number} dt - Frame delta
 */
export function tickTwigPredatorRide(inst, dt) {
  if (!inst) return
  tickRideTurn(inst, dt)
}

/**
 * After a jump from the lake stick onto the eye-flower island, ease the
 * centipede into its turn once the hero has landed there.
 * @param {Object} twigInst - Twig inst
 * @param {Object} levelInst - Forest level inst (eye-flower island layout)
 * @param {Object} char - Hero character
 * @param {function(Object, number, number): boolean} isOnIsland - Feet on the island
 */
export function tryPredatorTurnTowardIslandAfterLanding(twigInst, levelInst, char, isOnIsland) {
  if (!twigInst?.turnTowardIslandPending || !char?.pos || !levelInst) return
  if (!mountedTwig(twigInst)) {
    twigInst.turnTowardIslandPending = false
    return
  }
  const footY = char.pos.y + HERO_SURFACE_DETECT_Y
  if (!isOnIsland(levelInst, char.pos.x, footY)) return
  if (!(char.isGrounded?.() ?? false)) return
  const islandX = levelInst.eyeFlower?.x
  if (islandX == null) {
    twigInst.turnTowardIslandPending = false
    return
  }
  twigInst.turnTowardIslandPending = false
  armPredatorIslandRetreat(twigInst, levelInst, islandX)
}

/**
 * The island flower took the hero: his jump off the stick is over (his body
 * leaves physics, so the airborne flag would pause the centipede forever),
 * and a crawler waiting at the island turns and swims back to the shore.
 * @param {Object} twigInst - Twig inst
 * @param {Object} levelInst - Forest level inst
 */
export function releasePredatorAtIsland(twigInst, levelInst) {
  if (!twigInst) return
  twigInst.riderAirborne = false
  twigInst.turnTowardIslandPending = false
  const islandX = levelInst?.eyeFlower?.x
  mountedTwig(twigInst) && twigInst.predator?.swimming && islandX != null &&
    armPredatorIslandRetreat(twigInst, levelInst, islandX)
}

/**
 * When the hero stands on the island but the salute turn never started
 * (e.g. flee blocked scheduling), force the shore swim.
 * @param {Object} twigInst - Twig inst
 * @param {Object} levelInst - Forest level inst
 * @param {Object} char - Hero character
 * @param {function(Object, number, number): boolean} isOnIsland
 */
export function tickPredatorIslandRetreatFallback(twigInst, levelInst, char, isOnIsland) {
  if (!twigInst || !levelInst || !char?.pos) return
  const pred = twigInst.predator
  if (!pred || pred.islandRetreatX != null) return
  const footY = char.pos.y + HERO_SURFACE_DETECT_Y
  if (!isOnIsland(levelInst, char.pos.x, footY)) return
  if (!(char.isGrounded?.() ?? false)) return
  if (!mountedTwig(twigInst)) return
  const minX = EyeFlower.predatorMinX(levelInst.eyeFlower)
  if (minX == null || pred.x < minX - 48) return
  if (twigInst.islandRetreatAfterTurn && !twigInst.rideTurnPending) {
    twigInst.islandRetreatAfterTurn = false
    beginIslandShoreRetreat(pred)
    clearRideTurnPose(twigInst, pred)
    return
  }
  if (
    !twigInst.islandRetreatAfterTurn &&
    !twigInst.rideTurnPending &&
    pred.islandRetreatX == null
  ) {
    const islandX = levelInst.eyeFlower?.x
    islandX != null && armPredatorIslandRetreat(twigInst, levelInst, islandX)
  }
}

/**
 * True while the centipede should hold position (hero jump off the stick).
 * @param {Object} predatorInst - Predator inst
 * @returns {boolean}
 */
export function isTwigPausingPredatorMove(predatorInst) {
  const tw = predatorInst?.levelInst?.shoreFallTwigs
  if (!tw || !mountedTwig(tw)) return false
  if (tw.rideTurnDisembark && tw.rideTurnPending) return true
  return Boolean(tw.riderAirborne)
}

export function onUpdate(inst, dt, floorY, predator, heroChar) {
  if (!inst?.twigs?.length) return
  inst.predator = predator ?? inst.predator ?? null
  inst._heroChar = heroChar ?? inst._heroChar ?? null
  inst.twigs.forEach(twig => stepTwig(twig, dt, floorY, predator, inst))
  syncRidePlatform(inst)
  if (inst.regrowing) {
    inst.regrowT += dt / TWIG_REGROW_FADE_SEC
    const a = Math.min(1, inst.regrowT)
    inst.twigs.forEach(twig => {
      twig.phase = 'idle'
      twig.alpha = a
    })
    if (inst.regrowT >= 1) {
      inst.regrowing = false
      inst.regrowT = 0
      inst.respawnWait = 0
      inst.dropped = false
      inst.onCycleReset?.()
    }
    return
  }
  if (!inst.dropped || !allTwigsGone(inst)) return
  inst.respawnWait += dt
  if (inst.respawnWait < TWIG_RESPAWN_PAUSE_SEC) return
  beginTwigRegrow(inst)
}

/**
 * Draws the leafy twigs in the big tree's wood and leaf tones.
 * @param {Object} inst - Twig inst
 * @param {number} opacity - Scene fade multiplier
 * @param {{x1: number, x2: number}|null} view - Camera cull span
 */
export function onDraw(inst, opacity, view) {
  if (!inst?.twigs?.length || opacity <= 0) return
  const k = inst.k
  inst.colors ??= buildTwigColors(k)
  const batch = inst.batch
  inst.twigs.forEach(twig => {
    if (twig.phase === 'gone') return
    if (view && (twig.x < view.x1 - 80 || twig.x > view.x2 + 80)) return
    const op = opacity * twig.alpha
    if (op <= 0.001) return
    PolyBatch.reset(batch)
    addTwigGeometry(batch, twig, inst.colors, inst.leafPts)
    PolyBatch.flush(batch, k, op)
  })
}

/**
 * True when the hero stands on a twig riding the centipede.
 * @param {Object} inst - Twig inst
 * @param {Object} char - Hero character
 * @returns {boolean}
 */
export function isHeroRidingPredator(inst, char) {
  return Boolean(inst?.riderLocked && mountedTwig(inst) && char?.pos)
}

/**
 * True while the fallen stick lies on the centipede's back (saved level state).
 * @param {Object} inst - Twig inst
 * @returns {boolean}
 */
export function isTwigOnPredator(inst) {
  return Boolean(mountedTwig(inst))
}

/**
 * Puts the stick straight onto the centipede's back (restoring a saved run).
 * @param {Object} inst - Twig inst
 * @param {Object} predator - Centipede inst
 */
export function restoreTwigOnPredator(inst, predator) {
  const twig = inst?.twigs?.[0]
  if (!twig || !predator) return
  inst.dropped = true
  inst.regrowing = false
  inst.predator = predator
  twig.phase = 'predatorMount'
  twig.vx = 0
  twig.vy = 0
  twig.rotVel = 0
  twig.alpha = 1
  twig.rot = 0
  twig.face = -(predator.dir || 1)
  predator.segments?.length && placeTwigOnBack(twig, predator, 0)
}

/**
 * True while the stick protects the hero from the centipede: standing on it,
 * or airborne after jumping off it and still above the stick.
 * @param {Object} inst - Twig inst
 * @param {Object} char - Hero character
 * @returns {boolean}
 */
export function isHeroShieldedByTwig(inst, char) {
  if (isHeroRidingPredator(inst, char)) return true
  return Boolean(inst?.riderAirborne && mountedTwig(inst) && char?.pos)
}

/**
 * Pins the hero to the stick on the centipede's back: he keeps his own offset
 * along the stick (walking changes it) and otherwise moves with it 1:1.
 * @param {Object} inst - Twig inst
 * @param {Object} char - Hero character
 * @param {Object} [hero] - Hero inst (input shift, stick counts as ground)
 */
export function snapHeroPredatorTwigRide(inst, char, hero) {
  if (!inst) return
  const mounted = mountedTwig(inst)
  if (!mounted || !char?.pos) {
    releaseRider(inst, char)
    inst.riderAirborne = false
    return
  }
  const velY = char.vel?.y ?? 0
  const midX = twigMidX(mounted)
  if (!inst.riderLocked) {
    tryLockRider(inst, char, mounted, midX, velY, hero)
    if (!inst.riderLocked) {
      syncRiderAirborne(inst, char, mounted)
      return
    }
  } else if (velY < TWIG_RIDE_JUMP_VEL_Y) {
    //
    // Leave the stick where the jump started. A stuck platform link would
    // carry him with the next collider teleport (ride pad, mushroom cap).
    //
    releaseRider(inst, char)
    inst.riderAirborne = true
    inst.turnTowardIslandPending = true
    return
  } else if (heroLeftRideStick(inst, char, mounted, hero)) {
    //
    // Dropped to the ground or walked off the end. A turn moves the stick
    // under him — that is not leaving it.
    //
    releaseRider(inst, char)
    inst.riderAirborne = false
    hideRidePlatform(inst)
    return
  }
  //
  // Keep the same point on the stick. Platform carry alone drifted him as
  // the centipede walked.
  //
  inst.rideOffset = clampRideOffset((inst.rideOffset ?? 0) + riderInputShift(hero))
  keepRiderOffIslandSide(inst, mounted, midX)
  const rideX = midX + inst.rideOffset
  const rideY = twigSurfaceY(mounted) - HERO_SURFACE_DETECT_Y + HERO_LOG_SNAP_EMBED
  typeof char.moveTo === 'function' ? char.moveTo(rideX, rideY) : (char.pos.x = rideX, char.pos.y = rideY)
  char.vel && (char.vel.x = 0, char.vel.y = 0)
  char.stickToPlatform = false
  //
  // The rider platform is teleported every frame, so Kaplay keeps losing the
  // contact — the hero counts the stick as ground himself (idle/run frames,
  // landing crouch, jump squash and launch all work as on wood).
  //
  if (hero) {
    hero.carrierGrounded = true
    inst._riderHero = hero
  }
}

export const HORIZ_FALL_TWIG_DRAW_Z = TWIG_Z

const HERO_SURFACE_DETECT_Y = 38
const HERO_LOG_SNAP_EMBED = 1
const HERO_HALF_W = 20
const ISLAND_WALL_GAP = 1

function heroLeftRideStick(inst, char, mounted, hero) {
  const footY = char.pos.y + HERO_SURFACE_DETECT_Y
  if (footY > twigSurfaceY(mounted) + 28) return true
  const shift = riderInputShift(hero)
  if (!shift || hero?.isSquashing) return false
  const offset = inst.rideOffset ?? 0
  const limit = TWIG_RIDE_PLAT_HALF_W - TWIG_RIDE_EDGE_INSET
  if (Math.abs(offset) < limit - 0.5 || Math.sign(shift) !== Math.sign(offset)) return false
  //
  // Afloat, the end of the stick is open water: he only steps off onto the
  // island top, otherwise he stays at the edge (and can still jump).
  //
  if (!inst.predator?.swimming) return true
  const island = inst.predator.levelInst?.eyeFlower
  return EyeFlower.isOnIsland(island, char.pos.x + Math.sign(shift) * HERO_HALF_W, twigSurfaceY(mounted))
}

//
// The island collider's side is a wall for a rider whose stick sits lower
// than the island top. Kaplay pushing the pinned body out of it every frame
// broke his ground contact and cancelled the jump crouch.
//
function keepRiderOffIslandSide(inst, mounted, midX) {
  const island = inst.predator?.levelInst?.eyeFlower
  const wallX = EyeFlower.sideWallX(island, twigSurfaceY(mounted))
  if (wallX == null) return
  const minOffset = wallX + HERO_HALF_W + ISLAND_WALL_GAP - midX
  inst.rideOffset < minOffset && (inst.rideOffset = clampRideOffset(minOffset))
}

function tryLockRider(inst, char, mounted, midX, velY, hero) {
  if (velY < TWIG_RIDE_JUMP_VEL_Y) return
  //
  // Just walked off an end and still pushing that way: re-boarding inside
  // the edge slack flipped him on and off the stick every frame, which
  // cancelled every jump crouch there.
  //
  const shift = riderInputShift(hero)
  const offset = char.pos.x - midX
  if (shift && Math.sign(shift) === Math.sign(offset) &&
    Math.abs(offset) >= TWIG_RIDE_PLAT_HALF_W - TWIG_RIDE_EDGE_INSET - 0.5) return
  const footY = char.pos.y + HERO_SURFACE_DETECT_Y
  const onPlat = char.curPlatform?.() === inst.ridePlat
  //
  // Standing on other solid ground next to the stick (the island top sits
  // at the stick's height) is not boarding it.
  //
  if (!onPlat && char.isGrounded?.() && char.curPlatform?.()) return
  if (!onPlat && EyeFlower.isOnIsland(inst.predator?.levelInst?.eyeFlower, char.pos.x, footY)) return
  const overStick = Math.abs(char.pos.x - midX) <= TWIG_RIDE_PLAT_HALF_W + TWIG_RIDE_EDGE_SLACK
  const surfaceY = twigSurfaceY(mounted)
  const atTop = footY >= surfaceY - 16 && footY <= surfaceY + 18
  if (!onPlat && !(overStick && atTop)) return
  inst.riderLocked = true
  inst.riderAirborne = false
  scheduleRideTurnAfterTwigLand(inst)
  inst.rideOffset = clampRideOffset(char.pos.x - midX)
  const rideX = midX + inst.rideOffset
  const rideY = surfaceY - HERO_SURFACE_DETECT_Y + HERO_LOG_SNAP_EMBED
  typeof char.moveTo === 'function' ? char.moveTo(rideX, rideY) : (char.pos.x = rideX, char.pos.y = rideY)
  char.vel && (char.vel.y = 0)
  //
  // The seat is the per-frame pin below. Leaving the platform link on would
  // drag him the next time that collider is parked off-screen.
  //
  detachHeroFromRidePlatform(char)
}

//
// After a landing, ease into the reversed heading instead of snapping dir/vx.
//
function armPredatorIslandRetreat(twigInst, levelInst, islandX) {
  const pred = twigInst.predator
  if (!pred || islandX == null) return
  if (pred.islandRetreatX != null) return
  const minX = EyeFlower.predatorMinX(levelInst.eyeFlower)
  minX != null && pred.x < minX && (pred.x = minX, pred.vx = 0)
  const skipTurnAnim = pred.state === 'feast' || pred.state === 'coast'
  if (skipTurnAnim) {
    twigInst.islandRetreatAfterTurn = false
    beginIslandShoreRetreat(pred)
    clearRideTurnPose(twigInst, pred)
    return
  }
  twigInst.islandRetreatAfterTurn = true
  schedulePredatorMountedTurn(twigInst, true)
}

//
// Same eased 180° squeeze as after a twig lands on the back — body spine blend
// plus stick face going through zero width.
//
function schedulePredatorMountedTurn(inst, disembark) {
  const pred = inst.predator
  if (!pred) {
    inst.rideDir == null && (inst.rideDir = 1)
    return
  }
  const mounted = mountedTwig(inst)
  const next = -(pred.dir || inst.rideDir || 1)
  inst.rideTurnFromFace = mounted?.face ?? -(pred.dir || 1)
  inst.rideTurnTargetDir = next
  inst.rideTurnPending = true
  inst.rideTurnElapsed = 0
  inst.rideTurnDisembark = Boolean(disembark)
  inst.rideTurnDurationSec = disembark ? TWIG_ISLAND_DISBARK_TURN_DURATION : null
  pred.rideTurnFromSegs = pred.segments?.map(seg => ({ x: seg.x, y: seg.y })) ?? null
  pred.rideTurnPoseDir = next
  pred.rideTurnBlend = 0
  pred.vx = 0
  pred.holdFacing = true
}

function scheduleRideTurnAfterTwigLand(inst) {
  const pred = inst.predator
  if (!pred) {
    inst.rideDir == null && (inst.rideDir = 1)
    return
  }
  if (isPredatorSteeringItself(pred)) {
    inst.rideDir == null && (inst.rideDir = pred.dir ?? 1)
    return
  }
  schedulePredatorMountedTurn(inst, false)
}
//
// A flee or the swim back from the island owns the heading — the stick
// follows it instead of locking the crawler to the rider's facing, which
// pinned it at the island (retreat steered east, the ride lock steered west).
//
function isPredatorSteeringItself(pred) {
  return pred?.state === 'flee' || pred?.islandRetreatX != null
}

//
// A flee waypoint flips the heading in one frame. With a rider that snapped
// the stick across the head and threw him sideways, so the flip goes through
// the same eased turn as on land.
//
function startFleeRideTurn(inst, pred, mounted) {
  inst.rideTurnFromFace = mounted.face
  inst.rideTurnTargetDir = pred.dir
  inst.rideTurnPending = true
  inst.rideTurnElapsed = 0
  pred.rideTurnFromSegs = pred.segments?.map(seg => ({ x: seg.x, y: seg.y })) ?? null
  pred.rideTurnPoseDir = pred.dir
  pred.rideTurnBlend = 0
  pred.dir = inst.rideDir
  pred.vx = 0
  pred.holdFacing = true
}

function rideTurnBlend(inst) {
  const dur = inst.rideTurnDurationSec ?? TWIG_RIDE_TURN_DURATION
  const t = Math.min(1, (inst.rideTurnElapsed ?? 0) / dur)
  return t * t * (3 - 2 * t)
}

function tickRideTurn(inst, dt) {
  if (!inst.rideTurnPending) return
  if (!inst.riderLocked && !inst.rideTurnDisembark) return
  const pred = inst.predator
  if (!pred) {
    clearRideTurnPose(inst, pred)
    return
  }
  inst.rideTurnElapsed = (inst.rideTurnElapsed ?? 0) + dt
  const blend = rideTurnBlend(inst)
  pred.rideTurnBlend = blend
  pred.rideTurnPoseDir = inst.rideTurnTargetDir
  pred.vx = 0
  pred.holdFacing = true
  inst.rideTurnDisembark && (pred.stretch += (1 - pred.stretch) * Math.min(1, dt * 5))
  blend >= 0.5 && (pred.dir = inst.rideTurnTargetDir)
  if (!mountedTwig(inst)) clearRideTurnPose(inst, pred)
}

function completeRideTurn(inst, pred) {
  if (inst.islandRetreatAfterTurn && pred) {
    inst.islandRetreatAfterTurn = false
    const level = pred.levelInst
    const minX = level && EyeFlower.predatorMinX(level.eyeFlower)
    minX != null && pred.x < minX && (pred.x = minX)
    beginIslandShoreRetreat(pred)
    clearRideTurnPose(inst, pred)
    return
  }
  const next = inst.rideTurnTargetDir ?? pred?.dir ?? 1
  inst.rideDir = next
  if (pred) {
    pred.dir = next
    pred.holdFacing = !isPredatorSteeringItself(pred)
    pred.vx = pred.dir * TWIG_RIDE_TURN_MIN_SPEED
  }
  clearRideTurnPose(inst, pred)
}

function clearRideTurnPose(inst, pred) {
  inst.rideTurnPending = false
  inst.rideTurnElapsed = 0
  inst.rideTurnAnchorX = null
  inst.rideTurnDisembark = false
  inst.rideTurnDurationSec = null
  if (!pred) return
  pred.rideTurnFromSegs = null
  pred.rideTurnBlend = null
  pred.rideTurnPoseDir = null
  pred.spineFollowRate = null
}

function detachHeroFromRidePlatform(char) {
  if (!char) return
  const vx = char.vel?.x ?? 0
  const vy = char.vel?.y ?? 0
  typeof char.jump === 'function' && char.jump(1)
  char.vel && (char.vel.x = vx, char.vel.y = vy)
  char.stickToPlatform = false
}

function releaseRider(inst, char) {
  if (!inst.riderLocked) return
  const pred = inst.predator
  const wasTurning = inst.rideTurnPending
  inst.riderLocked = false
  inst.rideDir = null
  inst.rideOffset = 0
  inst._riderHero && (inst._riderHero.carrierGrounded = false)
  inst._riderHero = null
  //
  // jump() clears Kaplay's curPlatform. A raw vel write leaves the link, and
  // the next static-platform move (hide at x=-500, or a cap snapping home)
  // carries the body across the level — a hop off the right side landed in
  // the lake.
  //
  detachHeroFromRidePlatform(char)
  if (wasTurning && pred) {
    pred.dir = inst.rideTurnTargetDir ?? pred.dir
    pred.vx = (pred.dir || 1) * TWIG_RIDE_TURN_MIN_SPEED
  }
  clearRideTurnPose(inst, pred)
}

//
// A jump off the stick stays shielded while the hero is still above the
// stick — his feet start inside the shell, so the touch check killed him at
// take-off. Landing anywhere or dropping below the stick ends the shield.
//
function syncRiderAirborne(inst, char, mounted) {
  if (!inst.riderAirborne) return
  const footY = char.pos.y + HERO_SURFACE_DETECT_Y
  const landed = (char.isGrounded?.() ?? false) && (char.vel?.y ?? 0) >= 0
  if (landed || footY > twigSurfaceY(mounted) + TWIG_RIDE_SHIELD_BELOW) inst.riderAirborne = false
}

function riderInputShift(hero) {
  if (!hero?._effectivelyMoving || !hero.k) return 0
  return (hero.direction ?? 0) * hero.speed * hero.k.dt()
}

function clampRideOffset(offset) {
  const half = TWIG_RIDE_PLAT_HALF_W - TWIG_RIDE_EDGE_INSET
  return Math.max(-half, Math.min(half, offset))
}

function makeRidePlatform(k) {
  return k.add([
    k.rect(TWIG_RIDE_PLAT_HALF_W * 2, TWIG_RIDE_PLAT_H),
    k.pos(PLATFORM_HIDE_X, PLATFORM_HIDE_Y),
    k.anchor('top'),
    k.area({ collisionIgnore: [CFG.game.platformName] }),
    k.body({ isStatic: true }),
    k.opacity(0),
    CFG.game.platformName
  ])
}

function resetTwigsToHang(inst) {
  const span = inst.branchX2 - inst.branchX1
  inst.twigs.length = 0
  hideRidePlatform(inst)
  const x = inst.branchX1 + span * 0.62
  const y = inst.branchY + TWIG_ATTACH_BELOW_BRANCH
  inst.twigs.push(makeTwigState(x, y, 0, TWIG_HANG_ANGLE))
}

function beginTwigRegrow(inst) {
  resetTwigsToHang(inst)
  inst.regrowing = true
  inst.regrowT = 0
  inst.twigs.forEach(twig => {
    twig.alpha = 0
    twig.phase = 'idle'
  })
}

function allTwigsGone(inst) {
  return inst.twigs.every(twig => twig.phase === 'gone')
}

function makeTwigState(x, y, index, hangRot) {
  return {
    x,
    y,
    rot: hangRot,
    hangRot,
    phase: 'idle',
    vy: 0,
    vx: 0,
    rotVel: 0,
    alpha: 1,
    seed: 0.22 + index * 0.41,
    groundTimer: 0,
    fadeT: 0
  }
}

function mountedTwig(inst) {
  return inst?.twigs?.find(twig => twig.phase === 'predatorMount') ?? null
}

function stepTwig(twig, dt, floorY, predator, inst) {
  if (twig.phase === 'idle') return
  if (twig.phase === 'predatorMount') {
    const riding = Boolean(inst.riderLocked)
    if (predator) {
      if (riding) {
        if (inst.rideTurnPending) {
          predator.holdFacing = true
        } else if (isPredatorSteeringItself(predator)) {
          inst.rideDir != null && predator.dir !== inst.rideDir
            ? startFleeRideTurn(inst, predator, twig)
            : (inst.rideDir = predator.dir)
          !inst.rideTurnPending && (predator.holdFacing = false)
        } else {
          inst.rideDir == null && (inst.rideDir = predator.dir)
          predator.holdFacing = true
          predator.dir = inst.rideDir
        }
      } else if (inst.rideTurnDisembark && inst.rideTurnPending) {
        predator.holdFacing = true
      } else {
        predator.holdFacing = false
      }
    }
    placeTwigOnBack(twig, predator, dt, riding, inst.rideDir, inst)
    inst.rideTurnPending && rideTurnBlend(inst) >= 1 &&
      completeRideTurn(inst, predator)
    return
  }
  if (twig.phase === 'falling') {
    const slices = TWIG_FALL_SUBSTEPS
    const sdt = dt / slices
    for (let i = 0; i < slices; i++) {
      twig.vy += TWIG_FALL_GRAVITY * sdt
      twig.x += twig.vx * sdt
      twig.y += twig.vy * sdt
      twig.rot += twig.rotVel * sdt
      if (tryMountTwig(twig, predator)) return
      if (twig.y >= floorY - 4) {
        twig.y = floorY - 4
        twig.phase = 'ground'
        twig.vy = 0
        twig.vx *= 0.35
        twig.rotVel *= 0.2
        twig.rot = 0
        return
      }
    }
    return
  }
  if (twig.phase === 'ground') {
    twig.groundTimer += dt
    twig.groundTimer >= TWIG_GROUND_LINGER_SEC && (twig.phase = 'fade', twig.fadeT = 0)
    return
  }
  if (twig.phase === 'fade') {
    twig.fadeT += dt / TWIG_FADE_SEC
    twig.alpha = Math.max(0, 1 - twig.fadeT)
    twig.fadeT >= 1 && (twig.phase = 'gone')
  }
}

function tryMountTwig(twig, predator) {
  if (!predator || twig.vy < 30) return false
  const x2 = twig.x + Math.cos(twig.rot) * TWIG_MAIN_LEN
  const y2 = twig.y + Math.sin(twig.rot) * TWIG_MAIN_LEN
  const hit = predatorBackCatchPoint(predator, twig.x, twig.y, x2, y2)
  if (!hit) return false
  twig.phase = 'predatorMount'
  twig.vy = 0
  twig.vx = 0
  twig.rotVel = 0
  twig.alpha = 1
  twig.rot = 0
  twig.face = -(predator.dir || 1)
  placeTwigOnBack(twig, predator, 0)
  return true
}
//
// face: +1 = stick runs to +X from its pinned end, -1 = to -X. It eases
// toward the tail side, so a turn squeezes the horizontal stick thin and
// widens it again on the other side.
//
function placeTwigOnBack(twig, predator, dt, riderLocked, rideDir, twigInst) {
  const head = predator?.segments?.[0]
  if (!head) return
  const turning = Boolean(
    twigInst?.rideTurnPending && (riderLocked || twigInst.rideTurnDisembark)
  )
  let tailDir = -(predator.dir || 1)
  if (riderLocked && !turning && rideDir != null) tailDir = -rideDir
  if (turning) {
    const from = twigInst.rideTurnFromFace ?? twig.face ?? tailDir
    const to = -(twigInst.rideTurnTargetDir || 1)
    twig.face = from + (to - from) * rideTurnBlend(twigInst)
    tailDir = to
  } else if (riderLocked && rideDir != null) {
    twig.face = tailDir
  } else {
    twig.face == null && (twig.face = tailDir)
    twig.face += (tailDir - twig.face) * Math.min(1, dt * TWIG_TURN_SPEED)
  }
  twig.rot = 0
  twig.x = head.x + twig.face * (head.radius + TWIG_BEHIND_HEAD)
  twig.y = backTopUnderTwig(predator, twig.x, twig.x + twig.face * TWIG_MAIN_LEN) - TWIG_BACK_REST
}

//
// Highest shell top along the stick span on the ideal spine. The drawn
// segments lag and pop in and out of the span, which made the rider
// platform jitter and shove the hero sideways.
//
function backTopUnderTwig(predator, xa, xb) {
  const lo = Math.min(xa, xb)
  const hi = Math.max(xa, xb)
  //
  // During a shared turn the drawn spine is the blend, not the ideal heading,
  // so the stick rests on the shell the player actually sees.
  //
  const pts = predator.rideTurnBlend != null
    ? predator.segments
    : samplePredatorSpineHitPoints(predator)
  let top = Infinity
  for (const pt of pts) {
    pt.x >= lo && pt.x <= hi && (top = Math.min(top, pt.y - pt.radius))
  }
  if (top === Infinity) {
    const seg = predator.segments[1] ?? predator.segments[0]
    top = seg.y - seg.radius
  }
  return top
}

function twigSurfaceY(twig) {
  return twig.y - TWIG_TOP_ABOVE_AXIS
}

function twigMidX(twig) {
  return twig.phase === 'predatorMount'
    ? twig.x + twig.face * TWIG_MAIN_LEN * 0.5
    : twig.x + Math.cos(twig.rot) * TWIG_MAIN_LEN * 0.5
}

function syncRidePlatform(inst) {
  const plat = inst.ridePlat
  if (!plat) return
  const mounted = inst.twigs.find(t => t.phase === 'predatorMount')
  if (!mounted) {
    hideRidePlatform(inst)
    return
  }
  const platX = twigMidX(mounted)
  const platY = twigSurfaceY(mounted)
  typeof plat.moveTo === 'function' ? plat.moveTo(platX, platY) : (plat.pos.x = platX, plat.pos.y = platY)
}

function hideRidePlatform(inst) {
  const plat = inst.ridePlat
  if (!plat) return
  typeof plat.moveTo === 'function'
    ? plat.moveTo(PLATFORM_HIDE_X, PLATFORM_HIDE_Y)
    : (plat.pos.x = PLATFORM_HIDE_X, plat.pos.y = PLATFORM_HIDE_Y)
}

//
// Geometry is built in the stick's local frame (main axis = +X) and mapped to
// the world with a rotation plus an X squeeze (the mounted stick's turn).
//
function addTwigGeometry(batch, twig, colors, leafPts) {
  const sx = twig.phase === 'predatorMount' ? twig.face : 1
  //
  // Painter's order inside one batch: every outline first, so the wood of
  // the side twigs joins the main stick without a contour seam.
  //
  addTwigLine(batch, twig, sx, 0, 0, TWIG_MAIN_LEN, 0, TWIG_MAIN_W + TWIG_OUTLINE_PAD, colors.outline)
  TWIG_SIDES.forEach(side => addSideTwig(batch, twig, sx, side, TWIG_SIDE_W + TWIG_SIDE_OUTLINE_PAD, colors.outline))
  addTwigLine(batch, twig, sx, 0, 0, TWIG_MAIN_LEN, 0, TWIG_MAIN_W, colors.wood)
  addTwigLine(batch, twig, sx, 0, TWIG_UNDERSIDE_OFFSET, TWIG_MAIN_LEN, TWIG_UNDERSIDE_OFFSET,
    TWIG_UNDERSIDE_W, colors.woodDark)
  TWIG_SIDES.forEach(side => addSideTwig(batch, twig, sx, side, TWIG_SIDE_W, colors.woodDark))
  TWIG_SIDES.forEach(side => addLeafCluster(batch, twig, sx,
    side.at * TWIG_MAIN_LEN + Math.cos(side.angle) * side.len, Math.sin(side.angle) * side.len,
    side.angle, colors.leaves, leafPts))
  addLeafCluster(batch, twig, sx, TWIG_MAIN_LEN, 0, TWIG_TIP_LEAF_ANGLE, colors.leaves, leafPts)
}

function addSideTwig(batch, twig, sx, side, w, color) {
  const ax = side.at * TWIG_MAIN_LEN
  addTwigLine(batch, twig, sx, ax, 0,
    ax + Math.cos(side.angle) * side.len, Math.sin(side.angle) * side.len, w, color)
}

function addLeafCluster(batch, twig, sx, tipX, tipY, heading, leafColors, leafPts) {
  const cos = Math.cos(heading)
  const sin = Math.sin(heading)
  TWIG_LEAF_CLUSTER.forEach(leaf => addLeaf(batch, twig, sx,
    tipX - cos * leaf.back, tipY - sin * leaf.back, heading + leaf.turn, leaf.size, leafColors, leafPts))
}

//
// Leaf vertices go through the same local → world map as the stick, so the
// leaves rotate with the fall and squeeze with the mounted turn.
//
function addLeaf(batch, twig, sx, ox, oy, angle, size, leafColors, leafPts) {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  LEAF_TONES.forEach((tone, toneIdx) => {
    for (let i = 0; i < LEAF_SHAPE.length; i++) {
      const px = (LEAF_SHAPE[i][0] * tone.scale + tone.dx) * size
      const py = (LEAF_SHAPE[i][1] * tone.scale + tone.dy) * size
      const lx = ox + px * cos - py * sin
      const ly = oy + px * sin + py * cos
      leafPts[i][0] = twigWorldX(twig, sx, lx, ly)
      leafPts[i][1] = twigWorldY(twig, lx, ly)
    }
    //
    // Points are already in world space: identity origin, scale and rotation.
    //
    PolyBatch.addShape(batch, leafPts, LEAF_INDICES, 0, 0, 1, 1, 1, 0, leafColors[toneIdx])
  })
}

//
// Twig tones from the colour tree palette (built once per inst — the
// palette is static and the inst lives on one Kaplay instance).
//
function buildTwigColors(k) {
  const pal = getTreePaletteColor()
  const outlineRgb = forestRgb(TWIG_OUTLINE)
  return {
    wood: k.rgb(pal.branchR, pal.branchG, pal.branchB),
    woodDark: k.rgb(pal.trunkR, pal.trunkG, pal.trunkB),
    leaves: pal.leafShades.map(c => k.rgb(c.r, c.g, c.b)),
    outline: k.rgb(outlineRgb.r, outlineRgb.g, outlineRgb.b)
  }
}

function addTwigLine(batch, twig, sx, ax, ay, bx, by, w, color) {
  PolyBatch.addLine(batch,
    twigWorldX(twig, sx, ax, ay), twigWorldY(twig, ax, ay),
    twigWorldX(twig, sx, bx, by), twigWorldY(twig, bx, by), w, color)
}

function twigWorldX(twig, sx, lx, ly) {
  return twig.x + sx * (lx * Math.cos(twig.rot) - ly * Math.sin(twig.rot))
}

function twigWorldY(twig, lx, ly) {
  return twig.y + lx * Math.sin(twig.rot) + ly * Math.cos(twig.rot)
}
