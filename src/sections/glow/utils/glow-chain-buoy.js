import { CFG } from '../../../cfg.js'
import { clampRootSegmentsBelowGroundLine, growTreeRootSegments } from '../../../utils/grow-tree-root.js'
import { drawGlowEyeCreature } from './glow-eye-creature.js'
import { glowRgb } from './glow-palette.js'
//
// Stalk-eye pupil: gray decor before L, hero black after (colour world keeps
// the same rule — only the stalk palette switches to eyeCreature).
//
const CHAIN_BUOY_PUPIL_PRE_L_PALETTE_KEY = 'decorGray'
const CHAIN_BUOY_PUPIL_POST_L_HEX = CFG.visual.colors.hero.eyePupil
/**
 * Resolves stalk-eye pupil RGB from glow zone flags (plain {r,g,b}).
 * @param {Object} [zones] - Glow zones object from the live scene
 * @returns {{ r: number, g: number, b: number }}
 */
export function chainBuoyPupilRgb(zones) {
  if (!zones?.lCollected) {
    return glowRgb(CHAIN_BUOY_PUPIL_PRE_L_PALETTE_KEY)
  }
  return glowRgb(CHAIN_BUOY_PUPIL_POST_L_HEX)
}
//
// Segmented stick-on-a-chain eye creatures — dark green-black body, warm
// luminous sclera on top. Each stalk sways on its own phase; pupils track
// the hero.
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
const BUOY_PUPIL_RADIUS = 4.5
const BUOY_PUPIL_MARGIN = 0.75
const BUOY_BLINK_MIN_INTERVAL = 10
const BUOY_BLINK_MAX_INTERVAL = 20
const BUOY_BLINK_DURATION = 0.14
const BUOY_SIDE_ARM_LEN_MULT = 2.6
const BUOY_SIDE_ARM_DROP = 0.35
const BUOY_SIDE_BALL_RADIUS_MULT = 0.95
//
// Thin root fan at the seabed anchor, same growTreeRootSegments algorithm
// the big glow tree uses — generated once per buoy at creation time and
// redrawn as static geometry every frame. Starts at the pole's own
// segmentWidth (seamless join) and tapers down naturally from there.
//
const BUOY_ROOT_COUNT = 2
const BUOY_ROOT_SEGMENTS = 4

/**
 * Creates the chain-buoy decor inst for a set of ground-anchored spots.
 * @param {Object} cfg - Configuration
 * @param {Object} cfg.k - Kaplay inst
 * @param {Array<{x: number, groundY: number}>} cfg.spots - World anchor points
 * @returns {Object} Chain-buoy inst
 */
export function create(cfg) {
  const { k, spots, woodPlatformBands, platformXMargin } = cfg
  const buoys = spots.map((spot, i) => {
    const segmentWidth = spot.segmentWidth ?? BUOY_SEGMENT_WIDTH_DEFAULT
    return {
      x: spot.x,
      groundY: spot.groundY,
      seed: spot.seed ?? (spot.x * 0.041 + i * 1.7) % (Math.PI * 2),
      segmentCount: spot.segmentCount ?? BUOY_SEGMENT_COUNT_DEFAULT,
      segmentLen: spot.segmentLen ?? BUOY_SEGMENT_LEN_DEFAULT,
      segmentWidth,
      swayAmp: spot.swayAmp ?? BUOY_SWAY_AMP_DEFAULT,
      swaySpeed: spot.swaySpeed ?? BUOY_SWAY_SPEED_DEFAULT,
      swayLag: spot.swayLag ?? BUOY_SEGMENT_LAG_DEFAULT,
      blinking: false,
      blinkTimer: BUOY_BLINK_MIN_INTERVAL + Math.random() * (BUOY_BLINK_MAX_INTERVAL - BUOY_BLINK_MIN_INTERVAL),
      rootSegs: buildBuoyRoots(spot.x, spot.groundY, segmentWidth)
    }
  })
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
 * Draws every chain-buoy stalk-eye — body geometry first, then eyes.
 * @param {Object} inst - Chain-buoy inst
 * @param {Object} colors - { body, sclera, pupil, highlight, contour, root }
 * @param {Object} [zones] - Live glow zones (pupil colour is resolved here)
 */
export function onDraw(inst, colors, zones) {
  const body = colors.body
  const k = inst.k
  const pupilTriplet = chainBuoyPupilRgb(zones)
  const pupilColor = k.rgb(pupilTriplet.r, pupilTriplet.g, pupilTriplet.b)
  const eyeColors = { ...colors, pupil: pupilColor }
  inst.buoys.forEach(buoy => {
    if (chainBuoyXUnderWoodPlatform(buoy.x, inst.woodPlatformBands, inst.platformXMargin)) return
    drawBuoyRoots(k, buoy, colors.root)
    const points = buildBuoyChainPoints(buoy, inst.time)
    drawBuoySegments(k, points, buoy.segmentWidth, body)
    drawBuoySideArms(k, buoy, points, buoy.segmentWidth, body)
    drawBuoyJoints(k, points, buoy.segmentWidth, body)
    drawBuoyEye(k, buoy, points, eyeColors, inst.lookX, inst.lookY)
  })
}
//
// Grows a small root fan at the seabed anchor once, at creation time —
// cached and redrawn as static geometry every frame (never regrown).
//
function buildBuoyRoots(x, groundY, segmentWidth) {
  const rand = (min, max) => min + Math.random() * (max - min)
  const segs = []
  for (let r = 0; r < BUOY_ROOT_COUNT; r++) {
    const side = r % 2 === 0 ? 1 : -1
    const startAngle = Math.PI / 2 + side * (0.2 + Math.random() * 0.3)
    segs.push(...growTreeRootSegments({
      x: x + side * Math.random() * 2,
      y: groundY - 1,
      angle: startAngle,
      segments: BUOY_ROOT_SEGMENTS,
      thickness: segmentWidth,
      lateralBiasPerSegment: side * 0.03,
      rand
    }))
  }
  return clampRootSegmentsBelowGroundLine(segs, groundY)
}
//
// Fill-only root lines (no outline pass).
//
function drawBuoyRoots(k, buoy, rootColor) {
  buoy.rootSegs?.forEach(seg => {
    const p1 = k.vec2(seg.startX, seg.startY)
    const p2 = k.vec2(seg.endX, seg.endY)
    k.drawLine({ p1, p2, width: seg.width, color: rootColor, lineCap: 'round' })
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
function drawBuoyEye(k, buoy, points, colors, heroX, heroY) {
  const eye = points[points.length - 1]
  //
  // Contour ring matches the pole width so leg and eye read as one stalk.
  //
  const contourExtra = buoy.segmentWidth
  if (!buoy.blinking) {
    const pupil = buoyPupilPos(eye.x, eye.y, heroX, heroY)
    drawGlowEyeCreature(k, eye.x, eye.y, pupil.x, pupil.y, colors, {
      scleraR: BUOY_EYE_RADIUS,
      pupilR: BUOY_PUPIL_RADIUS,
      contourExtra
    }, { skipHighlight: true })
    return
  }
  k.drawCircle({
    pos: k.vec2(eye.x, eye.y),
    radius: BUOY_EYE_RADIUS + contourExtra,
    color: colors.contour
  })
  k.drawLine({
    p1: k.vec2(eye.x - BUOY_EYE_RADIUS * 0.85, eye.y),
    p2: k.vec2(eye.x + BUOY_EYE_RADIUS * 0.85, eye.y),
    width: contourExtra + 1,
    color: colors.contour
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
