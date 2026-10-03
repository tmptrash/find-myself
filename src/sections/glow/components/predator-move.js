//
// Speed comes in bursts: a short rush, a stop, a few fast steps, another
// stop. Steering during a hunt is corrected every frame but never perfectly
// straight.
//

const SEARCH_SPEEDS = [0, 0, 16, 28, 46]
const NOTICE_RADIUS = 210
const ATTACK_RADIUS = 78
const LOSE_RADIUS = 280

/**
 * @param {Object} inst
 * @param {number} dt
 * @param {{ x: number, y: number }|null} hero
 */
export function tickMove(inst, dt, hero) {
  inst.stateTime -= dt
  inst.idleTime += dt
  const dist = hero ? hero.x - inst.x : 9999
  const abs = Math.abs(dist)
  if (inst.state === 'coast') {
    inst.vx *= Math.exp(-dt * 3.2)
    inst.x += inst.vx * dt
    inst.stretch += (1 - inst.stretch) * Math.min(1, dt * 4)
    keepInside(inst)
    if (inst.stateTime <= 0) enter(inst, 'search', 0.2)
    return
  }
  if (inst.state === 'search') {
    tickSearch(inst, dt)
    abs < NOTICE_RADIUS && hero && enter(inst, 'notice', 0.1 + Math.random() * 0.2)
  } else if (inst.state === 'notice') {
    inst.speedTarget = 0
    easeSpeed(inst, dt, 18)
    inst.stateTime <= 0 && enter(inst, 'orient', 0.22 + Math.random() * 0.16)
  } else if (inst.state === 'orient') {
    inst.speedTarget = 0
    easeSpeed(inst, dt, 14)
    hero && (inst.dir = dist >= 0 ? 1 : -1)
    inst.headLift = 3
    inst.stateTime <= 0 && enter(inst, 'approach', 0)
  } else if (inst.state === 'approach') {
    hunt(inst, dt, hero, 36, false)
    abs < ATTACK_RADIUS && enter(inst, 'charge', 0)
    abs > LOSE_RADIUS && enter(inst, 'search', 0.3)
  } else if (inst.state === 'charge') {
    hunt(inst, dt, hero, 108, true)
    abs > LOSE_RADIUS && enter(inst, 'search', 0.4)
  }
  inst.x += inst.vx * dt
  keepInside(inst)
  const liftTarget = inst.state === 'search' && inst.headLift > 0 ? inst.headLift : inst.state === 'orient' ? 3 : 0
  inst.headLift += (liftTarget - inst.headLift) * Math.min(1, dt * 6)
  inst.stretch += ((inst.state === 'charge' ? 1.28 : 1) - inst.stretch) * Math.min(1, dt * 5)
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
  easeSpeed(inst, dt, charge ? 12 : 7)
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
  state === 'orient' && (inst.orientKick = true)
}
