import { CFG } from '../../../cfg.js'
import { getRGB } from '../../../utils/helper.js'
import { GLOW_PAL, isGlowGrayWorld } from '../utils/glow-palette.js'
import * as PolyBatch from '../../../utils/poly-batch.js'
import { initBody, samplePredatorSpineHitPoints, tickBody } from './predator-body.js'
import { tickLegs, solveLeg, footNow } from './predator-ik.js'
import { initEyes, tickEyes } from './predator-eyes.js'
import { tickMove, startFleeMove } from './predator-move.js'
import {
  cancelPredatorFeast,
  getPredatorFeastLookTarget,
  isPredatorFeasting,
  tickPredatorFruitFeast
} from './predator-fruit-feast.js'
import * as Sound from '../../../utils/sound.js'

//
// Low predatory crawler. Pose is computed every frame from the spine, the
// leg targets and the eye targets — there is no baked walk cycle.
//
const LEG_PAIRS = 12
const THIGH = 11
const SHIN = 13
const DRAW_Z = CFG.visual.zIndex.player - 1
const SPIKE_AT = [0.16, 0.26, 0.36, 0.46, 0.56, 0.66, 0.76, 0.86]
const SPIKE_H = 10
const SPIKE_HALF = 2.75
const SPIKE_OUTLINE_HALF_PAD = 1
const SPIKE_OUTLINE_H_PAD = 1.4
const HERO_HIT_HALF_W = 15
const HERO_HIT_H = 69
const SHEAR_REACH = 18
const SHEAR_OPEN = 8
const TRI = [0, 1, 2]
const SNOUT_REACH = 7
const SNOUT_DROP = 2.4
const SNOUT_HALF = 4.1
//
// Hero must be within this horizontal span of the body to hear foot taps.
//
const FOOT_HEAR_RANGE_X = 360
//
// A burst closer than this (to the body centre) sends the crawler fleeing.
//
const FLEE_TRIGGER_RADIUS = 460
//
// Swimming body rides half under the water line.
//
const SWIM_SURFACE_SINK = 16
//
// Width inside the shore over which the swim line eases down from the ground.
//
const SWIM_SHORE_RAMP_PX = 56

/**
 * Creates the crawler on the ground line.
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay inst
 * @param {number} cfg.x - Head start X
 * @param {number} cfg.minX - Left wander bound
 * @param {number} cfg.maxX - Right wander bound
 * @param {function(number): number} cfg.groundAt - Surface Y under a world X (up is smaller)
 * @param {Object} cfg.hero - Hero inst
 * @param {Object} cfg.zones - Level zones
 * @param {Object} [cfg.sfx] - Shared Sound inst for foot taps
 * @param {number} [cfg.dir=-1] - Initial facing, -1 left, 1 right
 * @param {function(): boolean} [cfg.canHuntHero] - When false, the hero is ignored
 * @param {{x1: number, x2: number, surfaceY: number}} [cfg.water] - Lake span the crawler can swim across
 * @param {number} [cfg.fleeLeftX] - Far-left swim target when fleeing left
 * @param {number} [cfg.homeX] - Roam-home X when the hero is off the ground line
 * @returns {Object} Predator inst
 */
export function create(cfg) {
  const inst = {
    k: cfg.k,
    sfx: cfg.sfx,
    x: cfg.x,
    y: cfg.groundAt(cfg.x),
    dir: cfg.dir ?? -1,
    minX: cfg.minX,
    maxX: cfg.maxX,
    landAt: cfg.groundAt,
    groundAt: null,
    water: cfg.water ?? null,
    fleeLeftX: cfg.fleeLeftX ?? cfg.minX,
    homeX: cfg.homeX ?? cfg.x,
    swimming: false,
    fleePath: null,
    hero: cfg.hero,
    zones: cfg.zones,
    canHuntHero: cfg.canHuntHero,
    state: 'search',
    stateTime: 0.4,
    vx: 0,
    ax: 0,
    speedTarget: 0,
    burst: 0.2,
    stretch: 1,
    headLift: 0,
    lookBack: false,
    bodyClear: 7,
    idleTime: 0,
    wobblePhase: Math.random() * 6,
    orientKick: false,
    lungeT: 0,
    batch: PolyBatch.create(),
    footHearable: false
  }
  inst.groundAt = x => predatorSurfaceAt(inst, x)
  initBody(inst)
  inst.spikeAt = SPIKE_AT.map(t => Math.min(
    inst.segments.length - 2,
    Math.max(2, Math.round(t * (inst.segments.length - 1)))
  ))
  initLegs(inst)
  initEyes(inst)
  inst.obj = cfg.k.add([
    cfg.k.z(DRAW_Z),
    {
      draw() {
        drawPredator(inst)
      }
    }
  ])
  return inst
}

/**
 * Steps controller, spine, legs and eyes.
 * @param {Object} inst
 * @param {number} dt
 */
export function update(inst, dt) {
  if (!inst) return
  tickPredatorFruitFeast(inst, inst.levelInst, dt)
  syncFootstepAudibility(inst)
  const feasting = isPredatorFeasting(inst)
  const hero = feasting ? null : heroPoint(inst)
  const lookTarget = feasting ? (getPredatorFeastLookTarget(inst) ?? hero) : hero
  tickMove(inst, dt, hero)
  tickBody(inst, dt)
  const hurry = inst.state === 'lunge' ||
    (feasting && (inst.feastPhase === 'approach' || inst.feastBitePhase === 'forward'))
  tickLegs(inst, dt, hurry)
  tickEyes(inst, dt, lookTarget)
  inst.y = inst.segments[0].y
}

/**
 * True when the hero's live hitbox overlaps any body segment, including the snout.
 * @param {Object} inst
 * @param {number} heroX - Fallback center X when the live area is unavailable
 * @param {number} heroFootY - Fallback foot Y
 * @returns {boolean}
 */
export function isTouchingHero(inst, heroX, heroFootY) {
  if (!inst || inst.state === 'coast' || inst.state === 'flee' || inst.obj?.hidden) return false
  return overlapsHeroHitbox(inst, heroX, heroFootY)
}

/**
 * Same geometry as isTouchingHero, but ignores coast/hidden — for respawn nudge.
 * @param {Object} inst
 * @param {number} heroX
 * @param {number} heroFootY
 * @returns {boolean}
 */
/**
 * True when a falling twig segment crosses the crawler's back.
 * @param {Object} inst - Predator inst
 * @param {number} x1 - Twig start X
 * @param {number} y1 - Twig start Y
 * @param {number} x2 - Twig end X
 * @param {number} y2 - Twig end Y
 * @returns {{ x: number, y: number, index: number }|null} Mount point on the back
 */
export function predatorBackCatchPoint(inst, x1, y1, x2, y2) {
  if (!inst?.segments?.length || inst.obj?.hidden) return null
  let best = null
  let bestD = 22
  for (let i = 1; i < inst.segments.length - 1; i++) {
    const seg = inst.segments[i]
    const topX = seg.x
    const topY = seg.y - seg.radius * 0.45
    const d = pointSegDistance(topX, topY, x1, y1, x2, y2)
    if (d < bestD) {
      bestD = d
      best = { x: topX, y: topY - 2, index: i }
    }
  }
  return best
}

export function overlapsHeroHitbox(inst, heroX, heroFootY) {
  if (!inst || inst.obj?.hidden) return false
  const box = heroHitbox(inst, heroX, heroFootY)
  if (!box) return false
  const stretch = Math.max(1, inst.stretch ?? 1)
  const chains = [inst.segments, samplePredatorSpineHitPoints(inst)]
  for (let c = 0; c < chains.length; c++) {
    const spine = chains[c]
    if (!spine?.length) continue
    if (spineHitsHero(spine, box, stretch, inst.dir)) return true
  }
  return false
}

/**
 * After a kill the body keeps its velocity for a moment, then searches again.
 * @param {Object} inst
 */
export function notifyKill(inst) {
  if (!inst) return
  inst.state = 'coast'
  inst.stateTime = 0.35 + Math.random() * 0.25
  inst.speedTarget = 0
}

/**
 * Burst at fromX — a crawler within range jerks away from it and flees.
 * @param {Object} inst - Predator inst
 * @param {number} fromX - Burst world X
 */
export function startFlee(inst, fromX) {
  if (!inst || inst.obj?.hidden) return
  const centerX = predatorBodyCenterX(inst)
  if (Math.abs(centerX - fromX) > FLEE_TRIGGER_RADIUS) return
  isPredatorFeasting(inst) && cancelPredatorFeast(inst)
  startFleeMove(inst, centerX >= fromX ? 1 : -1)
}

function initLegs(inst) {
  inst.legs = []
  for (let i = 0; i < LEG_PAIRS; i++) {
    const span = Math.max(1, inst.segments.length - 5)
    const seg = 2 + Math.min(span - 1, Math.floor(i * span / LEG_PAIRS))
    for (const side of [-1, 1]) {
      const hipX = inst.x - inst.dir * (10 + i * 7)
      const footX = hipX + side * 8
      inst.legs.push({
        seg,
        side,
        front: i < 3,
        reach: 0.85 + Math.random() * 0.3,
        haste: Math.random() * 1.4,
        jitter: Math.random() * 4,
        swing: 0,
        swingFromX: footX,
        swingFromY: inst.groundAt(footX),
        footX,
        footY: inst.groundAt(footX),
        plantX: footX,
        stepWait: Math.random() * 0.2,
        fidgetAt: 0.4 + Math.random()
      })
    }
  }
}

function heroPoint(inst) {
  if (inst.canHuntHero && !inst.canHuntHero()) return null
  const pos = inst.hero?.character?.pos
  if (!pos) return null
  return { x: pos.x, y: pos.y }
}

function predatorBodyCenterX(inst) {
  const segs = inst.segments
  if (!segs?.length) return inst.x
  return (segs[0].x + segs[segs.length - 1].x) * 0.5
}

function syncFootstepAudibility(inst) {
  const sfx = inst.sfx
  if (!sfx?.predatorFootGain) return
  if (isPredatorFeasting(inst)) {
    inst.footHearable = false
    Sound.setGlowPredatorFootGain(sfx, 0)
    return
  }
  const hero = heroPoint(inst)
  const hearable = Boolean(hero) &&
    Math.abs(hero.x - predatorBodyCenterX(inst)) <= FOOT_HEAR_RANGE_X
  if (hearable === inst.footHearable) return
  inst.footHearable = hearable
  Sound.setGlowPredatorFootGain(sfx, hearable ? 1 : 0)
}

function drawPredator(inst) {
  const k = inst.k
  const batch = inst.batch
  PolyBatch.reset(batch)
  const gray = isGlowGrayWorld(inst.zones)
  const contour = rgb(k, gray ? GLOW_PAL.decorGray : GLOW_PAL.predatorContour)
  const back = rgb(k, gray ? GLOW_PAL.lightGray : GLOW_PAL.predatorBack)
  const belly = rgb(k, gray ? GLOW_PAL.decorGray : GLOW_PAL.predatorBelly)
  const moss = rgb(k, gray ? GLOW_PAL.decorGray : GLOW_PAL.predatorMoss)
  const leg = rgb(k, gray ? GLOW_PAL.decorGray : GLOW_PAL.predatorLeg)
  const eye = rgb(k, gray ? GLOW_PAL.lightGray : GLOW_PAL.predatorEye)
  const pupil = rgb(k, gray ? GLOW_PAL.decorGray : GLOW_PAL.predatorPupil)
  const horn = rgb(k, gray ? GLOW_PAL.decorGray : GLOW_PAL.predatorHorn)
  inst.legs.forEach(limb => drawLeg(inst, batch, limb, contour, leg))
  for (let i = inst.segments.length - 1; i >= 0; i--) {
    const seg = inst.segments[i]
    const prev = inst.segments[i + 1]
    if (prev) {
      PolyBatch.addLine(batch, prev.x, prev.y + 1, seg.x, seg.y + 1, seg.radius * 1.7, contour)
      PolyBatch.addLine(batch, prev.x, prev.y + 2, seg.x, seg.y + 2, seg.radius * 1.15, belly)
      PolyBatch.addLine(batch, prev.x, prev.y - 1, seg.x, seg.y - 1, seg.radius * 0.85, back)
    }
    PolyBatch.addDisc(batch, seg.x, seg.y, seg.radius * 0.72, contour)
    PolyBatch.addDisc(batch, seg.x, seg.y - 1, seg.radius * 0.5, back)
    seg.moss && PolyBatch.addDisc(batch, seg.x + inst.dir * 2, seg.y - seg.radius * 0.35, 2.2, moss)
  }
  inst.spikeAt.forEach(index => {
    const seg = inst.segments[index]
    const prev = inst.segments[index + 1]
    prev && drawBackSpike(batch, seg, prev, contour, back)
  })
  drawTailShears(inst, batch, contour, horn)
  drawHead(inst, batch, contour, back, eye, pupil)
  PolyBatch.flush(batch, k, 1)
}

function drawLeg(inst, batch, limb, contour, leg) {
  const foot = footNow(inst, limb)
  let bend = limb.side
  let knee = solveLeg(limb.hipX, limb.hipY, foot.x, foot.y, THIGH * limb.reach, SHIN * limb.reach, bend)
  const kneeGround = inst.groundAt(knee.kneeX)
  if (knee.kneeY > kneeGround - 1) {
    bend *= -1
    knee = solveLeg(limb.hipX, limb.hipY, foot.x, foot.y, THIGH * limb.reach, SHIN * limb.reach, bend)
  }
  //
  // A folded shin can still cross the ground line. Keep the joint on it.
  //
  knee.kneeY > kneeGround && (knee.kneeY = kneeGround)
  PolyBatch.addLine(batch, limb.hipX, limb.hipY, knee.kneeX, knee.kneeY, 2.4, contour)
  PolyBatch.addLine(batch, knee.kneeX, knee.kneeY, foot.x, foot.y, 1.8, contour)
  PolyBatch.addLine(batch, limb.hipX, limb.hipY, knee.kneeX, knee.kneeY, 1.3, leg)
  PolyBatch.addLine(batch, knee.kneeX, knee.kneeY, foot.x, foot.y, 1.05, leg)
  PolyBatch.addDisc(batch, knee.kneeX, knee.kneeY, 1.5, contour)
  PolyBatch.addDisc(batch, foot.x, foot.y, 1.35, contour)
}

function drawHead(inst, batch, contour, back, eyeColor, pupilColor) {
  const head = inst.segments[0]
  const dir = inst.dir
  const snoutX = head.x + dir * (head.radius + SNOUT_REACH)
  const snoutY = head.y + SNOUT_DROP
  PolyBatch.addLine(batch, head.x, head.y + 1, snoutX, snoutY, 8.2, contour)
  PolyBatch.addLine(batch, head.x, head.y + 0.4, snoutX - dir * 1, snoutY - 0.4, 4.4, back)
  PolyBatch.addLine(batch, head.x + dir * 3, head.y + 3.2, snoutX, snoutY + 1.6, 3.4, contour)
  PolyBatch.addLine(batch, snoutX - dir * 1.2, snoutY + 0.6, snoutX - dir * 2.4, snoutY + 6.2, 1.6, contour)
  PolyBatch.addLine(batch, snoutX + dir * 2.2, snoutY + 0.4, snoutX + dir * 0.6, snoutY + 5.4, 1.45, contour)
  PolyBatch.addDisc(batch, snoutX, snoutY, 2.2, contour)
  const eye = inst.eyes[0]
  if (!eye) return
  const ex = head.x + dir * eye.ox
  const ey = head.y + eye.oy
  PolyBatch.addLine(batch, ex - dir * 6, ey - 3.4, ex + dir * 4.4, ey - 0.8, 2.8, contour)
  PolyBatch.addDisc(batch, ex, ey, 5.6, contour)
  PolyBatch.addDisc(batch, ex, ey, 4.35, eyeColor)
  const px = ex + dir * clamp(eye.px, -1.1, 1.1) * 1.15
  const py = ey + clamp(eye.py, -1.1, 1.1) * 0.7
  PolyBatch.addLine(batch, px, py - 2.8, px, py + 2.8, 1.45, pupilColor)
}

function drawBackSpike(batch, seg, prev, contour, fill) {
  const dx = seg.x - prev.x
  const dy = seg.y - prev.y
  const len = Math.hypot(dx, dy) || 1
  let nx = -dy / len
  let ny = dx / len
  if (ny > 0) {
    nx = -nx
    ny = -ny
  }
  const tx = dx / len
  const ty = dy / len
  const bx = seg.x + nx * seg.radius * 0.28
  const by = seg.y + ny * seg.radius * 0.28
  addSpikeTri(batch, bx, by, tx, ty, nx, ny, SPIKE_HALF + SPIKE_OUTLINE_HALF_PAD, SPIKE_H + SPIKE_OUTLINE_H_PAD, contour)
  addSpikeTri(batch, bx, by, tx, ty, nx, ny, SPIKE_HALF, SPIKE_H, fill)
}

function drawTailShears(inst, batch, contour, horn) {
  const tail = inst.segments[inst.segments.length - 1]
  const prev = inst.segments[inst.segments.length - 2]
  if (!tail || !prev) return
  const dx = tail.x - prev.x
  const dy = tail.y - prev.y
  const len = Math.hypot(dx, dy) || 1
  const tx = dx / len
  const ty = dy / len
  const nx = -ty
  const ny = tx
  const ox = tail.x + tx * tail.radius * 0.35
  const oy = tail.y + ty * tail.radius * 0.2
  for (const side of [-1, 1]) {
    const ex = ox + tx * SHEAR_REACH + nx * side * SHEAR_OPEN
    const ey = oy + ty * SHEAR_REACH + ny * side * SHEAR_OPEN
    PolyBatch.addLine(batch, ox, oy, ex, ey, 3.6, contour)
    PolyBatch.addLine(batch, ox, oy, ex, ey, 1.7, horn)
  }
}

function addSpikeTri(batch, bx, by, tx, ty, nx, ny, half, height, color) {
  PolyBatch.addShape(batch, [
    [bx - tx * half, by - ty * half],
    [bx + nx * height, by + ny * height],
    [bx + tx * half, by + ty * half]
  ], TRI, 0, 0, 1, 1, 1, 0, color)
}

function heroHitbox(inst, heroX, heroFootY) {
  const live = liveHeroAabb(inst.hero?.character)
  if (live) return live
  if (heroX == null || heroFootY == null) return null
  return {
    left: heroX - HERO_HIT_HALF_W,
    right: heroX + HERO_HIT_HALF_W,
    top: heroFootY - HERO_HIT_H,
    bottom: heroFootY
  }
}

function liveHeroAabb(character) {
  if (!character?.worldArea) return null
  let shape = null
  try {
    shape = character.worldArea()
  } catch (_) {
    return null
  }
  const box = shape?.bbox?.() ?? shape
  if (!box?.width || !box?.height) return null
  const left = box.pos?.x ?? box.x ?? 0
  const top = box.pos?.y ?? box.y ?? 0
  return {
    left,
    top,
    right: left + box.width,
    bottom: top + box.height
  }
}

function spineHitsHero(spine, box, stretch, dir) {
  const tailReach = (SHEAR_REACH + 10) * stretch
  for (let i = 0; i < spine.length; i++) {
    const seg = spine[i]
    const next = spine[i + 1]
    const radius = Math.max(8, seg.radius * 0.95) * (1 + (stretch - 1) * 0.35)
    if (circleHitsRect(seg.x, seg.y, radius, box)) return true
    if (!next) continue
    const linkR = Math.max(radius, next.radius * 0.95)
    if (capsuleHitsRect(seg.x, seg.y, next.x, next.y, linkR, box)) return true
  }
  const head = spine[0]
  const tail = spine[spine.length - 1]
  const prev = spine[spine.length - 2]
  if (head) {
    const snoutX = head.x + dir * (head.radius + SNOUT_REACH)
    const snoutY = head.y + SNOUT_DROP
    if (capsuleHitsRect(head.x, head.y, snoutX, snoutY, Math.max(SNOUT_HALF, 6), box)) return true
  }
  if (tail && prev) {
    const dx = tail.x - prev.x
    const dy = tail.y - prev.y
    const len = Math.hypot(dx, dy) || 1
    const tipX = tail.x + dx / len * tailReach
    const tipY = tail.y + dy / len * tailReach
    if (capsuleHitsRect(tail.x, tail.y, tipX, tipY, 9 * stretch, box)) return true
  }
  return false
}

function pointSegDistance(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1
  const dy = y2 - y1
  const len2 = dx * dx + dy * dy || 1
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2))
  const qx = x1 + dx * t
  const qy = y1 + dy * t
  return Math.hypot(px - qx, py - qy)
}

function capsuleHitsRect(x1, y1, x2, y2, radius, box) {
  return segmentHitsRect(
    x1, y1, x2, y2,
    box.left - radius, box.top - radius, box.right + radius, box.bottom + radius
  )
}

function segmentHitsRect(x1, y1, x2, y2, left, top, right, bottom) {
  if (x1 >= left && x1 <= right && y1 >= top && y1 <= bottom) return true
  if (x2 >= left && x2 <= right && y2 >= top && y2 <= bottom) return true
  return segmentsCross(x1, y1, x2, y2, left, top, right, top) ||
    segmentsCross(x1, y1, x2, y2, right, top, right, bottom) ||
    segmentsCross(x1, y1, x2, y2, right, bottom, left, bottom) ||
    segmentsCross(x1, y1, x2, y2, left, bottom, left, top)
}

function segmentsCross(ax, ay, bx, by, cx, cy, dx, dy) {
  const abx = bx - ax
  const aby = by - ay
  const cdx = dx - cx
  const cdy = dy - cy
  const denom = abx * cdy - aby * cdx
  if (Math.abs(denom) < 1e-6) return false
  const t = ((cx - ax) * cdy - (cy - ay) * cdx) / denom
  const u = ((cx - ax) * aby - (cy - ay) * abx) / denom
  return t >= 0 && t <= 1 && u >= 0 && u <= 1
}

function circleHitsRect(cx, cy, radius, box) {
  const nx = clamp(cx, box.left, box.right)
  const ny = clamp(cy, box.top, box.bottom)
  const dx = cx - nx
  const dy = cy - ny
  return dx * dx + dy * dy <= radius * radius
}

//
// Ground under x, or the lake surface while the crawler swims across it.
//
function predatorSurfaceAt(inst, x) {
  const water = inst.water
  const land = inst.landAt(x)
  if (!inst.swimming || !water) return land
  //
  // Lake level only over the lake itself — a flee waypoint ends inland while
  // still swimming, and a flat lake level there sank the legs under the
  // ground line. A short eased ramp inside the shore keeps the spine (and the
  // stick on it) from kinking at the water edge.
  //
  const inset = Math.min(x - water.x1, water.x2 - x)
  if (inset <= 0) return land
  const t = Math.min(1, inset / SWIM_SHORE_RAMP_PX)
  const ease = t * t * (3 - 2 * t)
  return land + (water.surfaceY + SWIM_SURFACE_SINK - land) * ease
}
function rgb(k, hex) {
  const c = getRGB(k, hex)
  return k.rgb(c.r, c.g, c.b)
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v))
}
