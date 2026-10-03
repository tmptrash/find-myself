//
// One large eye on the head. It picks look targets in saccades and locks
// onto the hero once the creature has noticed them.
//

const SPOTS = [
  { x: 1, y: -0.1 },
  { x: 0.2, y: 0.8 },
  { x: -0.7, y: 0.15 },
  { x: 0.6, y: -0.7 },
  { x: -0.2, y: 0.9 },
  { x: 0.9, y: 0.4 }
]

/**
 * @param {Object} inst
 */
export function initEyes(inst) {
  inst.eyes = [
    { ox: 3.4, oy: -5.6, bias: 0.15, hold: 0.12, px: 0.2, py: -0.15 }
  ]
}

/**
 * @param {Object} inst
 * @param {number} dt
 * @param {{ x: number, y: number }|null} hero
 */
export function tickEyes(inst, dt, hero) {
  const lock = inst.state === 'notice' || inst.state === 'orient' ||
    inst.state === 'approach' || inst.state === 'charge'
  inst.eyes.forEach(eye => {
    if (lock && hero) {
      const dx = hero.x - inst.x
      const dy = (hero.y - 16) - inst.segments[0].y
      const len = Math.hypot(dx, dy) || 1
      eye.px = (dx / len) * 1.05 + eye.bias * 0.35
      eye.py = (dy / len) * 0.85
      return
    }
    eye.hold -= dt
    if (eye.hold > 0) return
    const spot = SPOTS[Math.floor(Math.random() * SPOTS.length)]
    const back = inst.lookBack ? -1 : 1
    eye.px = spot.x * back * (0.55 + Math.abs(eye.bias))
    eye.py = spot.y * (0.4 + Math.random() * 0.5)
    eye.hold = Math.random() < 0.25
      ? 0.04 + Math.random() * 0.05
      : 0.12 + Math.random() * 0.38
  })
}
