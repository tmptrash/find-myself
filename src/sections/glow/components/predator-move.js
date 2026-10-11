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

/**
 * @param {Object} inst
 * @param {number} dt
 * @param {{ x: number, y: number }|null} hero
 */
export function tickMove(inst, dt, hero) {
  if (inst.state === 'feast') return
  inst.stateTime -= dt
  inst.idleTime += dt
  if (inst.state === 'coast') {
    inst.vx *= Math.exp(-dt * 3.2)
    inst.x += inst.vx * dt
    inst.stretch += (1 - inst.stretch) * Math.min(1, dt * 4)
    keepInside(inst)
    if (inst.stateTime <= 0) enter(inst, 'search', 0.2)
    return
  }
  if (!hero) {
    tickSearch(inst, dt)
    inst.x += inst.vx * dt
    keepInside(inst)
    softenHeadPose(inst, dt)
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

function tickSearch(inst, dt) {
  inst.burst -= dt
  if (inst.burst <= 0) {
    inst.speedTarget = SEARCH_SPEEDS[Math.floor(Math.random() * SEARCH_SPEEDS.length)]
    inst.burst = 0.18 + Math.random() * 0.55
    if (Math.random() < 0.22) {
      inst.dir *= -1
      inst.burst = 0.12 + Math.random() * 0.2
    }
    inst.lookBack = Math.random() < 0.18
    inst.headLift = Math.random() < 0.2 ? 4 + Math.random() * 3 : 0
  }
  easeSpeed(inst, dt, 8)
  if (inst.x < inst.minX + 8) inst.dir = 1
  if (inst.x > inst.maxX - 8) inst.dir = -1
}

function hunt(inst, dt, hero, speed, charge) {
  if (!hero) {
    enter(inst, 'search', 0.2)
    return
  }
  const want = hero.x >= inst.x ? 1 : -1
  inst.dir = want
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

function enter(inst, state, time) {
  inst.state = state
  inst.stateTime = time
  state === 'search' && (inst.lookBack = false)
  state === 'lunge' && (inst.orientKick = true)
}
