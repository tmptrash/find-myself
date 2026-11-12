import * as PolyBatch from '../../../utils/poly-batch.js'
import { createSeededRandom, nextSeed } from '../../../utils/seeded-random.js'
import { forestFloorPainterColors } from '../components/forest-floor.js'
import { addLiddedEyeBerry, addTaperedPass } from './forest-eye-berry.js'
import { FOREST_PAL, forestRgb } from './forest-palette.js'
import {
  colorKey,
  cssRgb,
  drawStaticDecorSprite,
  ensureStaticDecorSprite,
  staticBakeHolder,
  isWorldSpanInView
} from './forest-static-bake.js'
import { drawForestPlant, forestPlantBounds } from './forest-plants.js'
import * as EarthMerge from './forest-earth-merge.js'
import { headPos as budHeadPos } from '../components/propeller-bud.js'
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
//
// Where a stalk-eye looks: at the hero once he is within HERO_LOOK_REACH of
// it (the same reach in which he looks at it, forest-hero-gaze.js), else at
// the nearest of the things worth watching (the centipede, the propeller
// bud) within SIGHT_REACH, else about — a new random way every
// WANDER_MIN_SEC..+WANDER_RANGE_SEC, WANDER_DIST px off the eye. Its pupil
// glides to the new spot at LOOK_EASE_RATE per second.
//
export const HERO_LOOK_REACH = 360
const SIGHT_REACH = 420
const WANDER_MIN_SEC = 1.5
const WANDER_RANGE_SEC = 3
const WANDER_DIST = 80
const LOOK_EASE_RATE = 5
const BUOY_BLINK_MAX_INTERVAL = 20
//
// The hero running past a stalk knocks its foot: the stalk is soft, so the
// knock runs up it as a wave (a chain of springs, one per joint: each joint
// pulled back to the ground line by JOLT_ANCHOR and towards its neighbours
// by JOLT_LINK, lighter and so livelier by JOLT_LIGHTER per joint up, damped
// by JOLT_DAMPING; drawn JOLT_GAIN_FOOT times at the foot up to JOLT_GAIN_TIP
// times at the eye). The kick (JOLT_IMPULSE px/s at the foot) reaches the eye
// as a whip that throws the stalk off its sway, then dies away in about a
// second. Only a hero at ground level (within JOLT_HERO_BAND of his standing
// height, a frame's move no longer than JOLT_MAX_STEP) knocks it, and not
// again within JOLT_COOLDOWN.
//
const JOLT_IMPULSE = 230
const JOLT_GAIN_FOOT = 0.25
const JOLT_GAIN_TIP = 2.4
const JOLT_ANCHOR = 12
const JOLT_LINK = 70
const JOLT_LIGHTER = 0.35
const JOLT_DAMPING = 3.4
const JOLT_SUBSTEPS = 2
const JOLT_HERO_BAND = 46
const JOLT_HERO_FOOT_DROP = 38
const JOLT_MAX_STEP = 80
const JOLT_COOLDOWN = 0.6
const JOLT_MAX_DT = 0.05
const BUOY_BLINK_SEC = 0.32
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
    const segmentCount = spot.segmentCount ?? BUOY_SEGMENT_COUNT_DEFAULT
    const swayAmp = spot.swayAmp ?? BUOY_SWAY_AMP_DEFAULT
    const seed = spot.seed ?? (spot.x * 0.041 + i * 1.7) % (Math.PI * 2)
    const armLenBase = segmentWidth * BUOY_SIDE_ARM_LEN_MULT
    const horizScales = Array.from({ length: segmentCount }, (_, s) =>
      swayAmp * Math.pow(BUOY_SWAY_HORIZ_GROWTH, s) * BUOY_SWAY_HORIZ_MULT)
    const armDx = Array.from({ length: segmentCount + 1 }, (_, s) => {
      const side = s % 2 === 0 ? -1 : 1
      return side * (armLenBase + Math.sin(seed * 2.3 + s * 1.17) * segmentWidth * 0.35)
    })
    return {
      x: spot.x,
      groundY: spot.groundY,
      prizeEye: Boolean(spot.prizeEye),
      chainTrampRole: spot.chainTrampRole ?? null,
      seed,
      segmentCount,
      segmentLen: spot.segmentLen ?? BUOY_SEGMENT_LEN_DEFAULT,
      segmentWidth,
      swayAmp,
      swaySpeed: spot.swaySpeed ?? BUOY_SWAY_SPEED_DEFAULT,
      swayLag: spot.swayLag ?? BUOY_SEGMENT_LAG_DEFAULT,
      eyeRadius: spot.eyeRadius,
      pupilRadius: spot.pupilRadius,
      joltD: new Array(segmentCount).fill(0),
      joltV: new Array(segmentCount).fill(0),
      joltCool: 0,
      lidClose: 0,
      blinkLeft: 0,
      landHoldLeft: 0,
      landHoldPending: false,
      blinkGap: randomBuoyBlinkGap(),
      wasHeroOnCap: false,
      lookX: null,
      lookY: null,
      target: { x: 0, y: 0 },
      wanderLeft: 0,
      wanderAngle: Math.random() * Math.PI * 2,
      horizScales,
      armDx,
      chainPts: Array.from({ length: segmentCount + 1 }, () => ({ x: spot.x, y: spot.groundY })),
      _bakeK: null,
      _bakedStem: null,
      _bakedBack: null,
      _bakedFront: null,
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
    visibleScratch: [],
    pupilScratch: { x: 0, y: 0 },
    sights: [],
    budSight: { x: 0, y: 0 },
    woodPlatformBands: woodPlatformBands ?? [],
    platformXMargin: platformXMargin ?? 36,
    time: 0,
    prevHeroX: null,
    bodyBatch: PolyBatch.create()
  }
}

/**
 * Advances per-buoy sway time, blink timers and gaze (see HERO_LOOK_REACH).
 * @param {Object} inst - Chain-buoy inst
 * @param {number} heroX - Hero world X
 * @param {number} heroY - Hero world Y
 * @param {number} dt - Frame delta
 * @param {Array<{x: number, y: number}>} [sights=[]] - Other things worth watching (world points)
 */
export function onUpdate(inst, heroX, heroY, dt, sights = []) {
  inst.time += dt
  const prevHeroX = inst.prevHeroX ?? heroX
  inst.buoys.forEach(buoy => {
    updateBuoyBlink(buoy, dt)
    updateBuoyGaze(inst, buoy, heroX, heroY, sights, dt)
    updateBuoyJolt(buoy, prevHeroX, heroX, heroY, dt)
  })
  inst.prevHeroX = heroX
}
/**
 * The things worth watching for onUpdate's sights: the centipede's head
 * while it shows and the propeller bud's head while it shows.
 * @param {Object} inst - Chain-buoy inst
 * @param {Object|null} predator - Predator inst (its head is segments[0])
 * @param {Object|null} bud - Propeller bud inst
 * @returns {Array<{x: number, y: number}>}
 */
export function collectSights(inst, predator, bud) {
  const sights = inst.sights
  sights.length = 0
  const head = predator?.segments?.[0]
  head && !predator.obj?.hidden && sights.push(head)
  const budHead = bud && budHeadPos(bud, inst.budSight)
  budHead && sights.push(budHead)
  return sights
}

/**
 * Closes a stalk-eye for BUOY_LAND_BLINK_HOLD_SEC (hero landed on its cap).
 * @param {Object} buoy - One chain-buoy entry
 */
export function triggerBuoyLandBlink(buoy) {
  if (!buoy || buoy.landHoldLeft > 0) return
  const closing = buoy.blinkLeft > BUOY_BLINK_SEC * 0.5
  closing || (buoy.blinkLeft = BUOY_BLINK_SEC * (1 - Math.asin(Math.min(1, buoy.lidClose ?? 0)) / Math.PI))
  buoy.landHoldPending = true
}

/**
 * Bakes every buoy's underground stalk and base greenery now (at level
 * load) instead of on its first frame on screen, which hitched the game as
 * the hero ran up to a buoy.
 * @param {Object} inst - Chain-buoy inst
 */
export function prewarm(inst) {
  for (let i = 0; i < inst.buoys.length; i++) {
    ensureBuoyBakes(inst.k, inst.buoys[i])
  }
}

/**
 * The shown buoys' underground stalks as static layers for the merged earth
 * sprite (forest-earth-merge.js), back to front.
 * @param {Object} inst - Chain-buoy inst
 * @returns {Array<{sprite: string, x: number, y: number, opacity: number}>}
 */
export function undergroundLayers(inst) {
  return inst.buoys
    .filter(buoy => isBuoyShown(inst, buoy))
    .map(buoy => ensureBuoyBakes(inst.k, buoy).stem)
    .filter(Boolean)
    .map(baked => ({ sprite: baked.sprite, x: baked.x, y: baked.y, opacity: BUOY_UNDERGROUND_OPACITY }))
}

/**
 * Draws every chain-buoy stalk-eye — back greenery sprites, then all stalks
 * and eyes in a single batched polygon, then front base greenery sprites
 * (base leaves never reach eye height, so front greenery batches cleanly with
 * subsequent sprite layers while keeping one polygon flush).
 * @param {Object} inst - Chain-buoy inst
 * @param {Object} colors - forestEyeBerryColors()
 * @param {{x1: number, x2: number}|null} [view=null] - Visible world X range for culling
 */
export function onDraw(inst, colors, view = null) {
  const k = inst.k
  const visible = inst.visibleScratch
  visible.length = 0
  const all = inst.buoys
  for (let i = 0; i < all.length; i++) {
    const buoy = all[i]
    if (isWorldSpanInView(buoy.x - BUOY_CULL_PAD, buoy.x + BUOY_CULL_PAD, view) && isBuoyShown(inst, buoy)) {
      ensureBuoyBakes(k, buoy)
      buildBuoyChainPoints(buoy, inst.time)
      visible.push(buoy)
    }
  }
  const n = visible.length
  if (!n) return
  for (let i = 0; i < n; i++) drawBuoyUndergroundStem(inst, visible[i])
  for (let i = 0; i < n; i++) drawStaticDecorSprite(k, visible[i]._bakedBack)
  const batch = inst.bodyBatch
  PolyBatch.reset(batch)
  for (let i = 0; i < n; i++) addBuoyBody(batch, visible[i], visible[i].chainPts, colors.contour, BUOY_CONTOUR_PAD)
  for (let i = 0; i < n; i++) addBuoyBody(batch, visible[i], visible[i].chainPts, colors.stem, 0)
  for (let i = 0; i < n; i++) addBuoyStalk(batch, visible[i], visible[i].chainPts, colors.stemLight, 0, BUOY_STALK_LIGHT_FRAC)
  for (let i = 0; i < n; i++) addBuoyEye(inst, batch, visible[i], visible[i].chainPts, colors, visible[i].lookX, visible[i].lookY)
  PolyBatch.flush(batch, k)
  for (let i = 0; i < n; i++) drawStaticDecorSprite(k, visible[i]._bakedFront)
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
function ensureBuoyBakes(k, buoy) {
  if (buoy._bakeK === k) return { stem: buoy._bakedStem, back: buoy._bakedBack, front: buoy._bakedFront }
  const greeneryColors = buoyGreeneryPainterColors()
  buoy._bakeK = k
  buoy._bakedStem = bakeBuoyUndergroundStem(k, buoy)
  buoy._bakedBack = bakeBuoyBaseGreeneryBack(k, buoy, greeneryColors)
  buoy._bakedFront = bakeBuoyBaseGreeneryFront(k, buoy, greeneryColors)
  return { stem: buoy._bakedStem, back: buoy._bakedBack, front: buoy._bakedFront }
}
//
// Baked underground stalk — same tapered passes as the stem above ground.
//
function drawBuoyUndergroundStem(inst, buoy) {
  const baked = buoy._bakedStem
  baked && !EarthMerge.isMerged(inst, baked.sprite) && drawStaticDecorSprite(inst.k, baked, BUOY_UNDERGROUND_OPACITY)
}
//
// Buoys under a wood platform stay hidden, except the one holding the prize eye.
//
function isBuoyShown(inst, buoy) {
  return buoy.prizeEye || !chainBuoyXUnderWoodPlatform(buoy.x, inst.woodPlatformBands, inst.platformXMargin)
}
function bakeBuoyUndergroundStem(k, buoy) {
  const pts = buoy.undergroundPts
  if (!pts || pts.length < 2) return null
  const inks = buoyUndergroundStemColors()
  const key = colorKey(inks.contour, inks.stem, inks.stemLight)
  return ensureStaticDecorSprite(k, buoyBakeHolder(k, buoy), BUOY_UNDERGROUND_BAKE_SLOT, key,
    buoyUndergroundStemBounds(pts, buoy.segmentWidth),
    ctx => paintBuoyUndergroundStem(ctx, pts, buoy.segmentWidth, inks),
    buoy.x * BUOY_UNDERGROUND_GRAIN_SEED)
}
//
// Bakes are kept per live k and buoy place, so a scene restart reuses them.
//
function buoyBakeHolder(k, buoy) {
  return staticBakeHolder(k, `chain-buoy-${buoy.x}`)
}
function buoyUndergroundStemColors() {
  const pal = FOREST_PAL.forestEyeFlower
  return {
    contour: forestRgb(pal.undergroundStemContour),
    stem: forestRgb(pal.undergroundStem),
    stemLight: forestRgb(pal.undergroundStemLight)
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
  drawStaticDecorSprite(k, bakeBuoyBaseGreeneryBack(k, buoy, colors))
}
function bakeBuoyBaseGreeneryBack(k, buoy, colors) {
  const g = buoy.baseGreenery
  if (!g?.ferns?.length && !g?.leavesBack?.length) return null
  const key = `${buoyGreeneryColorKey(colors)}|back`
  return ensureStaticDecorSprite(k, buoyBakeHolder(k, buoy), BUOY_GREENERY_BACK_BAKE_SLOT, key,
    buoyGreeneryBackBounds(buoy),
    ctx => paintBuoyBaseGreeneryBack(ctx, buoy, colors),
    buoy.x * BUOY_GREENERY_GRAIN_SEED)
}
function drawBuoyBaseGreeneryFront(k, buoy, colors) {
  drawStaticDecorSprite(k, bakeBuoyBaseGreeneryFront(k, buoy, colors))
}
function bakeBuoyBaseGreeneryFront(k, buoy, colors) {
  const g = buoy.baseGreenery
  if (!g?.leavesFront?.length) return null
  const key = `${buoyGreeneryColorKey(colors)}|front`
  return ensureStaticDecorSprite(k, buoyBakeHolder(k, buoy), BUOY_GREENERY_FRONT_BAKE_SLOT, key,
    buoyGreeneryFrontBounds(buoy),
    ctx => paintBuoyBaseGreeneryFront(ctx, buoy, colors),
    buoy.x * BUOY_GREENERY_GRAIN_SEED + 17)
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
  g.ferns.forEach(f => mergeBounds(bounds, forestPlantBounds(x, groundY, f.size)))
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
  g.ferns.forEach(f => drawForestPlant(ctx, {
    x,
    baseY: groundY,
    size: f.size,
    rng: createSeededRandom(f.paintSeed)
  }))
  g.leavesBack.forEach(leaf => drawBuoyBaseLeafToCanvas(ctx, leaf.pts, leaf.w, colors.leaf))
}
function paintBuoyBaseGreeneryFront(ctx, buoy, colors) {
  const { baseGreenery: g } = buoy
  g.leavesFront.forEach(leaf => drawBuoyBaseLeafToCanvas(ctx, leaf.pts, leaf.w, colors.leaf))
}
function buoyGreeneryPainterColors() {
  const pal = FOREST_PAL.forestEyeFlower
  const toCss = hex => cssRgb(forestRgb(hex))
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
//
// Lid close amount runs one sine over BUOY_BLINK_SEC (shut at mid). A landing
// blink pauses at the shut midpoint for BUOY_LAND_BLINK_HOLD_SEC.
//
function updateBuoyBlink(buoy, dt) {
  if (buoy.landHoldLeft > 0) {
    buoy.landHoldLeft = Math.max(0, buoy.landHoldLeft - dt)
    buoy.lidClose = 1
    return
  }
  if (buoy.blinkLeft > 0) {
    buoy.blinkLeft = Math.max(0, buoy.blinkLeft - dt)
    if (buoy.landHoldPending && buoy.blinkLeft <= BUOY_BLINK_SEC * 0.5) {
      buoy.landHoldPending = false
      buoy.blinkLeft = BUOY_BLINK_SEC * 0.5
      buoy.landHoldLeft = BUOY_LAND_BLINK_HOLD_SEC
    }
    buoy.lidClose = Math.sin(Math.PI * (1 - buoy.blinkLeft / BUOY_BLINK_SEC))
    return
  }
  buoy.lidClose = 0
  buoy.blinkGap -= dt
  if (buoy.blinkGap > 0) return
  buoy.blinkLeft = BUOY_BLINK_SEC
  buoy.blinkGap = randomBuoyBlinkGap()
}
//
// Eases one stalk-eye's look towards what it watches this frame.
//
function updateBuoyGaze(inst, buoy, heroX, heroY, sights, dt) {
  const eye = getChainBuoyEyePos(buoy, inst.time)
  const target = pickBuoyTarget(buoy, eye.x, eye.y, heroX, heroY, sights, dt)
  if (buoy.lookX === null) {
    buoy.lookX = target.x
    buoy.lookY = target.y
    return
  }
  const t = Math.min(1, dt * LOOK_EASE_RATE)
  buoy.lookX += (target.x - buoy.lookX) * t
  buoy.lookY += (target.y - buoy.lookY) * t
}
function pickBuoyTarget(buoy, eyeX, eyeY, heroX, heroY, sights, dt) {
  const target = buoy.target
  if (heroX != null && Math.hypot(heroX - eyeX, heroY - eyeY) < HERO_LOOK_REACH) {
    target.x = heroX
    target.y = heroY
    return target
  }
  let best = SIGHT_REACH
  let sight = null
  for (const s of sights) {
    const d = Math.hypot(s.x - eyeX, s.y - eyeY)
    if (d >= best) continue
    best = d
    sight = s
  }
  if (sight) {
    target.x = sight.x
    target.y = sight.y
    return target
  }
  buoy.wanderLeft -= dt
  if (buoy.wanderLeft <= 0) {
    buoy.wanderAngle = Math.random() * Math.PI * 2
    buoy.wanderLeft = WANDER_MIN_SEC + Math.random() * WANDER_RANGE_SEC
  }
  target.x = eyeX + Math.cos(buoy.wanderAngle) * WANDER_DIST
  target.y = eyeY + Math.sin(buoy.wanderAngle) * WANDER_DIST
  return target
}
function randomBuoyBlinkGap() {
  return BUOY_BLINK_MIN_INTERVAL + Math.random() * (BUOY_BLINK_MAX_INTERVAL - BUOY_BLINK_MIN_INTERVAL)
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
//
// The knock: a hero crossing the stalk's foot at ground level kicks the
// spring along his way; then the spring settles.
//
function updateBuoyJolt(buoy, prevX, heroX, heroY, dt) {
  buoy.joltCool = Math.max(0, buoy.joltCool - dt)
  const crossed = (prevX - buoy.x) * (heroX - buoy.x) <= 0 && prevX !== heroX
  const onGround = Math.abs(heroY + JOLT_HERO_FOOT_DROP - buoy.groundY) <= JOLT_HERO_BAND
  if (crossed && onGround && buoy.joltCool <= 0 && Math.abs(heroX - prevX) <= JOLT_MAX_STEP) {
    buoy.joltV[0] += Math.sign(heroX - prevX) * JOLT_IMPULSE
    buoy.joltCool = JOLT_COOLDOWN
  }
  const step = Math.min(dt, JOLT_MAX_DT) / JOLT_SUBSTEPS
  for (let n = 0; n < JOLT_SUBSTEPS; n++) stepBuoyJolt(buoy, step)
}
//
// One step of the joints' spring chain (the foot joint's lower neighbour is
// the still ground, the eye's upper neighbour is nothing: it swings free).
//
function stepBuoyJolt(buoy, dt) {
  const d = buoy.joltD
  const v = buoy.joltV
  const last = d.length - 1
  for (let i = 0; i <= last; i++) {
    const below = i === 0 ? 0 : d[i - 1]
    const link = (below - d[i]) + (i === last ? 0 : d[i + 1] - d[i])
    const lighter = 1 + i * JOLT_LIGHTER
    v[i] += (-JOLT_ANCHOR * d[i] + JOLT_LINK * lighter * link - JOLT_DAMPING * v[i]) * dt
  }
  for (let i = 0; i <= last; i++) d[i] += v[i] * dt
}
function buildBuoyChainPoints(buoy, time) {
  let x = buoy.x
  let y = buoy.groundY
  const points = buoy.chainPts
  points[0].x = x
  points[0].y = y
  const scales = buoy.horizScales
  const basePhase = time * buoy.swaySpeed + buoy.seed
  const lag = buoy.swayLag
  const segLen = buoy.segmentLen
  for (let i = 0; i < buoy.segmentCount; i++) {
    x += Math.sin(basePhase - i * lag) * scales[i]
    y -= segLen
    const pt = points[i + 1]
    pt.x = x + buoy.joltD[i] * (JOLT_GAIN_FOOT + (JOLT_GAIN_TIP - JOLT_GAIN_FOOT) * (i + 1) / buoy.segmentCount)
    pt.y = y
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
  const ballR = segmentWidth * BUOY_SIDE_BALL_RADIUS_MULT + pad * 0.5
  const armDx = buoy.armDx
  const armDrop = segmentWidth * BUOY_SIDE_ARM_DROP
  const armW = segmentWidth * 0.72 + pad
  for (let i = 1; i < points.length - 1; i++) {
    const px = points[i].x
    const py = points[i].y
    const tipX = px + armDx[i]
    const tipY = py + armDrop
    PolyBatch.addLine(batch, px, py, tipX, tipY, armW, color)
    PolyBatch.addDisc(batch, tipX, tipY, ballR, color)
  }
}
function addBuoyEye(inst, batch, buoy, points, colors, heroX, heroY) {
  const eye = points[points.length - 1]
  const scleraR = buoy.eyeRadius ?? BUOY_EYE_RADIUS
  const pupilR = buoy.pupilRadius ?? BUOY_PUPIL_RADIUS
  const pupil = buoyPupilPos(eye.x, eye.y, heroX, heroY, scleraR, pupilR, inst.pupilScratch)
  addLiddedEyeBerry(batch, eye.x, eye.y, scleraR, pupil.x, pupil.y, pupilR, colors, BUOY_EYE_CONTOUR_EXTRA, buoy.lidClose)
}
//
// Clamps the pupil inside the sclera so it points at what the eye watches.
//
function chainBuoyXUnderWoodPlatform(x, bands, margin) {
  return (bands ?? []).some(b => x >= b.x1 - margin && x <= b.x2 + margin)
}
function buoyPupilPos(eyeX, eyeY, heroX, heroY, scleraR = BUOY_EYE_RADIUS, pupilR = BUOY_PUPIL_RADIUS, out = { x: 0, y: 0 }) {
  if (heroX == null || heroY == null) {
    out.x = eyeX
    out.y = eyeY
    return out
  }
  const dx = heroX - eyeX
  const dy = heroY - eyeY
  const dist = Math.hypot(dx, dy) || 1
  const maxOff = scleraR - pupilR - BUOY_PUPIL_MARGIN
  const t = Math.min(1, maxOff / dist)
  out.x = eyeX + dx * t
  out.y = eyeY + dy * t
  return out
}
