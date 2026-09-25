//
// Segmented stick-on-a-chain decor, planted upright — reads as a buoy
// anchored to the seabed by its chain. A dark eye rides the topmost segment
// and its pupil tracks the hero. The chain itself is a flat solid-black
// silhouette (no outline/fill split) — only the eye carries a lighter fill.
//
const BUOY_SEGMENT_COUNT_DEFAULT = 7
const BUOY_SEGMENT_LEN_DEFAULT = 26
const BUOY_SEGMENT_WIDTH_DEFAULT = 5
//
// Joint radius is capped at half the segment width so joints never bulge
// wider than the sticks they connect (drawn in the same solid colour, they'd
// otherwise read as a separate, oddly-placed dot rather than part of the
// chain).
//
const BUOY_JOINT_RADIUS_MULT = 0.5
const BUOY_SWAY_AMP_DEFAULT = 0.14
const BUOY_SWAY_SPEED_DEFAULT = 1.1
const BUOY_SEGMENT_LAG_DEFAULT = 0.55
const BUOY_AMP_GROWTH_DEFAULT = 1.35
const BUOY_EYE_RADIUS = 11
const BUOY_EYE_OUTLINE_WIDTH = 2
const BUOY_PUPIL_RADIUS = 4.5
const BUOY_PUPIL_MAX_OFFSET = 5
const BUOY_BLINK_MIN_INTERVAL = 10
const BUOY_BLINK_MAX_INTERVAL = 20
const BUOY_BLINK_DURATION = 0.14
//
// Distance at which the chain starts reaching toward the hero — smoothly
// eased (not snapped) toward full lean at zero distance, back to nothing
// once he's out past the trigger radius. Idle sway fades out in step with
// the lean growing in, so a fully-reaching chain holds still pointed at the
// hero instead of also wobbling; it resumes swaying as the lean eases back
// out while he walks away.
//
const BUOY_TRIGGER_RADIUS = 260
const BUOY_LEAN_MAX_ANGLE = 0.65
const BUOY_REACH_EASE = 3

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
    seed: spot.seed ?? (spot.x * 0.041 + i * 1.7) % (Math.PI * 2),
    segmentCount: spot.segmentCount ?? BUOY_SEGMENT_COUNT_DEFAULT,
    segmentLen: spot.segmentLen ?? BUOY_SEGMENT_LEN_DEFAULT,
    segmentWidth: spot.segmentWidth ?? BUOY_SEGMENT_WIDTH_DEFAULT,
    swayAmp: spot.swayAmp ?? BUOY_SWAY_AMP_DEFAULT,
    swaySpeed: spot.swaySpeed ?? BUOY_SWAY_SPEED_DEFAULT,
    swayLag: spot.swayLag ?? BUOY_SEGMENT_LAG_DEFAULT,
    ampGrowth: spot.ampGrowth ?? BUOY_AMP_GROWTH_DEFAULT,
    pupilX: 0,
    pupilY: 0,
    leanDir: 0,
    reachT: 0,
    blinking: false,
    blinkTimer: BUOY_BLINK_MIN_INTERVAL + Math.random() * (BUOY_BLINK_MAX_INTERVAL - BUOY_BLINK_MIN_INTERVAL)
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
  inst.buoys.forEach(buoy => {
    updateBuoyBlink(buoy, dt)
    updateBuoyPupil(buoy, heroX, heroY)
    updateBuoyReach(buoy, heroX, heroY, dt)
  })
}

/**
 * Draws every chain-buoy — solid-black chains batched first, then eyes.
 * @param {Object} inst - Chain-buoy inst
 * @param {Object} chainColor - Kaplay rgb for the segments and joints (solid black)
 * @param {Object} eyeWhiteColor - Kaplay rgb for the eye sclera
 */
export function onDraw(inst, chainColor, eyeWhiteColor) {
  inst.buoys.forEach(buoy => {
    const points = buildBuoyChainPoints(buoy, inst.time)
    drawBuoySegments(inst.k, points, buoy.segmentWidth, chainColor)
    drawBuoyJoints(inst.k, points, buoy.segmentWidth, chainColor)
    drawBuoyEye(inst.k, buoy, points, chainColor, eyeWhiteColor)
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
// Aims one buoy's pupil at the hero, clamped to a small offset inside the eye.
//
function updateBuoyPupil(buoy, heroX, heroY) {
  const eyeY = buoy.groundY - buoy.segmentLen * buoy.segmentCount
  const dx = heroX - buoy.x
  const dy = heroY - eyeY
  const dist = Math.hypot(dx, dy) || 1
  buoy.pupilX = (dx / dist) * BUOY_PUPIL_MAX_OFFSET
  buoy.pupilY = (dy / dist) * BUOY_PUPIL_MAX_OFFSET
}
//
// Eases the chain's reach-toward-hero amount smoothly toward its target
// (proximity-based) each frame, rather than snapping straight to it — this
// is what makes both leaning in and easing back out read as a deliberate,
// smooth movement instead of an instant angle change.
//
function updateBuoyReach(buoy, heroX, heroY, dt) {
  const eyeY = buoy.groundY - buoy.segmentLen * buoy.segmentCount
  const dx = heroX - buoy.x
  const dy = heroY - eyeY
  const dist = Math.hypot(dx, dy) || 1
  const targetReachT = Math.max(0, 1 - dist / BUOY_TRIGGER_RADIUS)
  buoy.leanDir = dx >= 0 ? 1 : -1
  const ease = Math.min(1, dt * BUOY_REACH_EASE)
  buoy.reachT += (targetReachT - buoy.reachT) * ease
}
//
// Walks the chain from the ground anchor up, one swaying joint at a time.
//
function buildBuoyChainPoints(buoy, time) {
  let x = buoy.x
  let y = buoy.groundY
  const points = [{ x, y }]
  const leanMag = buoy.leanDir * BUOY_LEAN_MAX_ANGLE * buoy.reachT
  //
  // Idle sway fades out as the reach grows in (and back in as it eases back
  // out) — a fully-reaching chain holds still, pointed at the hero, instead
  // of also wobbling through the lean.
  //
  const swayMul = 1 - buoy.reachT
  for (let i = 0; i < buoy.segmentCount; i++) {
    const amp = buoy.swayAmp * Math.pow(buoy.ampGrowth, i) * swayMul
    const swayAngle = Math.sin(time * buoy.swaySpeed + buoy.seed - i * buoy.swayLag) * amp
    //
    // Lean grows toward the tip (base stays anchored) so the whole chain
    // reads as curving over toward the hero, not just swaying in place.
    //
    const leanWeight = (i + 1) / buoy.segmentCount
    const angle = swayAngle + leanMag * leanWeight
    x += Math.sin(angle) * buoy.segmentLen
    y -= Math.cos(angle) * buoy.segmentLen
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
function drawBuoyJoints(k, points, segmentWidth, color) {
  const radius = segmentWidth * BUOY_JOINT_RADIUS_MULT
  for (let i = 1; i < points.length - 1; i++) {
    k.drawCircle({ pos: k.vec2(points[i].x, points[i].y), radius, color })
  }
}
function drawBuoyEye(k, buoy, points, outlineColor, eyeWhiteColor) {
  const eye = points[points.length - 1]
  k.drawCircle({
    pos: k.vec2(eye.x, eye.y),
    radius: BUOY_EYE_RADIUS + BUOY_EYE_OUTLINE_WIDTH,
    color: outlineColor
  })
  if (!buoy.blinking) {
    k.drawCircle({ pos: k.vec2(eye.x, eye.y), radius: BUOY_EYE_RADIUS, color: eyeWhiteColor })
    k.drawCircle({
      pos: k.vec2(eye.x + buoy.pupilX, eye.y + buoy.pupilY),
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
