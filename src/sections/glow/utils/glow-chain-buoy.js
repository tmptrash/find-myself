import { CFG } from '../../../cfg.js'
import {
  clampRootSegmentsBelowGroundLine,
  drawTreeRootSegmentsToCanvas,
  growTreeRootSegments
} from '../../../utils/grow-tree-root.js'
import * as PolyBatch from '../../../utils/poly-batch.js'
import { addGlowEyeCreatureToBatch } from './glow-eye-creature.js'
import { glowRgb } from './glow-palette.js'
import {
  colorKey,
  cssRgb,
  drawStaticDecorSprite,
  ensureStaticDecorSprite,
  isWorldSpanInView,
  rootSegmentsBounds
} from './glow-static-bake.js'
//
// Stalk-eye pupil: gray decor before L, hero black after (colour world: white
// sclera, black stalk and eye ring — same stalk RGB as body).
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
const BUOY_BLINK_LID_SPAN = 0.85 // Closed-lid stroke half-length (× eye radius)
const BUOY_BLINK_MIN_INTERVAL = 10
const BUOY_BLINK_MAX_INTERVAL = 20
const BUOY_BLINK_DURATION = 0.14
const BUOY_SIDE_ARM_LEN_MULT = 2.6
const BUOY_SIDE_ARM_DROP = 0.35
const BUOY_SIDE_BALL_RADIUS_MULT = 0.95
//
// Thin root fan at the seabed anchor, same growTreeRootSegments algorithm
// the big glow tree uses — generated once per buoy at creation time and
// baked into a sprite. Starts at the pole's own segmentWidth (seamless join)
// and tapers down naturally from there.
//
const BUOY_ROOT_COUNT = 2
const BUOY_ROOT_SEGMENTS = 4
const BUOY_ROOTS_BAKE_SLOT = 'buoyRoots'
const BUOY_ROOTS_GRAIN_SEED = 0.53
//
// Sway, side arms and the eye ring reach past the anchor X (culling pad).
//
const BUOY_CULL_PAD = 60

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
    time: 0,
    bodyBatch: PolyBatch.create()
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
 * @param {{x1: number, x2: number}|null} [view=null] - Visible world X range for culling
 */
export function onDraw(inst, colors, zones, view = null) {
  const body = colors.body
  const k = inst.k
  const pupilTriplet = chainBuoyPupilRgb(zones)
  const pupilColor = k.rgb(pupilTriplet.r, pupilTriplet.g, pupilTriplet.b)
  const eyeColors = { ...colors, pupil: pupilColor }
  const visible = inst.buoys.filter(buoy =>
    isWorldSpanInView(buoy.x - BUOY_CULL_PAD, buoy.x + BUOY_CULL_PAD, view) &&
    !chainBuoyXUnderWoodPlatform(buoy.x, inst.woodPlatformBands, inst.platformXMargin))
  //
  // All root sprites first, then every stalk body followed by every eye in
  // one batched polygon — interleaving sprite blits with primitives would
  // flush the GPU batch once per buoy, and per-limb draw calls cost more JS
  // than the geometry itself.
  //
  visible.forEach(buoy => drawBuoyRoots(k, buoy, colors.root))
  const chains = visible.map(buoy => buildBuoyChainPoints(buoy, inst.time))
  const batch = inst.bodyBatch
  PolyBatch.reset(batch)
  visible.forEach((buoy, i) => addBuoyBody(batch, buoy, chains[i], body))
  visible.forEach((buoy, i) => addBuoyEye(batch, buoy, chains[i], eyeColors, inst.lookX, inst.lookY))
  PolyBatch.flush(batch, k)
}
//
// Grows a small root fan at the seabed anchor once, at creation time —
// cached and baked into a sprite on first draw (never regrown).
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
// Fill-only root lines (no outline pass), baked once per root colour.
//
function drawBuoyRoots(k, buoy, rootColor) {
  if (!buoy.rootSegs?.length) return
  drawStaticDecorSprite(k, ensureStaticDecorSprite(k, buoy, BUOY_ROOTS_BAKE_SLOT, colorKey(rootColor),
    rootSegmentsBounds(buoy.rootSegs),
    ctx => drawTreeRootSegmentsToCanvas(ctx, buoy.rootSegs, cssRgb(rootColor)),
    buoy.x * BUOY_ROOTS_GRAIN_SEED))
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
//
// Stalk segments, then side arms, then joint knots — same order the
// separate draw calls used.
//
function addBuoyBody(batch, buoy, points, color) {
  addBuoySegments(batch, points, buoy.segmentWidth, color)
  addBuoySideArms(batch, buoy, points, buoy.segmentWidth, color)
  addBuoyJoints(batch, points, buoy.segmentWidth, color)
}
function addBuoySegments(batch, points, segmentWidth, color) {
  for (let i = 0; i < points.length - 1; i++) {
    PolyBatch.addLine(batch, points[i].x, points[i].y, points[i + 1].x, points[i + 1].y, segmentWidth, color)
  }
}
//
// Short lateral sticks with round tips on each chain joint (not the ground anchor).
//
function addBuoySideArms(batch, buoy, points, segmentWidth, color) {
  const armLenBase = segmentWidth * BUOY_SIDE_ARM_LEN_MULT
  for (let i = 1; i < points.length - 1; i++) {
    const side = i % 2 === 0 ? -1 : 1
    const wobble = Math.sin(buoy.seed * 2.3 + i * 1.17) * segmentWidth * 0.35
    const armLen = armLenBase + wobble
    const px = points[i].x
    const py = points[i].y
    const tipX = px + side * armLen
    const tipY = py + segmentWidth * BUOY_SIDE_ARM_DROP
    PolyBatch.addLine(batch, px, py, tipX, tipY, segmentWidth * 0.72, color)
    PolyBatch.addDisc(batch, tipX, tipY, segmentWidth * BUOY_SIDE_BALL_RADIUS_MULT, color)
  }
}
function addBuoyJoints(batch, points, segmentWidth, color) {
  const radius = segmentWidth * BUOY_JOINT_RADIUS_MULT
  for (let i = 1; i < points.length - 1; i++) {
    PolyBatch.addDisc(batch, points[i].x, points[i].y, radius, color)
  }
}
function addBuoyEye(batch, buoy, points, colors, heroX, heroY) {
  const eye = points[points.length - 1]
  //
  // Contour ring matches the pole width so leg and eye read as one stalk.
  //
  const contourExtra = buoy.segmentWidth
  if (!buoy.blinking) {
    const pupil = buoyPupilPos(eye.x, eye.y, heroX, heroY)
    addGlowEyeCreatureToBatch(batch, eye.x, eye.y, pupil.x, pupil.y, colors, {
      scleraR: BUOY_EYE_RADIUS,
      pupilR: BUOY_PUPIL_RADIUS,
      contourExtra
    }, { skipHighlight: true })
    return
  }
  PolyBatch.addDisc(batch, eye.x, eye.y, BUOY_EYE_RADIUS + contourExtra, colors.contour)
  PolyBatch.addLine(batch,
    eye.x - BUOY_EYE_RADIUS * BUOY_BLINK_LID_SPAN, eye.y,
    eye.x + BUOY_EYE_RADIUS * BUOY_BLINK_LID_SPAN, eye.y,
    contourExtra + 1, colors.contour)
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
