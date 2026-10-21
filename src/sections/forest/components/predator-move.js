import { isTwigPausingPredatorMove } from '../utils/forest-horiz-fall-twig.js'
import * as EyeFlower from './eye-flower.js'

//
// Distance bands around the hero (world px — ~100 px per meter on this level):
// beyond 2 m drift slowly inward, inside 2 m run, inside 1 m lunge.
//

const FOREST_METER_PX = 100
const HERO_ALERT_FAR_RADIUS = FOREST_METER_PX * 2
const HERO_ALERT_NEAR_RADIUS = FOREST_METER_PX
const PATROL_DRIFT_SPEED = 58
const HUNT_RUN_SPEED = 142
const LUNGE_SPEED = 298
const LUNGE_DURATION = 0.36

//
// A hero who jumps over the crawler (seen on one side, lands on the other)
// is chased down: a sprint faster than his run, so he cannot reach the next
// mushroom. A hop during the chase does not shake it off — it keeps running
// at his last seen x until the chase times out.
//
const PURSUIT_TRIGGER_RADIUS = FOREST_METER_PX * 10
const PURSUIT_SIDE_MIN_DX = 20
const PURSUIT_SPEED = 560
//
// The close-range lunge during a chase must stay faster than the hero's run,
// otherwise the crawler brakes right behind him and never touches him.
//
const PURSUIT_LUNGE_SPEED = 640
const PURSUIT_DURATION = 4.5
const PURSUIT_HEAD_LIFT = 7
const PURSUIT_STRETCH = 1.22
const PURSUIT_POSE_EASE = 6
const HERO_BLIND_STATES = ['feast', 'flee', 'coast']

const SEARCH_SPEEDS = [0, 0, 22, 38, 58]
//
// Off the ground line the crawler drifts back to its home mushroom, not a
// straight patrol: speed and facing keep changing on the way.
//
const ROAM_SPEEDS = [0, 18, 34, 52, 74]
const ROAM_HOME_WANDER_PX = 72
//
// Near home a heading flip waits at least this long after the previous one —
// back-to-back flips read as twitching in place.
//
const ROAM_TURN_CHANCE = 0.35
const ROAM_TURN_MIN_INTERVAL_SEC = 1.6
const ROAM_TURN_INTERVAL_RANGE_SEC = 1.4
//
// Hunting stops within HUNT_ARRIVE_PX of its target and only turns around for
// a target more than HUNT_TURN_DEADBAND_PX behind it.
//
const HUNT_ARRIVE_PX = 10
const HUNT_TURN_DEADBAND_PX = 28
const PURSUIT_LAST_SEEN_ARRIVE_PX = 24
//
// Flight from a tomato burst: a sharp jerk away, a sprint along the patrol
// strip, and (to the left) a swim across the lake and back to the shore.
//
const FLEE_RUN_SPEED = 330
const FLEE_SWIM_SPEED = 150
const FLEE_JERK_MULT = 1.35
const FLEE_SPEED_EASE = 6
const FLEE_ARRIVE_PX = 6
const FLEE_SHORE_INLAND_PX = 60
const FLEE_HEAD_LIFT = 9
const FLEE_STRETCH = 1.28
const FLEE_POSE_EASE = 3
const FLEE_END_VX_KEEP = 0.3
const FLEE_END_SEARCH_DELAY = 0.3
const ISLAND_RETREAT_SHORE_PAD = 36
const ISLAND_RETREAT_SWIM_SPEED = PATROL_DRIFT_SPEED
const ISLAND_RETREAT_SPEED_EASE = 2.5
//
// At the eye-flower island: brake to a stop in the water, rest, turn the way it
// turns on land (head creeps, spine folds over slowly), then swim to shore.
//
const ISLAND_ARRIVE_DECEL_PER_SEC = 1.6
const ISLAND_STOP_SPEED_EASE = 6
const ISLAND_STOP_PAUSE_SEC = 0.7
const ISLAND_TURN_SEC = 1.3
const ISLAND_TURN_CREEP_SPEED = 12
const ISLAND_TURN_SPINE_FOLLOW_RATE = 3.5
const RETREAT_PHASE_STOP = 'stop'
const RETREAT_PHASE_TURN = 'turn'
const RETREAT_PHASE_SWIM = 'swim'
//
// With the hero standing on the stick the crawler keeps one steady walk.
//
const RIDE_WALK_SPEED = PATROL_DRIFT_SPEED
const RIDE_SPEED_EASE = 4

/**
 * Swims back from the eye-flower island to dry land east of the lake. A crawler
 * still facing the island first stops (optional), then turns like on land, and
 * only then swims; one already turned (after the stick turn) swims at once.
 * @param {Object} pred - Predator inst
 * @param {boolean} [stopFirst=false] - Rest in the water before turning
 */
export function beginIslandShoreRetreat(pred, stopFirst = false) {
  const level = pred?.levelInst
  if (!pred || !level) return
  const shoreX = level.lakeX2 != null
    ? level.lakeX2 + ISLAND_RETREAT_SHORE_PAD
    : pred.minX
  pred.islandRetreatX = shoreX
  pred.islandRetreatPhase = stopFirst
    ? RETREAT_PHASE_STOP
    : pred.dir > 0 ? RETREAT_PHASE_SWIM : RETREAT_PHASE_TURN
  pred.islandRetreatT = 0
  pred.fleePath = null
  pred.swimming = true
  pred.holdFacing = false
  pred.speedTarget = 0
  pred.state = 'search'
  pred.stateTime = 0
  const tw = level.shoreFallTwigs
  if (tw) {
    tw.rideTurnPending = false
    tw.rideTurnDisembark = false
    tw.islandRetreatAfterTurn = false
    tw.rideTurnElapsed = 0
    pred.rideTurnFromSegs = null
    pred.rideTurnBlend = null
    pred.rideTurnPoseDir = null
  }
}

export function tickMove(inst, dt, hero) {
  //
  // Feeding, fleeing and the post-kill coast move it without watching the
  // hero, so a side swap seen afterwards is not a jump over it.
  //
  HERO_BLIND_STATES.includes(inst.state) && forgetHeroSide(inst)
  if (inst.state === 'feast') return
  if (tickIslandShoreRetreat(inst, dt)) return
  if (isTwigPausingPredatorMove(inst)) {
    inst.vx *= Math.exp(-dt * 14)
    softenHeadPose(inst, dt)
    return
  }
  if (inst.levelInst?.shoreFallTwigs?.rideTurnPending) {
    inst.vx = 0
    return
  }
  applyRideFacingLock(inst)
  if (rideFacingLocked(inst)) {
    //
    // A rider on the stick must not cancel a lake flee — that used to swap in
    // slow patrol search, drop swimming, and let keepInside bounce off shore.
    //
    if (inst.state === 'flee') {
      syncTwigRideDirFromPredator(inst)
      tickFlee(inst, dt)
      return
    }
    tickRideLockedMove(inst, dt)
    inst.x += inst.vx * dt
    keepInside(inst)
    applyRideFacingLock(inst)
    return
  }
  inst.stateTime -= dt
  inst.idleTime += dt
  if (inst.state === 'flee') {
    tickFlee(inst, dt)
    return
  }
  if (inst.state === 'coast') {
    inst.vx *= Math.exp(-dt * 3.2)
    inst.x += inst.vx * dt
    inst.stretch += (1 - inst.stretch) * Math.min(1, dt * 4)
    keepInside(inst)
    if (inst.stateTime <= 0) enter(inst, 'search', 0.2)
    return
  }
  inst.pursuitT = Math.max(0, (inst.pursuitT ?? 0) - dt)
  if (!hero) {
    inst.pursuitT > 0 ? chaseLastSeen(inst, dt) : tickRoamHome(inst, dt)
    inst.x += inst.vx * dt
    keepInside(inst)
    return
  }
  const dx = hero.x - inst.x
  const dy = hero.y - inst.y
  const dist = Math.hypot(dx, dy)
  trackJumpOver(inst, hero, dx, dist)
  if (inst.state === 'lunge') {
    inst.lungeT -= dt
    hunt(inst, dt, hero, lungeSpeed(inst), true)
    inst.headLift = 11
    inst.stretch = 1.34
    inst.x += inst.vx * dt
    keepInside(inst)
    inst.lungeT <= 0 && enter(inst, 'hunt', 0)
    return
  }
  if (dist <= HERO_ALERT_NEAR_RADIUS) {
    enter(inst, 'lunge', LUNGE_DURATION)
    inst.lungeT = LUNGE_DURATION
    hunt(inst, dt, hero, lungeSpeed(inst), true)
    inst.headLift = 11
    inst.stretch = 1.34
  } else if (inst.pursuitT > 0) {
    inst.state = 'hunt'
    hunt(inst, dt, hero, PURSUIT_SPEED, true)
    easePursuitPose(inst, dt)
  } else if (dist <= HERO_ALERT_FAR_RADIUS) {
    inst.state = 'hunt'
    hunt(inst, dt, hero, HUNT_RUN_SPEED, false)
    inst.headLift = 2.5
    inst.stretch += (1.1 - inst.stretch) * Math.min(1, dt * 5)
  } else {
    inst.state = 'stalk'
    hunt(inst, dt, hero, PATROL_DRIFT_SPEED, false)
    softenHeadPose(inst, dt)
  }
  inst.x += inst.vx * dt
  keepInside(inst)
}

/**
 * Starts the flight away from a burst. Left runs to the lake shore, swims to
 * the far left edge and back; right sprints to the cave mouth.
 * @param {Object} inst - Predator inst
 * @param {number} dir - Flight direction, -1 left, 1 right
 */
export function startFleeMove(inst, dir) {
  if (rideFacingLocked(inst)) return
  const left = dir < 0
  inst.fleePath = left && inst.water
    ? [
        { x: inst.minX, swim: false },
        { x: inst.fleeLeftX, swim: true },
        { x: inst.minX + FLEE_SHORE_INLAND_PX, swim: true }
      ]
    : [{ x: left ? inst.minX : inst.maxX, swim: false }]
  inst.dir = dir
  inst.vx = dir * FLEE_RUN_SPEED * FLEE_JERK_MULT
  inst.headLift = FLEE_HEAD_LIFT
  inst.stretch = FLEE_STRETCH
  enter(inst, 'flee', 0)
  inst.orientKick = true
}

function tickFlee(inst, dt) {
  const wp = inst.fleePath?.[0]
  if (!wp) {
    finishFlee(inst)
    return
  }
  inst.swimming = wp.swim
  const islandStopX = fleeIslandStopX(inst, wp)
  if (islandStopX != null) {
    tickFleeIslandArrival(inst, dt, islandStopX)
    return
  }
  const dx = wp.x - inst.x
  if (Math.abs(dx) <= FLEE_ARRIVE_PX) {
    inst.fleePath.shift()
    return
  }
  !inst.holdFacing && (inst.dir = dx > 0 ? 1 : -1)
  inst.speedTarget = wp.swim ? FLEE_SWIM_SPEED : FLEE_RUN_SPEED
  easeSpeed(inst, dt, FLEE_SPEED_EASE)
  inst.x += inst.vx * dt
  const passed = inst.dir > 0 ? inst.x > wp.x : inst.x < wp.x
  passed && (inst.x = wp.x)
  clampPredatorClearOfIsland(inst)
  const ease = Math.min(1, dt * FLEE_POSE_EASE)
  inst.headLift += ((wp.swim ? 0 : FLEE_HEAD_LIFT * 0.5) - inst.headLift) * ease
  inst.stretch += ((wp.swim ? 1 : FLEE_STRETCH) - inst.stretch) * ease
}

//
// The island blocks a westward swim waypoint; the crawler stops in the
// water just east of it instead.
//
function fleeIslandStopX(inst, wp) {
  if (!wp.swim) return null
  const stopX = EyeFlower.predatorMinX(inst.levelInst?.eyeFlower)
  if (stopX == null || wp.x >= stopX || inst.x < stopX) return null
  return stopX
}
//
// Speed falls with the distance left, so the swim brakes to a halt before the
// island. A rider keeps it waiting there (his jump onto the island starts the turn);
// alone it rests, turns and swims back to the shore.
//
function tickFleeIslandArrival(inst, dt, stopX) {
  const dist = inst.x - stopX
  if (dist > FLEE_ARRIVE_PX) {
    !inst.holdFacing && (inst.dir = -1)
    inst.speedTarget = Math.min(FLEE_SWIM_SPEED, dist * ISLAND_ARRIVE_DECEL_PER_SEC)
    easeSpeed(inst, dt, FLEE_SPEED_EASE)
    inst.x += inst.vx * dt
    inst.x < stopX && (inst.x = stopX)
  } else {
    inst.speedTarget = 0
    easeSpeed(inst, dt, ISLAND_STOP_SPEED_EASE)
    inst.x = Math.max(stopX, inst.x + inst.vx * dt)
    !rideFacingLocked(inst) && beginIslandShoreRetreat(inst, true)
  }
  const ease = Math.min(1, dt * FLEE_POSE_EASE)
  inst.headLift += (0 - inst.headLift) * ease
  inst.stretch += (1 - inst.stretch) * ease
}

function finishFlee(inst) {
  inst.swimming = false
  inst.fleePath = null
  inst.vx *= FLEE_END_VX_KEEP
  enter(inst, 'search', FLEE_END_SEARCH_DELAY)
}

function tickRoamHome(inst, dt) {
  inst.state = 'search'
  inst.burst -= dt
  const home = inst.homeX
  const dx = home == null ? 0 : home - inst.x
  const away = home != null && Math.abs(dx) > ROAM_HOME_WANDER_PX
  inst.roamTurnCooldown = Math.max(0, (inst.roamTurnCooldown ?? 0) - dt)
  if (inst.burst <= 0) {
    inst.speedTarget = ROAM_SPEEDS[Math.floor(Math.random() * ROAM_SPEEDS.length)]
    inst.burst = 0.2 + Math.random() * 0.7
    if (!inst.holdFacing) {
      if (away) inst.dir = Math.sign(dx) || inst.dir
      else if (inst.roamTurnCooldown <= 0 && Math.random() < ROAM_TURN_CHANCE) {
        inst.dir *= -1
        inst.roamTurnCooldown = ROAM_TURN_MIN_INTERVAL_SEC + Math.random() * ROAM_TURN_INTERVAL_RANGE_SEC
      }
    }
    inst.lookBack = Math.random() < 0.16
    inst.headLift = Math.random() < 0.2 ? 3 + Math.random() * 3 : 0
  } else if (away && !inst.holdFacing && Math.sign(dx) !== 0 && Math.sign(dx) !== inst.dir &&
    Math.random() < dt * 1.6) {
    inst.dir = Math.sign(dx)
  }
  easeSpeed(inst, dt, 8)
  softenHeadPose(inst, dt)
}

function tickSearch(inst, dt) {
  inst.burst -= dt
  if (inst.burst <= 0) {
    inst.speedTarget = SEARCH_SPEEDS[Math.floor(Math.random() * SEARCH_SPEEDS.length)]
    inst.burst = 0.18 + Math.random() * 0.55
    if (!inst.holdFacing && Math.random() < 0.22) {
      inst.dir *= -1
      inst.burst = 0.12 + Math.random() * 0.2
    }
    inst.lookBack = Math.random() < 0.18
    inst.headLift = Math.random() < 0.2 ? 4 + Math.random() * 3 : 0
  }
  easeSpeed(inst, dt, 8)
  if (!inst.holdFacing && inst.x < inst.minX + 8) inst.dir = 1
  if (!inst.holdFacing && inst.x > inst.maxX - 8) inst.dir = -1
}

//
// Heads for the hero's x clamped to the patrol strip. Close to it (or with the
// hero above / past the strip edge) it stops instead of flipping its heading
// every frame; a turn needs the target clearly on the other side.
//
function hunt(inst, dt, hero, speed, charge) {
  if (!hero) {
    enter(inst, 'search', 0.2)
    return
  }
  const dx = clamp(hero.x, inst.minX, inst.maxX) - inst.x
  const rate = charge ? 18 : 12
  const behind = Math.sign(dx) !== inst.dir
  if (Math.abs(dx) <= HUNT_ARRIVE_PX || (behind && Math.abs(dx) <= HUNT_TURN_DEADBAND_PX)) {
    inst.speedTarget = 0
    easeSpeed(inst, dt, rate)
    return
  }
  behind && !inst.holdFacing && (inst.dir = Math.sign(dx))
  const wobble = Math.sin(inst.idleTime * (charge ? 14 : 6) + inst.wobblePhase) * (charge ? 10 : 6)
  inst.speedTarget = speed + wobble
  easeSpeed(inst, dt, rate)
}

//
// Remembers which side the hero was last seen on; reappearing on the other
// side nearby means he jumped over, which starts the chase.
//
function trackJumpOver(inst, hero, dx, dist) {
  if (Math.abs(dx) < PURSUIT_SIDE_MIN_DX) return
  const side = Math.sign(dx)
  const jumpedOver = inst.heroSide != null && side !== inst.heroSide && dist <= PURSUIT_TRIGGER_RADIUS
  jumpedOver && (inst.pursuitT = PURSUIT_DURATION, inst.orientKick = true)
  inst.heroSide = side
  inst.heroLastX = hero.x
}

function lungeSpeed(inst) {
  return inst.pursuitT > 0 ? PURSUIT_LUNGE_SPEED : LUNGE_SPEED
}

function forgetHeroSide(inst) {
  inst.heroSide = null
  inst.pursuitT = 0
}

//
// Runs to where the hero was last seen; reaching that spot ends the chase
// (circling it until the timer ran out read as a freeze with twitching).
//
function chaseLastSeen(inst, dt) {
  const lastX = clamp(inst.heroLastX ?? inst.x, inst.minX, inst.maxX)
  if (Math.abs(lastX - inst.x) <= PURSUIT_LAST_SEEN_ARRIVE_PX) {
    inst.pursuitT = 0
    tickRoamHome(inst, dt)
    return
  }
  inst.state = 'hunt'
  hunt(inst, dt, { x: lastX }, PURSUIT_SPEED, true)
  easePursuitPose(inst, dt)
}

function easePursuitPose(inst, dt) {
  const ease = Math.min(1, dt * PURSUIT_POSE_EASE)
  inst.headLift += (PURSUIT_HEAD_LIFT - inst.headLift) * ease
  inst.stretch += (PURSUIT_STRETCH - inst.stretch) * ease
}

function softenHeadPose(inst, dt) {
  const liftTarget = inst.state === 'search' && inst.headLift > 0 ? inst.headLift : 0
  inst.headLift += (liftTarget - inst.headLift) * Math.min(1, dt * 6)
  inst.stretch += (1 - inst.stretch) * Math.min(1, dt * 5)
}

function easeSpeed(inst, dt, rate) {
  const prev = inst.vx
  const target = inst.dir * Math.max(0, inst.speedTarget)
  inst.vx += (target - inst.vx) * Math.min(1, dt * rate)
  inst.ax = (inst.vx - prev) / Math.max(dt, 0.001)
}

function tickIslandShoreRetreat(inst, dt) {
  const shoreX = inst.islandRetreatX
  if (shoreX == null) return false
  inst.swimming = true
  inst.islandRetreatT = (inst.islandRetreatT ?? 0) + dt
  if (inst.islandRetreatPhase === RETREAT_PHASE_STOP) {
    tickIslandRetreatStop(inst, dt)
    return true
  }
  if (inst.islandRetreatPhase === RETREAT_PHASE_TURN) {
    tickIslandRetreatTurn(inst, dt)
    return true
  }
  const dx = shoreX - inst.x
  if (Math.abs(dx) <= FLEE_ARRIVE_PX) {
    inst.islandRetreatX = null
    inst.islandRetreatPhase = null
    inst.swimming = false
    inst.vx *= FLEE_END_VX_KEEP
    inst.dir = 1
    inst.stretch += (1 - inst.stretch) * Math.min(1, dt * 5)
    return true
  }
  inst.dir = dx > 0 ? 1 : -1
  inst.speedTarget = ISLAND_RETREAT_SWIM_SPEED
  inst.stretch += (1 - inst.stretch) * Math.min(1, dt * 4)
  softenHeadPose(inst, dt)
  easeSpeed(inst, dt, ISLAND_RETREAT_SPEED_EASE)
  inst.x += inst.vx * dt
  inst.dir > 0 && inst.x > shoreX && (inst.x = shoreX)
  inst.dir < 0 && inst.x < shoreX && (inst.x = shoreX)
  clampPredatorClearOfIsland(inst)
  return true
}

function tickIslandRetreatStop(inst, dt) {
  inst.speedTarget = 0
  easeSpeed(inst, dt, ISLAND_STOP_SPEED_EASE)
  inst.x += inst.vx * dt
  clampPredatorClearOfIsland(inst)
  softenHeadPose(inst, dt)
  if (inst.islandRetreatT < ISLAND_STOP_PAUSE_SEC) return
  inst.islandRetreatPhase = RETREAT_PHASE_TURN
  inst.islandRetreatT = 0
}
//
// Land-style turn: the heading flips, the head only creeps forward and a slow
// spine follow lets the body fold over behind it instead of snapping across.
//
function tickIslandRetreatTurn(inst, dt) {
  inst.dir = 1
  inst.spineFollowRate = ISLAND_TURN_SPINE_FOLLOW_RATE
  inst.speedTarget = ISLAND_TURN_CREEP_SPEED
  easeSpeed(inst, dt, ISLAND_RETREAT_SPEED_EASE)
  inst.x += inst.vx * dt
  clampPredatorClearOfIsland(inst)
  softenHeadPose(inst, dt)
  if (inst.islandRetreatT < ISLAND_TURN_SEC) return
  inst.spineFollowRate = null
  inst.islandRetreatPhase = RETREAT_PHASE_SWIM
  inst.islandRetreatT = 0
}

function clampPredatorClearOfIsland(inst) {
  const level = inst.levelInst
  const minX = level && EyeFlower.predatorMinX(level.eyeFlower)
  const water = inst.water
  const islandX = level?.eyeFlower?.x
  if (minX == null || !water || islandX == null) return
  if (inst.x < water.x1 || inst.x > water.x2) return
  if (Math.abs(inst.x - islandX) > 160) return
  if (inst.x >= minX) return
  inst.x = minX
  //
  // Block sliding onto the island from the right; allow negative vx when leaving
  // back toward the east shore.
  //
  inst.vx > 0 && (inst.vx = 0)
}

function keepInside(inst) {
  clampPredatorClearOfIsland(inst)
  if (inst.holdFacing) {
    if (inst.x < inst.minX) {
      inst.x = inst.minX
      inst.vx = 0
    } else if (inst.x > inst.maxX) {
      inst.x = inst.maxX
      inst.vx = 0
    }
    applyRideFacingLock(inst)
    return
  }
  if (inst.x < inst.minX) {
    inst.x = inst.minX
    inst.vx = Math.abs(inst.vx) * 0.2
    inst.dir = 1
  } else if (inst.x > inst.maxX) {
    inst.x = inst.maxX
    inst.vx = -Math.abs(inst.vx) * 0.2
    inst.dir = -1
  }
}

function rideFacingLocked(inst) {
  const twigs = inst.levelInst?.shoreFallTwigs
  return Boolean(twigs?.riderLocked && mountedTwigOnPredator(twigs))
}

function mountedTwigOnPredator(twigs) {
  return twigs?.twigs?.some(twig => twig.phase === 'predatorMount')
}

function applyRideFacingLock(inst) {
  const twigs = inst.levelInst?.shoreFallTwigs
  if (!twigs?.riderLocked || !mountedTwigOnPredator(twigs)) {
    if (twigs?.rideTurnDisembark && twigs.rideTurnPending) {
      inst.holdFacing = true
      return
    }
    inst.holdFacing = false
    return
  }
  if (inst.state === 'flee') {
    inst.holdFacing = false
    syncTwigRideDirFromPredator(inst)
    inst.lookBack = false
    return
  }
  if (twigs.rideTurnPending) {
    inst.holdFacing = true
    inst.lookBack = false
    return
  }
  twigs.rideDir == null && (twigs.rideDir = inst.dir)
  inst.holdFacing = true
  inst.dir = twigs.rideDir
  inst.lookBack = false
}
function syncTwigRideDirFromPredator(inst) {
  const twigs = inst.levelInst?.shoreFallTwigs
  if (!twigs) return
  twigs.rideDir = inst.dir
}

function tickRideLockedMove(inst, dt) {
  inst.state = 'search'
  inst.lookBack = false
  inst.headLift = 0
  inst.speedTarget = RIDE_WALK_SPEED
  easeSpeed(inst, dt, RIDE_SPEED_EASE)
  softenHeadPose(inst, dt)
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v))
}

function enter(inst, state, time) {
  inst.state = state
  inst.stateTime = time
  state === 'search' && (inst.lookBack = false)
  state === 'lunge' && (inst.orientKick = true)
}
