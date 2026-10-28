import { CFG } from '../../../cfg.js'
import { applyForestFilmGrainToCanvas } from '../../forest/utils/forest-parallax-grain.js'
import { createSeededRandom } from '../../../utils/seeded-random.js'
import { getRGB } from '../../../utils/helper.js'
import { CAVE_PAL, css } from '../utils/cave-paint.js'
//
// Air plant ("vacuum"): a fat bulb lying on the floor with a tapering neck
// ending in a toothy mouth that points up and left. Landing on its back
// squeezes it: for a few seconds a stream of air puffs out of the mouth
// toward a target (the bubble mushroom).
//
const SPRITE = 'cave0-air-plant-v1'
const GRAIN_SEED = 9990
const BAKE_PAD = 8
//
// Shape: body height, neck length / lift, mouth size, spots, contour.
//
const BODY_H = 86
const NECK_LEN = 0.32
const NECK_W = 26
const NECK_RISE = 34
const MOUTH_R = 15
const MOUTH_TEETH = 5
const MOUTH_TOOTH_LEN = 7
const SPOTS = 9
const SPOT_R_MIN = 3
const SPOT_R_RANGE = 5
const CONTOUR_W = 2
const BELLY_SHADE = 0.42
const BACK_LIGHT_H = 0.3
const SPOT_PALE_CHANCE = 0.5
//
// Outline and detail control points (shares of body width / height /
// mouth radius, angles in radians).
//
const SHAPE = {
  tailOut: 0.05,
  backRise: 1.1,
  crownX: 0.62,
  shoulderX: 0.45,
  lipX: 0.6,
  lipUp: 0.4,
  lipDown: 0.5,
  chinIn: 0.4,
  lightX: 0.66,
  lightY: 0.86,
  lightW: 0.26,
  lightTilt: -0.15,
  spotX: 0.4,
  spotY: 0.3,
  spotSpan: 0.55,
  mouthRx: 0.75,
  mouthRy: 0.45,
  mouthTilt: -0.6,
  teethFan: 1.6
}
//
// Back collider, squeeze and air puff.
//
const BACK_FROM = 0.42
const BACK_TO = 0.96
const BACK_SINK = 10
const COLLIDE_H = 14
const SQUASH_MAX = 0.18
const SQUASH_DECAY = 6
const BLOW_TIME = 4.5
const PUFF_RATE = 26
const PUFF_SPEED = 230
const PUFF_SPREAD = 0.35
const PUFF_LIFE = 0.75
const PUFF_LEN = 10
const PUFF_W = 2
const PUFF_OPACITY = 0.55
const FULL_TURN = Math.PI * 2
const bakedFor = new WeakSet()

/**
 * Creates the air plant.
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay instance
 * @param {number} cfg.x1 - Left end (mouth side)
 * @param {number} cfg.x2 - Right end
 * @param {number} cfg.y - Ground Y
 * @param {{x: number, y: number}} cfg.target - Where the air blows
 * @returns {Object} Air plant instance
 */
export function create(cfg) {
  const { k, x1, x2, y, target } = cfg
  const w = x2 - x1
  !bakedFor.has(k) && (bake(k, w), bakedFor.add(k))
  const mouth = { x: x1 + MOUTH_R, y: y - BODY_H * NECK_LEN - NECK_RISE }
  return {
    k,
    x1,
    x2,
    y,
    w,
    mouth,
    target,
    body: k.add([
      k.rect(w * (BACK_TO - BACK_FROM), COLLIDE_H),
      k.pos(x1 + w * BACK_FROM, y - BODY_H + BACK_SINK),
      k.area(),
      k.body({ isStatic: true }),
      k.opacity(0),
      CFG.game.platformName
    ]),
    blowLeft: 0,
    squash: 0,
    wasOn: false,
    puffs: [],
    puffDebt: 0,
    airRgb: getRGB(k, CAVE_PAL.airPlant.air)
  }
}

/**
 * True while air streams out of the mouth.
 * @param {Object} inst - Air plant instance
 * @returns {boolean}
 */
export function isBlowing(inst) {
  return inst.blowLeft > 0
}

/**
 * Starts a blow when the hero lands on the back; ages the puffs. Returns
 * true on the frame a blow starts.
 * @param {Object} inst - Air plant instance
 * @param {Object|null} heroInst - Hero instance
 * @returns {boolean}
 */
export function onUpdate(inst, heroInst) {
  const dt = inst.k.dt()
  const char = heroInst?.character
  const on = !!(char?.exists?.() && char.isGrounded?.() && char.curPlatform?.() === inst.body)
  const landed = on && !inst.wasOn
  inst.wasOn = on
  landed && (inst.blowLeft = BLOW_TIME, inst.squash = SQUASH_MAX)
  inst.blowLeft = Math.max(0, inst.blowLeft - dt)
  inst.squash = Math.max(0, inst.squash - inst.squash * SQUASH_DECAY * dt)
  inst.blowLeft > 0 && spawnPuffs(inst, dt)
  inst.puffs.forEach(p => {
    p.x += p.vx * dt
    p.y += p.vy * dt
    p.life -= dt
  })
  inst.puffs = inst.puffs.filter(p => p.life > 0)
  return landed
}

/**
 * Draws the plant (squashed while squeezed) and the air puffs.
 * @param {Object} inst - Air plant instance
 */
export function onDraw(inst) {
  const k = inst.k
  const h = BODY_H + BAKE_PAD * 2
  k.drawSprite({
    sprite: SPRITE,
    pos: k.vec2(inst.x1 - BAKE_PAD, inst.y + BAKE_PAD),
    anchor: 'botleft',
    width: inst.w + BAKE_PAD * 2,
    height: h * (1 - inst.squash)
  })
  inst.puffs.forEach(p => {
    const len = Math.hypot(p.vx, p.vy) || 1
    k.drawLine({
      p1: k.vec2(p.x, p.y),
      p2: k.vec2(p.x - p.vx / len * PUFF_LEN, p.y - p.vy / len * PUFF_LEN),
      width: PUFF_W,
      color: inst.airRgb,
      opacity: PUFF_OPACITY * p.life / PUFF_LIFE
    })
  })
}
function spawnPuffs(inst, dt) {
  inst.puffDebt += PUFF_RATE * dt
  const dx = inst.target.x - inst.mouth.x
  const dy = inst.target.y - inst.mouth.y
  const base = Math.atan2(dy, dx)
  const dist = Math.hypot(dx, dy)
  while (inst.puffDebt >= 1) {
    inst.puffDebt -= 1
    const a = base + (Math.random() - 0.5) * PUFF_SPREAD
    inst.puffs.push({
      x: inst.mouth.x,
      y: inst.mouth.y,
      vx: Math.cos(a) * PUFF_SPEED,
      vy: Math.sin(a) * PUFF_SPEED,
      life: Math.min(PUFF_LIFE, dist / PUFF_SPEED)
    })
  }
}
//
// Bulb body on the right, neck sweeping up-left to a toothy mouth, spots,
// shaded belly, lit back.
//
function bake(k, bodyW) {
  const pal = CAVE_PAL.airPlant
  const [contour, dark, mid, light, high] = pal.body
  const w = bodyW + BAKE_PAD * 2
  const h = BODY_H + BAKE_PAD * 2
  const groundY = h - BAKE_PAD
  const x1 = BAKE_PAD
  const x2 = BAKE_PAD + bodyW
  const neckX = x1 + bodyW * NECK_LEN
  const mouthX = x1 + MOUTH_R
  const mouthY = groundY - BODY_H * NECK_LEN - NECK_RISE
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.lineJoin = 'round'
  const body = new Path2D()
  body.moveTo(neckX, groundY)
  body.bezierCurveTo(x2 + bodyW * SHAPE.tailOut, groundY, x2, groundY - BODY_H * SHAPE.backRise, x1 + bodyW * SHAPE.crownX, groundY - BODY_H)
  body.bezierCurveTo(x1 + bodyW * SHAPE.shoulderX, groundY - BODY_H, neckX + NECK_W, mouthY + NECK_W, mouthX + MOUTH_R * SHAPE.lipX, mouthY - MOUTH_R * SHAPE.lipUp)
  body.lineTo(mouthX - MOUTH_R * SHAPE.lipX, mouthY + MOUTH_R * SHAPE.lipDown)
  body.bezierCurveTo(neckX - NECK_W, mouthY + NECK_W * 2, neckX - NECK_W * SHAPE.chinIn, groundY, neckX, groundY)
  body.closePath()
  ctx.save()
  ctx.fillStyle = css(mid)
  ctx.fill(body)
  ctx.clip(body)
  ctx.fillStyle = css(dark)
  ctx.fillRect(x1, groundY - BODY_H * BELLY_SHADE, bodyW, BODY_H)
  ctx.fillStyle = css(light)
  ctx.beginPath()
  ctx.ellipse(x1 + bodyW * SHAPE.lightX, groundY - BODY_H * SHAPE.lightY, bodyW * SHAPE.lightW, BODY_H * BACK_LIGHT_H / 2, SHAPE.lightTilt, 0, FULL_TURN)
  ctx.fill()
  const rng = createSeededRandom(GRAIN_SEED)
  for (let i = 0; i < SPOTS; i++) {
    ctx.fillStyle = css(rng() < SPOT_PALE_CHANCE ? pal.spot : high)
    ctx.beginPath()
    ctx.arc(x1 + bodyW * (SHAPE.spotX + rng() * SHAPE.spotSpan), groundY - BODY_H * (SHAPE.spotY + rng() * SHAPE.spotSpan), SPOT_R_MIN + rng() * SPOT_R_RANGE, 0, FULL_TURN)
    ctx.fill()
  }
  ctx.restore()
  ctx.strokeStyle = css(contour)
  ctx.lineWidth = CONTOUR_W
  ctx.stroke(body)
  ctx.beginPath()
  ctx.ellipse(mouthX, mouthY, MOUTH_R * SHAPE.mouthRx, MOUTH_R * SHAPE.mouthRy, SHAPE.mouthTilt, 0, FULL_TURN)
  ctx.fillStyle = css(pal.mouth)
  ctx.fill()
  ctx.stroke()
  for (let i = 0; i < MOUTH_TEETH; i++) {
    const a = SHAPE.mouthTilt + Math.PI + (i / (MOUTH_TEETH - 1) - 0.5) * SHAPE.teethFan
    const bx = mouthX + Math.cos(a) * MOUTH_R * SHAPE.mouthRx
    const by = mouthY + Math.sin(a) * MOUTH_R * SHAPE.mouthRy
    ctx.beginPath()
    ctx.moveTo(bx - 2, by)
    ctx.lineTo(bx + Math.cos(a + SHAPE.mouthTilt) * MOUTH_TOOTH_LEN, by + Math.sin(a + SHAPE.mouthTilt) * MOUTH_TOOTH_LEN)
    ctx.lineTo(bx + 2, by)
    ctx.closePath()
    ctx.fillStyle = css(pal.tooth)
    ctx.fill()
    ctx.strokeStyle = css(contour)
    ctx.lineWidth = 1
    ctx.stroke()
  }
  applyForestFilmGrainToCanvas(canvas, GRAIN_SEED)
  k.loadSprite(SPRITE, canvas)
}
