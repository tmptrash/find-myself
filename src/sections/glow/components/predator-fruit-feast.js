//
// Predator breaks off to eat a fruit knocked from the big tree, from any distance.
//

import { getGlowFruitDisplayRadius, keepGlowFruitRestingOnFloor } from '../utils/glow-tree-fruit.js'

const FEAST_APPROACH_BURST_MULT = 0.72
const FEAST_APPROACH_SPEED = 280
const FEAST_SNOUT_REACH = 7
const FEAST_SNOUT_DROP = 2.4
const FEAST_APPROACH_SNAP_GAP = 36
const FEAST_APPROACH_SNAP_DIST = 58
const FEAST_APPROACH_MAX_SEC = 14
const FEAST_HEAD_RIDE = 15
const FEAST_BITE_COUNT = 10
const FEAST_BITE_FORWARD_SEC = 0.28
const FEAST_BITE_BACK_SEC = 0.34
const FEAST_BITE_PAUSE_SEC = 0.38
const FEAST_BITE_PULLBACK_X = 18
const FEAST_BITE_PULLBACK_LIFT = 6.5
const FEAST_CLUSTER_RADIUS = 52
const FEAST_MAX_FRUIT_EQUIV = 2

/**
 * @param {Object} pred - Predator inst
 * @returns {boolean}
 */
export function isPredatorFeasting(pred) {
  return pred?.state === 'feast'
}

/**
 * @param {Object} pred - Predator inst
 * @returns {{ x: number, y: number }|null}
 */
export function getPredatorFeastLookTarget(pred) {
  const fruit = pred?.feastFruit
  if (!fruit || fruit.removed) return null
  const pt = predatorSnoutPoint(pred)
  return pt ?? { x: fruit.x, y: fruit.y }
}

/**
 * Drops the current meal (e.g. when a burst scares the crawler away).
 * @param {Object} pred - Predator inst
 */
export function cancelPredatorFeast(pred) {
  pred && endFeast(pred, pred.levelInst)
}

/**
 * Claims nearby settled fruit and drives approach / eat phases.
 * @param {Object} pred - Predator inst
 * @param {Object} levelInst - Glow level inst
 * @param {number} dt - Frame delta
 */
export function tickPredatorFruitFeast(pred, levelInst, dt) {
  if (!pred || pred.obj?.hidden || pred.state === 'coast' || pred.state === 'flee') return
  if (!levelInst?.zones?.predatorAwake) return
  //
  // A rider on the back pins the walking direction — turning to a fruit would flip it.
  //
  if (levelInst.shoreFallTwigs?.riderLocked) {
    pred.state === 'feast' && endFeast(pred, levelInst)
    return
  }
  if (pred.state === 'feast') {
    tickActiveFeast(pred, levelInst, dt)
    return
  }
  const fruit = findNearestFeastFruit(levelInst, pred)
  fruit && beginFeast(pred, fruit, levelInst)
}

function tickActiveFeast(pred, levelInst, dt) {
  const fruit = pred.feastFruit
  if (!fruit || fruit.removed) {
    endFeast(pred, levelInst)
    return
  }
  if (pred.feastPhase === 'approach') {
    tickFeastApproach(pred, fruit, dt)
    return
  }
  tickFeastEating(pred, fruit, levelInst, dt)
}

function tickFeastApproach(pred, fruit, dt) {
  pred.feastApproachT = (pred.feastApproachT ?? 0) + dt
  facePredatorTowardFruit(pred, fruit)
  pred.lookBack = false
  const gap = snoutToFruitSurfaceGap(pred, fruit)
  const notice = fruitFeastNoticeDist(pred, fruit)
  if (gap <= FEAST_APPROACH_SNAP_GAP || notice < FEAST_APPROACH_SNAP_DIST || pred.feastApproachT >= FEAST_APPROACH_MAX_SEC) {
    pred.vx = 0
    beginFeastEatingCycle(pred, fruit)
    return
  }
  const targetX = feastApproachHeadX(pred, fruit)
  const dx = targetX - pred.x
  const move = Math.sign(dx) * Math.min(Math.abs(dx), FEAST_APPROACH_SPEED * dt)
  pred.x += move
  pred.vx = move / Math.max(dt, 0.001)
  keepPredatorInside(pred)
  alignFeastApproachHeadLift(pred, fruit)
  pred.stretch += (1.08 - pred.stretch) * Math.min(1, dt * 5)
}

function beginFeastEatingCycle(pred, fruit) {
  pred.feastPhase = 'eat'
  pred.feastBitePhase = 'pause'
  pred.feastBitePhaseT = 0
  pred.feastBitesDone = 0
  pred.feastTotalBites = pred.feastTotalBites ?? FEAST_BITE_COUNT
  pred.vx = 0
  pred.speedTarget = 0
  fruit.eatProgress = 0
  keepGlowFruitRestingOnFloor(fruit)
  refreshFeastBitePose(pred, fruit)
  pred.feastRestPose = {
    x: pred.feastBitePose.x - pred.dir * FEAST_BITE_PULLBACK_X,
    headLift: pred.feastBitePose.headLift + FEAST_BITE_PULLBACK_LIFT
  }
  applyFeastBitePose(pred, 'pause', 0)
  pred.feastApproachT = 0
}

function tickFeastEating(pred, fruit, levelInst, dt) {
  pred.vx = 0
  pred.speedTarget = 0
  const phase = pred.feastBitePhase ?? 'pause'
  const phaseDur = feastBitePhaseDuration(phase)
  pred.feastBitePhaseT = (pred.feastBitePhaseT ?? 0) + dt
  let t = Math.min(1, pred.feastBitePhaseT / phaseDur)
  applyFeastBitePose(pred, phase, smoothstep(t))
  pred.stretch = 1.02 + (phase === 'forward' ? 0.08 * (1 - t) : 0)
  if (pred.feastBitePhaseT < phaseDur) return
  pred.feastBitePhaseT = 0
  if (phase === 'pause') {
    pred.feastBitePhase = 'forward'
    refreshFeastBitePose(pred, fruit)
    return
  }
  if (phase === 'forward') {
    applyFeastBiteChunk(pred, fruit)
    pred.feastBitePhase = 'back'
    if ((fruit.eatProgress ?? 0) >= 1 || getGlowFruitDisplayRadius(fruit) < 1.5) {
      finishFeastCluster(pred, levelInst)
      return
    }
    return
  }
  phase === 'back' && (pred.feastBitePhase = 'pause')
}

function applyFeastBiteChunk(pred, fruit) {
  pred.feastBitesDone = (pred.feastBitesDone ?? 0) + 1
  const total = pred.feastTotalBites ?? FEAST_BITE_COUNT
  fruit.eatProgress = Math.min(1, pred.feastBitesDone / total)
  fruit.biteCount = (fruit.biteCount ?? 0) + 1
  pushFruitBiteMark(fruit)
  keepGlowFruitRestingOnFloor(fruit)
}

function feastBitePhaseDuration(phase) {
  if (phase === 'forward') return FEAST_BITE_FORWARD_SEC
  if (phase === 'back') return FEAST_BITE_BACK_SEC
  return FEAST_BITE_PAUSE_SEC
}

function applyFeastBitePose(pred, phase, t) {
  const rest = pred.feastRestPose
  const bite = pred.feastBitePose
  if (!rest || !bite) return
  if (phase === 'forward') {
    pred.x = rest.x + (bite.x - rest.x) * t
    pred.headLift = rest.headLift + (bite.headLift - rest.headLift) * t
    return
  }
  if (phase === 'back') {
    pred.x = bite.x + (rest.x - bite.x) * t
    pred.headLift = bite.headLift + (rest.headLift - bite.headLift) * t
    return
  }
  pred.x = rest.x
  pred.headLift = rest.headLift
}

function refreshFeastBitePose(pred, fruit) {
  const head = pred.segments?.[0]
  const headR = head?.radius ?? 11
  const fruitR = getGlowFruitDisplayRadius(fruit)
  facePredatorTowardFruit(pred, fruit)
  const forward = headR + FEAST_SNOUT_REACH
  const biteX = fruit.x - pred.dir * (fruitR * 0.78 + forward)
  const groundY = pred.groundAt(biteX)
  const biteLift = Math.max(2, Math.min(18, groundY - FEAST_HEAD_RIDE - (fruit.y - FEAST_SNOUT_DROP)))
  pred.feastBitePose = { x: biteX, headLift: biteLift }
}

function alignFeastApproachHeadLift(pred, fruit) {
  const groundY = pred.groundAt(pred.x)
  pred.headLift = Math.max(2, Math.min(18, groundY - FEAST_HEAD_RIDE - (fruit.y - FEAST_SNOUT_DROP)))
}

function smoothstep(t) {
  const x = Math.max(0, Math.min(1, t))
  return x * x * (3 - 2 * x)
}

function beginFeast(pred, fruit, levelInst) {
  const cluster = collectFeastCluster(levelInst, fruit)
  const equiv = Math.min(FEAST_MAX_FRUIT_EQUIV, cluster.length)
  pred.state = 'feast'
  pred.feastPhase = 'approach'
  pred.feastCluster = cluster
  pred.feastFruit = fruit
  pred.feastBitePhase = null
  pred.feastBitePhaseT = 0
  pred.feastBitesDone = 0
  pred.feastTotalBites = FEAST_BITE_COUNT * equiv
  pred.feastRestPose = null
  pred.feastBitePose = null
  pred.feastApproachT = 0
  facePredatorTowardFruit(pred, fruit)
  pred.lookBack = false
  pred.orientKick = true
  pred.speedTarget = FEAST_APPROACH_SPEED
  pred.vx = pred.dir * FEAST_APPROACH_SPEED * FEAST_APPROACH_BURST_MULT
  pred.stretch = 1.1
  pred.headLift = 6
  cluster.forEach((f, i) => {
    f.beingEaten = true
    f.feastDrawHidden = i > 0
    f.fadeOutStarted = false
    f.eatProgress = 0
    f.biteSeed == null && (f.biteSeed = (Math.round(f.x * 5.3) ^ Math.round(f.y * 3.7)) >>> 0)
  })
}

function finishFeastCluster(pred, levelInst) {
  const cluster = pred.feastCluster ?? (pred.feastFruit ? [pred.feastFruit] : [])
  cluster.forEach(f => {
    f.removed = true
    f.feastDrawHidden = false
  })
  levelInst.treeFruitSpots = levelInst.treeFruitSpots?.filter(f => !f.removed)
  endFeast(pred, levelInst)
}

function endFeast(pred, levelInst) {
  pred.feastCluster?.forEach(f => {
    f.beingEaten = false
    f.feastDrawHidden = false
  })
  pred.state = 'search'
  pred.stateTime = 0.28
  pred.feastCluster = null
  pred.feastFruit = null
  pred.feastPhase = null
  pred.feastBitePhase = null
  pred.feastBitePhaseT = 0
  pred.feastBitesDone = 0
  pred.feastTotalBites = FEAST_BITE_COUNT
  pred.feastRestPose = null
  pred.feastBitePose = null
  pred.vx *= 0.35
  pred.headLift *= 0.4
}

function collectFeastCluster(levelInst, anchor) {
  const spots = levelInst?.treeFruitSpots
  if (!spots?.length) return [anchor]
  const cluster = []
  spots.forEach(fruit => {
    if (!isFruitFeastEligible(fruit)) return
    if (Math.hypot(fruit.x - anchor.x, fruit.y - anchor.y) > FEAST_CLUSTER_RADIUS) return
    cluster.push(fruit)
  })
  cluster.includes(anchor) || cluster.push(anchor)
  return cluster
}

function findNearestFeastFruit(levelInst, pred) {
  const spots = levelInst.treeFruitSpots
  if (!spots?.length) return null
  let best = null
  let bestDist = Infinity
  spots.forEach(fruit => {
    if (!isFruitFeastEligible(fruit)) return
    const d = fruitFeastNoticeDist(pred, fruit)
    d < bestDist && (bestDist = d, best = fruit)
  })
  return best
}

function isFruitFeastEligible(fruit) {
  if (fruit.removed || fruit.attached || fruit.beingEaten) return false
  return true
}

function fruitFeastNoticeDist(pred, fruit) {
  const headY = pred.segments?.[0]?.y ?? pred.y
  return Math.hypot(fruit.x - pred.x, fruit.y - headY + 10)
}

function facePredatorTowardFruit(pred, fruit) {
  pred.dir = fruit.x >= pred.x ? 1 : -1
}

function fruitPredatorDist(pred, fruit) {
  const snout = predatorSnoutPoint(pred)
  if (!snout) return Infinity
  const fruitR = getGlowFruitDisplayRadius(fruit)
  return Math.hypot(fruit.x - snout.x, fruit.y - snout.y) - fruitR
}

function predatorSnoutPoint(pred) {
  const head = pred.segments?.[0]
  if (!head) return null
  const forward = head.radius + FEAST_SNOUT_REACH
  return {
    x: pred.x + pred.dir * forward,
    y: head.y + FEAST_SNOUT_DROP
  }
}

function snoutToFruitSurfaceGap(pred, fruit) {
  const snout = predatorSnoutPoint(pred)
  if (!snout) return Infinity
  const fruitR = getGlowFruitDisplayRadius(fruit)
  return Math.hypot(fruit.x - snout.x, fruit.y - snout.y) - fruitR
}

function feastApproachHeadX(pred, fruit) {
  const head = pred.segments?.[0]
  const forward = (head?.radius ?? 11) + FEAST_SNOUT_REACH
  const fruitR = getGlowFruitDisplayRadius(fruit)
  const dir = fruit.x >= pred.x ? 1 : -1
  return fruit.x - dir * (fruitR * 0.78 + forward)
}

function pushFruitBiteMark(fruit) {
  const marks = fruit.biteMarks ?? []
  const rng = mulberry32((fruit.biteSeed ?? 0) + marks.length * 41)
  marks.push({
    angle: rng() * Math.PI * 2,
    depth: 0.35 + rng() * 0.35,
    width: 0.4 + rng() * 0.35
  })
  fruit.biteMarks = marks
}

function easeFeastSpeed(pred, dt, rate) {
  const prev = pred.vx
  const target = pred.dir * Math.max(0, pred.speedTarget)
  pred.vx += (target - pred.vx) * Math.min(1, dt * rate)
  pred.ax = (pred.vx - prev) / Math.max(dt, 0.001)
}

function keepPredatorInside(pred) {
  const fruit = pred.feastFruit
  const minX = fruit && !fruit.removed ? Math.min(pred.minX, fruit.x - 24) : pred.minX
  const maxX = fruit && !fruit.removed ? Math.max(pred.maxX, fruit.x + 24) : pred.maxX
  if (pred.x < minX) {
    pred.x = minX
    pred.vx = Math.abs(pred.vx) * 0.2
    pred.dir = 1
  } else if (pred.x > maxX) {
    pred.x = maxX
    pred.vx = -Math.abs(pred.vx) * 0.2
    pred.dir = -1
  }
}

function mulberry32(seed) {
  let t = seed >>> 0
  return () => {
    t += 0x6D2B79F5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}
