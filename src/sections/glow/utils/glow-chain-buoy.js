//
// Segmented stick-on-a-chain decor, planted upright — reads as a buoy
// anchored to the seabed by its chain. A dark eye rides the topmost segment
// and its pupil tracks the hero. The chain itself is a flat solid-black
// silhouette (no outline/fill split) — only the eye carries a lighter fill.
//
const BUOY_SEGMENT_COUNT = 7
const BUOY_SEGMENT_LEN = 26
const BUOY_SEGMENT_WIDTH = 5
const BUOY_JOINT_RADIUS = 3.6
const BUOY_SWAY_AMP = 0.14
const BUOY_SWAY_SPEED = 1.1
//
// Phase lag between consecutive segments and per-segment amplitude growth —
// together these give the chain a floppy, top-heavy sway instead of a rigid
// rocking motion.
//
const BUOY_SEGMENT_LAG = 0.55
const BUOY_AMP_GROWTH = 1.35
const BUOY_EYE_RADIUS = 11
const BUOY_EYE_OUTLINE_WIDTH = 2
const BUOY_PUPIL_RADIUS = 4.5
const BUOY_PUPIL_MAX_OFFSET = 5

/**
 * Creates the chain-buoy decor inst for a set of ground-anchored spots.
 * @param {Object} cfg - Configuration
 * @param {Object} cfg.k - Kaplay inst
 * @param {Array<{x: number, groundY: number}>} cfg.spots - World anchor points
 * @returns {Object} Chain-buoy inst
 */
export function create(cfg) {
  const { k, spots } = cfg
  const buoys = spots.map((spot, i) => ({
    x: spot.x,
    groundY: spot.groundY,
    seed: (spot.x * 0.041 + i * 1.7) % (Math.PI * 2),
    pupilX: 0,
    pupilY: 0
  }))
  return { k, buoys, time: 0 }
}

/**
 * Advances sway time and points every buoy's pupil at the hero.
 * @param {Object} inst - Chain-buoy inst
 * @param {number} heroX - Hero world X
 * @param {number} heroY - Hero world Y
 * @param {number} dt - Frame delta
 */
export function onUpdate(inst, heroX, heroY, dt) {
  inst.time += dt
  inst.buoys.forEach(buoy => updateBuoyPupil(buoy, heroX, heroY))
}

/**
 * Draws every chain-buoy — solid-black chains batched first, then eyes.
 * @param {Object} inst - Chain-buoy inst
 * @param {Object} chainColor - Kaplay rgb for the segments and joints (solid black)
 * @param {Object} eyeWhiteColor - Kaplay rgb for the eye sclera
 */
export function onDraw(inst, chainColor, eyeWhiteColor) {
  const chains = inst.buoys.map(buoy => buildBuoyChainPoints(buoy, inst.time))
  chains.forEach(points => drawBuoySegments(inst.k, points, chainColor))
  chains.forEach(points => drawBuoyJoints(inst.k, points, chainColor))
  inst.buoys.forEach((buoy, i) => drawBuoyEye(inst.k, buoy, chains[i], chainColor, eyeWhiteColor))
}
//
// Aims one buoy's pupil at the hero, clamped to a small offset inside the eye.
//
function updateBuoyPupil(buoy, heroX, heroY) {
  const eyeY = buoy.groundY - BUOY_SEGMENT_LEN * BUOY_SEGMENT_COUNT
  const dx = heroX - buoy.x
  const dy = heroY - eyeY
  const dist = Math.hypot(dx, dy) || 1
  buoy.pupilX = (dx / dist) * BUOY_PUPIL_MAX_OFFSET
  buoy.pupilY = (dy / dist) * BUOY_PUPIL_MAX_OFFSET
}
//
// Walks the chain from the ground anchor up, one swaying joint at a time.
//
function buildBuoyChainPoints(buoy, time) {
  let x = buoy.x
  let y = buoy.groundY
  const points = [{ x, y }]
  for (let i = 0; i < BUOY_SEGMENT_COUNT; i++) {
    const amp = BUOY_SWAY_AMP * Math.pow(BUOY_AMP_GROWTH, i)
    const angle = Math.sin(time * BUOY_SWAY_SPEED + buoy.seed - i * BUOY_SEGMENT_LAG) * amp
    x += Math.sin(angle) * BUOY_SEGMENT_LEN
    y -= Math.cos(angle) * BUOY_SEGMENT_LEN
    points.push({ x, y })
  }
  return points
}
function drawBuoySegments(k, points, color) {
  for (let i = 0; i < points.length - 1; i++) {
    k.drawLine({
      p1: k.vec2(points[i].x, points[i].y),
      p2: k.vec2(points[i + 1].x, points[i + 1].y),
      width: BUOY_SEGMENT_WIDTH,
      color
    })
  }
}
function drawBuoyJoints(k, points, color) {
  for (let i = 1; i < points.length - 1; i++) {
    k.drawCircle({ pos: k.vec2(points[i].x, points[i].y), radius: BUOY_JOINT_RADIUS, color })
  }
}
function drawBuoyEye(k, buoy, points, outlineColor, eyeWhiteColor) {
  const eye = points[points.length - 1]
  k.drawCircle({ pos: k.vec2(eye.x, eye.y), radius: BUOY_EYE_RADIUS + BUOY_EYE_OUTLINE_WIDTH, color: outlineColor })
  k.drawCircle({ pos: k.vec2(eye.x, eye.y), radius: BUOY_EYE_RADIUS, color: eyeWhiteColor })
  k.drawCircle({
    pos: k.vec2(eye.x + buoy.pupilX, eye.y + buoy.pupilY),
    radius: BUOY_PUPIL_RADIUS,
    color: outlineColor
  })
}
