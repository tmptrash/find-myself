import { CFG } from '../../../cfg.js'
import { getRGB } from '../../../utils/helper.js'
import { GLOW_PAL, isGlowGrayExploreBeforeL } from '../utils/glow-palette.js'
import * as PolyBatch from '../../../utils/poly-batch.js'
import { initBody, tickBody } from './predator-body.js'
import { tickLegs, solveLeg, footNow } from './predator-ik.js'
import { initEyes, tickEyes } from './predator-eyes.js'
import { tickMove } from './predator-move.js'
import * as Sound from '../../../utils/sound.js'

//
// Low predatory crawler. Pose is computed every frame from the spine, the
// leg targets and the eye targets — there is no baked walk cycle.
//
const LEG_PAIRS = 12
const THIGH = 11
const SHIN = 13
const DRAW_Z = CFG.visual.zIndex.player - 1
const SPIKE_AT = [0.24, 0.46, 0.68]
const SPIKE_H = 16
const SPIKE_HALF = 4.4
const HERO_HIT_HALF_W = 15
const HERO_HIT_H = 69
const SHEAR_REACH = 18
const SHEAR_OPEN = 8
const TRI = [0, 1, 2]
const BODY_HIT_SCALE = 0.85
const SNOUT_REACH = 7
const SNOUT_DROP = 2.4
const SNOUT_HALF = 4.1
//
// Hero must be within this horizontal span of the body to hear foot taps.
//
const FOOT_HEAR_RANGE_X = 360

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
    groundAt: cfg.groundAt,
    hero: cfg.hero,
    zones: cfg.zones,
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
    batch: PolyBatch.create(),
    footHearable: false
  }
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
  syncFootstepAudibility(inst)
  const hero = heroPoint(inst)
  tickMove(inst, dt, hero)
  tickBody(inst, dt)
  const hurry = inst.state === 'charge' || inst.state === 'orient'
  tickLegs(inst, dt, hurry)
  tickEyes(inst, dt, hero)
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
  if (!inst || inst.state === 'coast' || inst.obj?.hidden) return false
  return overlapsHeroHitbox(inst, heroX, heroFootY)
}

/**
 * Same geometry as isTouchingHero, but ignores coast/hidden — for respawn nudge.
 * @param {Object} inst
 * @param {number} heroX
 * @param {number} heroFootY
 * @returns {boolean}
 */
export function overlapsHeroHitbox(inst, heroX, heroFootY) {
  if (!inst || inst.obj?.hidden) return false
  const box = heroHitbox(inst, heroX, heroFootY)
  if (!box) return false
  for (let i = 0; i < inst.segments.length; i++) {
    const seg = inst.segments[i]
    const next = inst.segments[i + 1]
    const radius = seg.radius * BODY_HIT_SCALE
    if (!next) {
      if (circleHitsRect(seg.x, seg.y, radius, box)) return true
      continue
    }
    if (capsuleHitsRect(seg.x, seg.y, next.x, next.y, radius, box)) return true
  }
  const head = inst.segments[0]
  if (!head) return false
  const snoutX = head.x + inst.dir * (head.radius + SNOUT_REACH)
  const snoutY = head.y + SNOUT_DROP
  return capsuleHitsRect(head.x, head.y, snoutX, snoutY, SNOUT_HALF, box)
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
  const colorFade = inst.zones?._sceneRef?.colorFade ?? 0
  const gray = isGlowGrayExploreBeforeL(inst.zones, colorFade)
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
  addSpikeTri(batch, bx, by, tx, ty, nx, ny, SPIKE_HALF + 1.7, SPIKE_H + 2.2, contour)
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

function rgb(k, hex) {
  const c = getRGB(k, hex)
  return k.rgb(c.r, c.g, c.b)
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v))
}
