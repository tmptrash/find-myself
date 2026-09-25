//
// Segmented stick-on-a-chain decor, planted upright — reads as a buoy
// anchored to the seabed by its chain. A dark eye rides the topmost segment.
// The chain itself is a flat solid-black silhouette — only the eye carries
// a lighter fill. Each buoy sways at its own pace; pupils track the hero.
//
const BUOY_SEGMENT_COUNT_DEFAULT = 7
const BUOY_SEGMENT_LEN_DEFAULT = 26
const BUOY_SEGMENT_WIDTH_DEFAULT = 5
const BUOY_JOINT_RADIUS_MULT = 0.5
const BUOY_SWAY_AMP_DEFAULT = 0.11
const BUOY_SWAY_SPEED_DEFAULT = 1.1
const BUOY_SEGMENT_LAG_DEFAULT = 0.55
const BUOY_SWAY_HORIZ_MULT = 14
const BUOY_SWAY_HORIZ_GROWTH = 1.12
const BUOY_EYE_RADIUS = 11
const BUOY_EYE_OUTLINE_WIDTH = 2
const BUOY_PUPIL_RADIUS = 4.5
const BUOY_PUPIL_MARGIN = 0.75
const BUOY_BLINK_MIN_INTERVAL = 10
const BUOY_BLINK_MAX_INTERVAL = 20
const BUOY_BLINK_DURATION = 0.14
const BUOY_SIDE_ARM_LEN_MULT = 2.6
const BUOY_SIDE_ARM_DROP = 0.35
const BUOY_SIDE_BALL_RADIUS_MULT = 0.95

/**
 * Creates the chain-buoy decor inst for a set of ground-anchored spots.
 * @param {Object} cfg - Configuration
 * @param {Object} cfg.k - Kaplay inst
 * @param {Array<{x: number, groundY: number}>} cfg.spots - World anchor points
 * @returns {Object} Chain-buoy inst
 */
export function create(cfg) {
  const { k, spots, woodPlatformBands, platformXMargin } = cfg
  const buoys = spots.map((spot, i) => ({
    x: spot.x,
    groundY: spot.groundY,
    seed: spot.seed ?? (spot.x * 0.041 + i * 1.7) % (Math.PI * 2),
    segmentCount: spot.segmentCount ?? BUOY_SEGMENT_COUNT_DEFAULT,
    segmentLen: spot.segmentLen ?? BUOY_SEGMENT_LEN_DEFAULT,
    segmentWidth: spot.segmentWidth ?? BUOY_SEGMENT_WIDTH_DEFAULT,
    swayAmp: spot.swayAmp ?? BUOY_SWAY_AMP_DEFAULT,
    swaySpeed: spot.swaySpeed ?? BUOY_SWAY_SPEED_DEFAULT,
    swayLag: spot.swayLag ?? BUOY_SEGMENT_LAG_DEFAULT,
    blinking: false,
    blinkTimer: BUOY_BLINK_MIN_INTERVAL + Math.random() * (BUOY_BLINK_MAX_INTERVAL - BUOY_BLINK_MIN_INTERVAL)
  }))
  return {
    k,
    buoys,
    woodPlatformBands: woodPlatformBands ?? [],
    platformXMargin: platformXMargin ?? 36,
    time: 0
  }
}

/**
 * Advances per-buoy sway time and blink timers.
 * @param {Object} inst - Chain-buoy inst
 * @param {number} heroX - Hero world X (pupil gaze)
 * @param {number} heroY - Hero world Y (pupil gaze)
 * @param {number} dt - Frame delta
 */
export function onUpdate(inst, heroX, heroY, dt) {
  inst.time += dt
  inst.lookX = heroX
  inst.lookY = heroY
  inst.buoys.forEach(buoy => updateBuoyBlink(buoy, dt))
}

/**
 * Draws every chain-buoy — solid-black chains batched first, then eyes.
 * @param {Object} inst - Chain-buoy inst
 * @param {Object} chainColor - Kaplay rgb for the segments and joints (solid black)
 * @param {Object} eyeWhiteColor - Kaplay rgb for the eye sclera
 */
export function onDraw(inst, chainColor, eyeWhiteColor) {
  inst.buoys.forEach(buoy => {
    if (chainBuoyXUnderWoodPlatform(buoy.x, inst.woodPlatformBands, inst.platformXMargin)) return
    const points = buildBuoyChainPoints(buoy, inst.time)
    drawBuoySegments(inst.k, points, buoy.segmentWidth, chainColor)
    drawBuoySideArms(inst.k, buoy, points, buoy.segmentWidth, chainColor)
    drawBuoyJoints(inst.k, points, buoy.segmentWidth, chainColor)
    drawBuoyEye(inst.k, buoy, points, chainColor, eyeWhiteColor, inst.lookX, inst.lookY)
  })
}
//
// Random blink cadence per buoy — eyes stay open most of the time.
//
function updateBuoyBlink(buoy, dt) {
  buoy.blinkTimer -= dt
  if (buoy.blinkTimer > 0) return
  if (buoy.blinking) {
    buoy.blinking = false
    buoy.blinkTimer = BUOY_BLINK_MIN_INTERVAL +
      Math.random() * (BUOY_BLINK_MAX_INTERVAL - BUOY_BLINK_MIN_INTERVAL)
    return
  }
  buoy.blinking = true
  buoy.blinkTimer = BUOY_BLINK_DURATION
}
//
// Vertical chain with a gentle horizontal sine wave — segments stay mostly
// upright (stretched upward) instead of rotating like a pendulum.
//
function buildBuoyChainPoints(buoy, time) {
  let x = buoy.x
  let y = buoy.groundY
  const points = [{ x, y }]
  for (let i = 0; i < buoy.segmentCount; i++) {
    const phase = time * buoy.swaySpeed + buoy.seed - i * buoy.swayLag
    const horizScale = buoy.swayAmp * Math.pow(BUOY_SWAY_HORIZ_GROWTH, i) * BUOY_SWAY_HORIZ_MULT
    x += Math.sin(phase) * horizScale
    y -= buoy.segmentLen
    points.push({ x, y })
  }
  return points
}
function drawBuoySegments(k, points, segmentWidth, color) {
  for (let i = 0; i < points.length - 1; i++) {
    k.drawLine({
      p1: k.vec2(points[i].x, points[i].y),
      p2: k.vec2(points[i + 1].x, points[i + 1].y),
      width: segmentWidth,
      color
    })
  }
}
//
// Short lateral sticks with round tips on each chain joint (not the ground anchor).
//
function drawBuoySideArms(k, buoy, points, segmentWidth, color) {
  const armLenBase = segmentWidth * BUOY_SIDE_ARM_LEN_MULT
  for (let i = 1; i < points.length - 1; i++) {
    const side = i % 2 === 0 ? -1 : 1
    const wobble = Math.sin(buoy.seed * 2.3 + i * 1.17) * segmentWidth * 0.35
    const armLen = armLenBase + wobble
    const px = points[i].x
    const py = points[i].y
    const tipX = px + side * armLen
    const tipY = py + segmentWidth * BUOY_SIDE_ARM_DROP
    const ballR = segmentWidth * BUOY_SIDE_BALL_RADIUS_MULT
    k.drawLine({
      p1: k.vec2(px, py),
      p2: k.vec2(tipX, tipY),
      width: segmentWidth * 0.72,
      color
    })
    k.drawCircle({ pos: k.vec2(tipX, tipY), radius: ballR, color })
  }
}
function drawBuoyJoints(k, points, segmentWidth, color) {
  const radius = segmentWidth * BUOY_JOINT_RADIUS_MULT
  for (let i = 1; i < points.length - 1; i++) {
    k.drawCircle({ pos: k.vec2(points[i].x, points[i].y), radius, color })
  }
}
function drawBuoyEye(k, buoy, points, outlineColor, eyeWhiteColor, heroX, heroY) {
  const eye = points[points.length - 1]
  k.drawCircle({
    pos: k.vec2(eye.x, eye.y),
    radius: BUOY_EYE_RADIUS + BUOY_EYE_OUTLINE_WIDTH,
    color: outlineColor
  })
  if (!buoy.blinking) {
    k.drawCircle({ pos: k.vec2(eye.x, eye.y), radius: BUOY_EYE_RADIUS, color: eyeWhiteColor })
    const pupil = buoyPupilPos(eye.x, eye.y, heroX, heroY)
    k.drawCircle({
      pos: k.vec2(pupil.x, pupil.y),
      radius: BUOY_PUPIL_RADIUS,
      color: outlineColor
    })
    return
  }
  k.drawLine({
    p1: k.vec2(eye.x - BUOY_EYE_RADIUS * 0.85, eye.y),
    p2: k.vec2(eye.x + BUOY_EYE_RADIUS * 0.85, eye.y),
    width: BUOY_EYE_OUTLINE_WIDTH + 1,
    color: outlineColor
  })
}
//
// Clamps the pupil inside the sclera so it always points at the hero.
//
function chainBuoyXUnderWoodPlatform(x, bands, margin) {
  return (bands ?? []).some(b => x >= b.x1 - margin && x <= b.x2 + margin)
}
function buoyPupilPos(eyeX, eyeY, heroX, heroY) {
  if (heroX == null || heroY == null) return { x: eyeX, y: eyeY }
  const dx = heroX - eyeX
  const dy = heroY - eyeY
  const dist = Math.hypot(dx, dy) || 1
  const maxOff = BUOY_EYE_RADIUS - BUOY_PUPIL_RADIUS - BUOY_PUPIL_MARGIN
  const t = Math.min(1, maxOff / dist)
  return { x: eyeX + dx * t, y: eyeY + dy * t }
}
