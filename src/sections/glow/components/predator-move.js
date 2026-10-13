import { isTwigPausingPredatorMove } from '../utils/glow-horiz-fall-twig.js'

//
// Distance bands around the hero (world px — ~100 px per meter on this level):
// beyond 2 m drift slowly inward, inside 2 m run, inside 1 m lunge.
//

const GLOW_METER_PX = 100
const HERO_ALERT_FAR_RADIUS = GLOW_METER_PX * 2
const HERO_ALERT_NEAR_RADIUS = GLOW_METER_PX
const PATROL_DRIFT_SPEED = 58
const HUNT_RUN_SPEED = 142
const LUNGE_SPEED = 298
const LUNGE_DURATION = 0.36

const SEARCH_SPEEDS = [0, 0, 22, 38, 58]
//
// Off the ground line the crawler drifts back to its home mushroom, not a
// straight patrol: speed and facing keep changing on the way.
//
const ROAM_SPEEDS = [0, 18, 34, 52, 74]
const ROAM_HOME_WANDER_PX = 72
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
//
// With the hero standing on the stick the crawler keeps one steady walk.
//
const RIDE_WALK_SPEED = PATROL_DRIFT_SPEED
const RIDE_SPEED_EASE = 4

/**
 * @param {Object} inst
 * @param {number} dt
 * @param {{ x: number, y: number }|null} hero
 */
export function tickMove(inst, dt, hero) {
  if (inst.state === 'feast') return
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
  if (!hero) {
    tickRoamHome(inst, dt)
    inst.x += inst.vx * dt
    keepInside(inst)
    return
  }
  const dx = hero.x - inst.x
  const dy = hero.y - inst.y
  const dist = Math.hypot(dx, dy)
  if (inst.state === 'lunge') {
    inst.lungeT -= dt
    hunt(inst, dt, hero, LUNGE_SPEED, true)
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
    hunt(inst, dt, hero, LUNGE_SPEED, true)
    inst.headLift = 11
    inst.stretch = 1.34
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
  const ease = Math.min(1, dt * FLEE_POSE_EASE)
  inst.headLift += ((wp.swim ? 0 : FLEE_HEAD_LIFT * 0.5) - inst.headLift) * ease
  inst.stretch += ((wp.swim ? 1 : FLEE_STRETCH) - inst.stretch) * ease
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
  if (inst.burst <= 0) {
    inst.speedTarget = ROAM_SPEEDS[Math.floor(Math.random() * ROAM_SPEEDS.length)]
    inst.burst = 0.2 + Math.random() * 0.7
    if (!inst.holdFacing) {
      if (away) inst.dir = Math.sign(dx) || inst.dir
      else if (Math.random() < 0.55) inst.dir *= -1
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

function hunt(inst, dt, hero, speed, charge) {
  if (!hero) {
    enter(inst, 'search', 0.2)
    return
  }
  if (!inst.holdFacing) inst.dir = hero.x >= inst.x ? 1 : -1
  const wobble = Math.sin(inst.idleTime * (charge ? 14 : 6) + inst.wobblePhase) * (charge ? 10 : 6)
  inst.speedTarget = speed + wobble
  easeSpeed(inst, dt, charge ? 18 : 12)
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

function keepInside(inst) {
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

function enter(inst, state, time) {
  inst.state = state
  inst.stateTime = time
  state === 'search' && (inst.lookBack = false)
  state === 'lunge' && (inst.orientKick = true)
}
