import { drawFernToCanvas, fernBounds } from '../../../utils/draw-fern.js'
import * as PolyBatch from '../../../utils/poly-batch.js'
import { createSeededRandom, nextSeed } from '../../../utils/seeded-random.js'
import { forestFloorPainterColors } from '../components/forest-floor.js'
import { addClosedEyeBerry, addEyeBerry, addTaperedPass } from './glow-eye-berry.js'
import { GLOW_PAL, glowRgb } from './glow-palette.js'
import {
  colorKey,
  cssRgb,
  drawStaticDecorSprite,
  ensureStaticDecorSprite,
  isWorldSpanInView
} from './glow-static-bake.js'
//
// Segmented stalk-eye creatures in the island eye-flower's look: a red,
// contoured stalk with a lit line and short side stems, topped by a white
// eye-berry with a shaded underside. Each stalk sways on its own phase;
// pupils track the hero.
//
const BUOY_SEGMENT_COUNT_DEFAULT = 7
const BUOY_SEGMENT_LEN_DEFAULT = 26
const BUOY_SEGMENT_WIDTH_DEFAULT = 5
const BUOY_STALK_TIP_FRAC = 0.6
const BUOY_STALK_LIGHT_FRAC = 0.35
const BUOY_CONTOUR_PAD = 2
const BUOY_SWAY_AMP_DEFAULT = 0.11
const BUOY_SWAY_SPEED_DEFAULT = 1.1
const BUOY_SEGMENT_LAG_DEFAULT = 0.55
const BUOY_SWAY_HORIZ_MULT = 14
const BUOY_SWAY_HORIZ_GROWTH = 1.12
const BUOY_EYE_RADIUS = 11
const BUOY_PUPIL_RADIUS = 4.5
const BUOY_PUPIL_MARGIN = 0.75
//
// Eye ring thickness — fixed and thin, same as the eye-flower berries; do
// not scale with stalk segmentWidth (that spread made some buoys look
// heavy-rimmed and others almost rimless).
//
const BUOY_EYE_CONTOUR_EXTRA = 1.5
const BUOY_BLINK_MIN_INTERVAL = 10
const BUOY_BLINK_MAX_INTERVAL = 20
const BUOY_BLINK_DURATION = 0.14
//
// Hero landed on the eye cap — hold the lid closed briefly before reopening.
//
const BUOY_LAND_BLINK_HOLD_SEC = 0.3
const BUOY_SIDE_ARM_LEN_MULT = 2.6
const BUOY_SIDE_ARM_DROP = 0.35
const BUOY_SIDE_BALL_RADIUS_MULT = 0.95
//
// Crooked underground continuation of the red stalk — baked once, no sway,
// from the ground line to the bottom of the playfield earth band. Earth-toned
// inks and low opacity so it is only a faint trace in the soil.
//
const BUOY_UNDERGROUND_BAKE_SLOT = 'buoyUndergroundStemCrooked'
const BUOY_UNDERGROUND_OPACITY = 0.4
const BUOY_UNDERGROUND_GRAIN_SEED = 0.53
const BUOY_UNDERGROUND_SEGMENT_LEN = 22
const BUOY_UNDERGROUND_WOBBLE = 0.34
const BUOY_UNDERGROUND_BIAS = 0.038
const BUOY_UNDERGROUND_ANGLE_SPREAD = 0.55
//
// Ferns and long leaves at the seabed anchor — baked once like the root fan.
//
const BUOY_GREENERY_BACK_BAKE_SLOT = 'buoyGreeneryBack'
const BUOY_GREENERY_FRONT_BAKE_SLOT = 'buoyGreeneryFront'
const BUOY_GREENERY_GRAIN_SEED = 0.67
const BUOY_GREENERY_LAYOUT_SEED = 58291
const BUOY_FERN_COUNT_MIN = 2
const BUOY_FERN_COUNT_RANGE = 2
const BUOY_FERN_SIZE_MIN = 26
const BUOY_FERN_SIZE_RANGE = 14
const BUOY_LEAF_COUNT_MIN = 4
const BUOY_LEAF_COUNT_RANGE = 3
const BUOY_LEAF_LEN_MIN = 34
const BUOY_LEAF_LEN_RANGE = 30
const BUOY_LEAF_W_MIN = 6
const BUOY_LEAF_W_RANGE = 4
const BUOY_LEAF_SEGMENTS = 9
const BUOY_LEAF_CONTOUR_PAD = 2
const BUOY_LEAF_ROOT_PHASE = 0.15
const BUOY_LEAF_TIP_PHASE = 0.98
const BUOY_LEAF_MIDRIB_FRAC = 0.35
const BUOY_LEAF_BEND_MIN = 0.22
const BUOY_LEAF_BEND_RANGE = 0.28
//
// Every leaf and fern shares the stalk anchor; only angle and lean spread them.
//
const BUOY_LEAF_FAN_SPREAD = 0.92
const BUOY_LEAF_ANGLE_JITTER = 0.12
//
// Side-view read: blades leaning right cross the stalk and draw over it.
//
const BUOY_LEAF_FRONT_MIN_ANGLE = -Math.PI / 2 + 0.1
const BUOY_GREENERY_BAKE_VARIANT = 'center-v2-front'
//
// Sway, side arms and the eye ring reach past the anchor X (culling pad).
//
const BUOY_CULL_PAD = 60
/**
 * Creates the chain-buoy decor inst for a set of ground-anchored spots.
 * @param {Object} cfg - Configuration
 * @param {Object} cfg.k - Kaplay inst
 * @param {Array<{x: number, groundY: number}>} cfg.spots - World anchor points
 * @param {number} cfg.earthBottomY - Deepest Y of the underground earth band
 * @returns {Object} Chain-buoy inst
 */
export function create(cfg) {
  const { k, spots, woodPlatformBands, platformXMargin, earthBottomY } = cfg
  const buoys = spots.map((spot, i) => {
    const segmentWidth = spot.segmentWidth ?? BUOY_SEGMENT_WIDTH_DEFAULT
    return {
      x: spot.x,
      groundY: spot.groundY,
      prizeEye: Boolean(spot.prizeEye),
      chainTrampRole: spot.chainTrampRole ?? null,
      seed: spot.seed ?? (spot.x * 0.041 + i * 1.7) % (Math.PI * 2),
      segmentCount: spot.segmentCount ?? BUOY_SEGMENT_COUNT_DEFAULT,
      segmentLen: spot.segmentLen ?? BUOY_SEGMENT_LEN_DEFAULT,
      segmentWidth,
      swayAmp: spot.swayAmp ?? BUOY_SWAY_AMP_DEFAULT,
      swaySpeed: spot.swaySpeed ?? BUOY_SWAY_SPEED_DEFAULT,
      swayLag: spot.swayLag ?? BUOY_SEGMENT_LAG_DEFAULT,
      eyeRadius: spot.eyeRadius,
      pupilRadius: spot.pupilRadius,
      blinking: false,
      blinkTimer: BUOY_BLINK_MIN_INTERVAL + Math.random() * (BUOY_BLINK_MAX_INTERVAL - BUOY_BLINK_MIN_INTERVAL),
      wasHeroOnCap: false,
      undergroundPts: buildBuoyUndergroundPoints(
        spot.x,
        spot.groundY,
        earthBottomY,
        spot.undergroundSegLen ?? BUOY_UNDERGROUND_SEGMENT_LEN,
        spot.seed ?? (spot.x * 0.041 + i * 1.7)
      ),
      baseGreenery: buildBuoyBaseGreenery(spot.x, spot.groundY, spot.seed ?? (spot.x * 0.041 + i * 1.7))
    }
  })
  return {
    k,
    earthBottomY,
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
 * Closes a stalk-eye for BUOY_LAND_BLINK_HOLD_SEC (hero landed on its cap).
 * @param {Object} buoy - One chain-buoy entry
 */
export function triggerBuoyLandBlink(buoy) {
  if (!buoy) return
  buoy.blinking = true
  buoy.blinkTimer = BUOY_LAND_BLINK_HOLD_SEC
}

/**
 * Draws every chain-buoy stalk-eye — stalk contours, stalk fills, lit
 * lines, then eyes.
 * @param {Object} inst - Chain-buoy inst
 * @param {Object} colors - glowEyeBerryColors()
 * @param {{x1: number, x2: number}|null} [view=null] - Visible world X range for culling
 */
export function onDraw(inst, colors, view = null) {
  const k = inst.k
  const visible = inst.buoys.filter(buoy =>
    isWorldSpanInView(buoy.x - BUOY_CULL_PAD, buoy.x + BUOY_CULL_PAD, view) &&
    (buoy.prizeEye ||
      !chainBuoyXUnderWoodPlatform(buoy.x, inst.woodPlatformBands, inst.platformXMargin)))
  //
  // All root sprites first, then every stalk and eye in one batched polygon —
  // interleaving sprite blits with primitives would flush the GPU batch once
  // per buoy. Every contour goes under every fill, so no outline cuts across
  // a stalk where a side stem branches off.
  //
  const greeneryColors = buoyGreeneryPainterColors()
  visible.forEach(buoy => drawBuoyUndergroundStem(k, buoy))
  visible.forEach(buoy => drawBuoyBaseGreeneryBack(k, buoy, greeneryColors))
  const chains = visible.map(buoy => buildBuoyChainPoints(buoy, inst.time))
  const batch = inst.bodyBatch
  PolyBatch.reset(batch)
  visible.forEach((buoy, i) => addBuoyBody(batch, buoy, chains[i], colors.contour, BUOY_CONTOUR_PAD))
  visible.forEach((buoy, i) => addBuoyBody(batch, buoy, chains[i], colors.stem, 0))
  visible.forEach((buoy, i) => addBuoyStalk(batch, buoy, chains[i], colors.stemLight, 0, BUOY_STALK_LIGHT_FRAC))
  PolyBatch.flush(batch, k)
  visible.forEach(buoy => drawBuoyBaseGreeneryFront(k, buoy, greeneryColors))
  PolyBatch.reset(batch)
  visible.forEach((buoy, i) => addBuoyEye(batch, buoy, chains[i], colors, inst.lookX, inst.lookY))
  PolyBatch.flush(batch, k)
}
//
// Wobbly polyline from the ground anchor to the earth-band floor (root-like,
// but one continuous stalk — no branches).
//
function buildBuoyUndergroundPoints(x, groundY, earthBottomY, segLen, seed) {
  if (earthBottomY == null || earthBottomY <= groundY) return [{ x, y: groundY }]
  const rng = createSeededRandom(Math.floor(seed * 7919) + Math.floor(x * 17))
  const points = [{ x, y: groundY }]
  let cx = x
  let cy = groundY
  const side = rng() > 0.5 ? 1 : -1
  let angle = Math.PI / 2 + side * rng() * 0.14
  while (cy < earthBottomY - 0.5) {
    const step = Math.min(segLen * (0.82 + rng() * 0.38), earthBottomY - cy)
    angle += (rng() - 0.5) * BUOY_UNDERGROUND_WOBBLE + side * BUOY_UNDERGROUND_BIAS
    const minA = Math.PI / 2 - BUOY_UNDERGROUND_ANGLE_SPREAD
    const maxA = Math.PI / 2 + BUOY_UNDERGROUND_ANGLE_SPREAD
    angle = Math.max(minA, Math.min(maxA, angle))
    cx += Math.cos(angle) * step
    cy += Math.sin(angle) * step
    points.push({ x: cx, y: cy })
  }
  const last = points[points.length - 1]
  last.x = cx
  last.y = earthBottomY
  return points
}
//
// Baked underground stalk — same tapered passes as the stem above ground.
//
function drawBuoyUndergroundStem(k, buoy) {
  const pts = buoy.undergroundPts
  if (!pts || pts.length < 2) return
  const inks = buoyUndergroundStemColors()
  const key = colorKey(inks.contour, inks.stem, inks.stemLight)
  drawStaticDecorSprite(k, ensureStaticDecorSprite(k, buoy, BUOY_UNDERGROUND_BAKE_SLOT, key,
    buoyUndergroundStemBounds(pts, buoy.segmentWidth),
    ctx => paintBuoyUndergroundStem(ctx, pts, buoy.segmentWidth, inks),
    buoy.x * BUOY_UNDERGROUND_GRAIN_SEED), BUOY_UNDERGROUND_OPACITY)
}
function buoyUndergroundStemColors() {
  const pal = GLOW_PAL.glowEyeFlower
  return {
    contour: glowRgb(pal.undergroundStemContour),
    stem: glowRgb(pal.undergroundStem),
    stemLight: glowRgb(pal.undergroundStemLight)
  }
}
function buoyUndergroundStemBounds(pts, segmentWidth) {
  const pad = segmentWidth + BUOY_CONTOUR_PAD + 2
  const bounds = { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity }
  pts.forEach(p => {
    bounds.x1 = Math.min(bounds.x1, p.x - pad)
    bounds.y1 = Math.min(bounds.y1, p.y - pad)
    bounds.x2 = Math.max(bounds.x2, p.x + pad)
    bounds.y2 = Math.max(bounds.y2, p.y + pad)
  })
  return bounds
}
function paintBuoyUndergroundStem(ctx, pts, segmentWidth, colors) {
  const w = segmentWidth
  const wTip = w * BUOY_STALK_TIP_FRAC
  const wLight = w * BUOY_STALK_LIGHT_FRAC
  const wLightTip = wTip * BUOY_STALK_LIGHT_FRAC
  paintTaperedPassCanvas(ctx, pts, w + BUOY_CONTOUR_PAD, wTip + BUOY_CONTOUR_PAD, cssRgb(colors.contour))
  paintTaperedPassCanvas(ctx, pts, w, wTip, cssRgb(colors.stem))
  paintTaperedPassCanvas(ctx, pts, wLight, wLightTip, cssRgb(colors.stemLight))
}
function paintTaperedPassCanvas(ctx, pts, wBase, wTip, colorCss) {
  ctx.strokeStyle = colorCss
  ctx.fillStyle = colorCss
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const last = pts.length - 1
  for (let i = 0; i < last; i++) {
    const w = wBase + (wTip - wBase) * (i / last)
    ctx.lineWidth = w
    ctx.beginPath()
    ctx.moveTo(pts[i].x, pts[i].y)
    ctx.lineTo(pts[i + 1].x, pts[i + 1].y)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(pts[i + 1].x, pts[i + 1].y, w * 0.5, 0, Math.PI * 2)
    ctx.fill()
  }
}
//
// Back layer: ferns and left-leaning blades under the stalk; front layer:
// right-leaning blades over the stalk foot (eye still draws last).
//
function drawBuoyBaseGreeneryBack(k, buoy, colors) {
  const g = buoy.baseGreenery
  if (!g?.ferns?.length && !g?.leavesBack?.length) return
  const key = `${buoyGreeneryColorKey(colors)}|back`
  drawStaticDecorSprite(k, ensureStaticDecorSprite(k, buoy, BUOY_GREENERY_BACK_BAKE_SLOT, key,
    buoyGreeneryBackBounds(buoy),
    ctx => paintBuoyBaseGreeneryBack(ctx, buoy, colors),
    buoy.x * BUOY_GREENERY_GRAIN_SEED))
}
function drawBuoyBaseGreeneryFront(k, buoy, colors) {
  const g = buoy.baseGreenery
  if (!g?.leavesFront?.length) return
  const key = `${buoyGreeneryColorKey(colors)}|front`
  drawStaticDecorSprite(k, ensureStaticDecorSprite(k, buoy, BUOY_GREENERY_FRONT_BAKE_SLOT, key,
    buoyGreeneryFrontBounds(buoy),
    ctx => paintBuoyBaseGreeneryFront(ctx, buoy, colors),
    buoy.x * BUOY_GREENERY_GRAIN_SEED + 17))
}
function buildBuoyBaseGreenery(x, groundY, seed) {
  const rng = createSeededRandom(BUOY_GREENERY_LAYOUT_SEED + Math.floor(seed * 1000) + Math.floor(x))
  const ferns = []
  const fernCount = BUOY_FERN_COUNT_MIN + Math.floor(rng() * BUOY_FERN_COUNT_RANGE)
  for (let i = 0; i < fernCount; i++) {
    ferns.push({
      size: BUOY_FERN_SIZE_MIN + rng() * BUOY_FERN_SIZE_RANGE,
      paintSeed: nextSeed(rng)
    })
  }
  const leaves = []
  const leafCount = BUOY_LEAF_COUNT_MIN + Math.floor(rng() * BUOY_LEAF_COUNT_RANGE)
  for (let i = 0; i < leafCount; i++) {
    const fan = leafCount === 1 ? 0 : (i / (leafCount - 1)) * 2 - 1
    const angle = -Math.PI / 2 + fan * BUOY_LEAF_FAN_SPREAD + (rng() - 0.5) * BUOY_LEAF_ANGLE_JITTER
    const side = fan === 0 ? (rng() > 0.5 ? 1 : -1) : Math.sign(fan)
    const leaf = {
      angle,
      bend: side * (BUOY_LEAF_BEND_MIN + rng() * BUOY_LEAF_BEND_RANGE),
      len: BUOY_LEAF_LEN_MIN + rng() * BUOY_LEAF_LEN_RANGE,
      w: BUOY_LEAF_W_MIN + rng() * BUOY_LEAF_W_RANGE,
      pts: Array.from({ length: BUOY_LEAF_SEGMENTS + 1 }, () => ({ x: 0, y: 0 }))
    }
    fillBuoyLeafArc(leaf.pts, x, groundY, leaf.angle, leaf.bend, leaf.len / BUOY_LEAF_SEGMENTS)
    leaves.push(leaf)
  }
  leaves.sort((a, b) => a.angle - b.angle)
  const leavesBack = []
  const leavesFront = []
  leaves.forEach(leaf => (buoyLeafInFront(leaf.angle) ? leavesFront : leavesBack).push(leaf))
  return { ferns, leavesBack, leavesFront }
}
function buoyLeafInFront(angle) {
  return angle > BUOY_LEAF_FRONT_MIN_ANGLE
}
function buoyGreeneryBackBounds(buoy) {
  const { x, groundY, baseGreenery: g } = buoy
  const bounds = { x1: x - 44, y1: groundY - 52, x2: x + 44, y2: groundY + 6 }
  g.ferns.forEach(f => mergeBounds(bounds, fernBounds(x, groundY, f.size)))
  g.leavesBack.forEach(leaf => mergeBounds(bounds, leafBounds(leaf.pts, leaf.w + BUOY_LEAF_CONTOUR_PAD)))
  return bounds
}
function buoyGreeneryFrontBounds(buoy) {
  const { baseGreenery: g } = buoy
  const bounds = { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity }
  g.leavesFront.forEach(leaf => mergeBounds(bounds, leafBounds(leaf.pts, leaf.w + BUOY_LEAF_CONTOUR_PAD)))
  return bounds
}
function paintBuoyBaseGreeneryBack(ctx, buoy, colors) {
  const { x, groundY, baseGreenery: g } = buoy
  g.ferns.forEach(f => drawFernToCanvas(ctx, {
    x,
    baseY: groundY,
    size: f.size,
    rng: createSeededRandom(f.paintSeed),
    colors: colors.fern
  }))
  g.leavesBack.forEach(leaf => drawBuoyBaseLeafToCanvas(ctx, leaf.pts, leaf.w, colors.leaf))
}
function paintBuoyBaseGreeneryFront(ctx, buoy, colors) {
  const { baseGreenery: g } = buoy
  g.leavesFront.forEach(leaf => drawBuoyBaseLeafToCanvas(ctx, leaf.pts, leaf.w, colors.leaf))
}
function buoyGreeneryPainterColors() {
  const pal = GLOW_PAL.glowEyeFlower
  const toCss = hex => cssRgb(glowRgb(hex))
  return {
    fern: forestFloorPainterColors().fern,
    leaf: {
      contour: toCss(pal.contour),
      body: toCss(pal.leaf),
      light: toCss(pal.leafLight)
    }
  }
}
function buoyGreeneryColorKey(colors) {
  const l = colors.leaf
  const f = colors.fern
  return `${BUOY_GREENERY_BAKE_VARIANT}|${l.contour}|${l.body}|${l.light}|${f.contour}|${f.dark}|${f.mid}|${f.light}`
}
function drawBuoyBaseLeafToCanvas(ctx, pts, wMax, colors) {
  drawBuoyLeafPass(ctx, pts, wMax + BUOY_LEAF_CONTOUR_PAD, colors.contour)
  drawBuoyLeafPass(ctx, pts, wMax, colors.body)
  drawBuoyLeafPass(ctx, pts, wMax * BUOY_LEAF_MIDRIB_FRAC, colors.light)
}
function drawBuoyLeafPass(ctx, pts, wMax, color) {
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const last = pts.length - 1
  for (let i = 0; i < last; i++) {
    const u = (i + 0.5) / last
    const w = wMax * Math.sin(Math.PI * (BUOY_LEAF_ROOT_PHASE + (BUOY_LEAF_TIP_PHASE - BUOY_LEAF_ROOT_PHASE) * u))
    ctx.lineWidth = w
    ctx.beginPath()
    ctx.moveTo(pts[i].x, pts[i].y)
    ctx.lineTo(pts[i + 1].x, pts[i + 1].y)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(pts[i + 1].x, pts[i + 1].y, w * 0.5, 0, Math.PI * 2)
    ctx.fill()
  }
}
function fillBuoyLeafArc(out, x, y, angle, bend, segLen) {
  const last = out.length - 1
  out[0].x = x
  out[0].y = y
  for (let i = 1; i <= last; i++) {
    const a = angle + bend * Math.pow((i - 0.5) / last, 1)
    out[i].x = out[i - 1].x + Math.cos(a) * segLen
    out[i].y = out[i - 1].y + Math.sin(a) * segLen
  }
}
function leafBounds(pts, pad) {
  const bounds = { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity }
  pts.forEach(p => {
    bounds.x1 = Math.min(bounds.x1, p.x - pad)
    bounds.y1 = Math.min(bounds.y1, p.y - pad)
    bounds.x2 = Math.max(bounds.x2, p.x + pad)
    bounds.y2 = Math.max(bounds.y2, p.y + pad)
  })
  return bounds
}
function mergeBounds(into, from) {
  into.x1 = Math.min(into.x1, from.x1)
  into.y1 = Math.min(into.y1, from.y1)
  into.x2 = Math.max(into.x2, from.x2)
  into.y2 = Math.max(into.y2, from.y2)
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
/**
 * World position of the stalk-eye cap (top segment).
 * @param {Object} buoy - One chain-buoy entry
 * @param {number} time - Sway clock (inst.time)
 */
export function getChainBuoyEyePos(buoy, time = 0) {
  const points = buildBuoyChainPoints(buoy, time)
  return points[points.length - 1]
}
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
// One pass of the whole body (stalk + side stems) — `pad` widens it for
// the contour pass.
//
function addBuoyBody(batch, buoy, points, color, pad) {
  addBuoyStalk(batch, buoy, points, color, pad, 1)
  addBuoySideArms(batch, buoy, points, color, pad)
}
//
// Main stalk tapering toward the eye; `frac` thins it for the lit line.
//
function addBuoyStalk(batch, buoy, points, color, pad, frac) {
  const w = buoy.segmentWidth * frac
  addTaperedPass(batch, points, w + pad, w * BUOY_STALK_TIP_FRAC + pad, color)
}
//
// Short lateral stems with round tips on each chain joint (not the ground anchor).
//
function addBuoySideArms(batch, buoy, points, color, pad) {
  const segmentWidth = buoy.segmentWidth
  const armLenBase = segmentWidth * BUOY_SIDE_ARM_LEN_MULT
  const ballR = segmentWidth * BUOY_SIDE_BALL_RADIUS_MULT + pad * 0.5
  for (let i = 1; i < points.length - 1; i++) {
    const side = i % 2 === 0 ? -1 : 1
    const wobble = Math.sin(buoy.seed * 2.3 + i * 1.17) * segmentWidth * 0.35
    const armLen = armLenBase + wobble
    const px = points[i].x
    const py = points[i].y
    const tipX = px + side * armLen
    const tipY = py + segmentWidth * BUOY_SIDE_ARM_DROP
    PolyBatch.addLine(batch, px, py, tipX, tipY, segmentWidth * 0.72 + pad, color)
    PolyBatch.addDisc(batch, tipX, tipY, ballR, color)
  }
}
function addBuoyEye(batch, buoy, points, colors, heroX, heroY) {
  const eye = points[points.length - 1]
  const scleraR = buoy.eyeRadius ?? BUOY_EYE_RADIUS
  if (buoy.blinking) {
    addClosedEyeBerry(batch, eye.x, eye.y, scleraR, colors, BUOY_EYE_CONTOUR_EXTRA)
    return
  }
  const pupilR = buoy.pupilRadius ?? BUOY_PUPIL_RADIUS
  const pupil = buoyPupilPos(eye.x, eye.y, heroX, heroY, scleraR, pupilR)
  addEyeBerry(batch, eye.x, eye.y, scleraR, pupil.x, pupil.y, pupilR, colors, BUOY_EYE_CONTOUR_EXTRA)
}
//
// Clamps the pupil inside the sclera so it always points at the hero.
//
function chainBuoyXUnderWoodPlatform(x, bands, margin) {
  return (bands ?? []).some(b => x >= b.x1 - margin && x <= b.x2 + margin)
}
function buoyPupilPos(eyeX, eyeY, heroX, heroY, scleraR = BUOY_EYE_RADIUS, pupilR = BUOY_PUPIL_RADIUS) {
  if (heroX == null || heroY == null) return { x: eyeX, y: eyeY }
  const dx = heroX - eyeX
  const dy = heroY - eyeY
  const dist = Math.hypot(dx, dy) || 1
  const maxOff = scleraR - pupilR - BUOY_PUPIL_MARGIN
  const t = Math.min(1, maxOff / dist)
  return { x: eyeX + dx * t, y: eyeY + dy * t }
}
