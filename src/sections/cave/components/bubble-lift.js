import { CFG } from '../../../cfg.js'
import { applyForestFilmGrainToCanvas } from '../../forest/utils/forest-parallax-grain.js'
import { getRGB } from '../../../utils/helper.js'
import * as Glow from '../utils/cave-glow.js'
import { CAVE_PAL, css } from '../utils/cave-paint.js'
//
// Bubble mushroom: a thin curved stalk with a cup that blows a glassy
// bubble. On its own the bubble stays small — a hero jumping into it is too
// heavy, it sinks with him and pops. While the air plant blows on it the
// bubble swells; a swollen bubble carries the hero up to the top line,
// hangs there a moment and pops. The hero can jump out at any time.
//
const SPRITE = 'cave0-bubble-stalk-v1'
const GRAIN_SEED = 9970
const BAKE_PAD = 8
//
// Stalk: height, sideways curve, width, cup and the leaf at its foot.
//
const STALK_H = 96
const STALK_CURVE = 26
const STALK_W = 5
const STALK_STEPS = 16
const CUP_W = 30
const CUP_H = 10
const FOOT_LEAF_W = 34
const FOOT_LEAF_H = 11
const FOOT_LEAF_TILT = -0.35
const CONTOUR_W = 1.4
//
// Stalk foot position inside the baked canvas.
//
const FOOT_X = BAKE_PAD + FOOT_LEAF_W / 2
//
// Bubble sizes (radius), growth / shrink speeds, lift threshold.
//
const R_SMALL = 26
const R_BIG = 62
const R_LIFT = 50
const GROW_SPEED = 26
const SHRINK_SPEED = 8
const R_WOBBLE = 1.2
const R_WOBBLE_SPEED = 3
//
// A regrowing bubble starts from nothing; the wobble would push its radius
// below zero, which Kaplay cannot draw — skip it until it is this big.
//
const MIN_DRAW_R = 1
//
// Rides: rise / sink speeds, hang time at the top, sink time, regrow delay.
//
const RISE_SPEED = 95
const SINK_SPEED = 70
const TOP_HOLD = 2.4
const SINK_TIME = 0.8
const REGROW_DELAY = 1.2
const CATCH_SHARE = 0.85
const HERO_IN_BUBBLE_DY = 0.12
const EXIT_JUMP_MULT = 0.9
//
// Look: thin fill, rim, glint, warm core glow from the cup.
//
const FILL_OPACITY = 0.14
const RIM_W = 2
const RIM_OPACITY = 0.75
const GLINT_SHIFT = 0.42
const GLINT_R = 0.16
const GLINT_OPACITY = 0.8
const CORE_GLOW_R = 0.9
const CORE_GLOW_OPACITY = 0.35
const BUBBLE_STATE = {
  GROWING: 'growing',
  RISING: 'rising',
  SINKING: 'sinking',
  POPPED: 'popped'
}
const B = BUBBLE_STATE
const bakedFor = new WeakSet()

/**
 * Creates the bubble mushroom.
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay instance
 * @param {number} cfg.x - Stalk foot X
 * @param {number} cfg.y - Ground Y
 * @param {number} cfg.topY - Hero centre height where a rising bubble stops
 * @returns {Object} Bubble instance
 */
export function create(cfg) {
  const { k, x, y, topY } = cfg
  !bakedFor.has(k) && (bake(k), bakedFor.add(k))
  Glow.create(k)
  const cup = { x: x + STALK_CURVE, y: y - STALK_H }
  return {
    k,
    x,
    y,
    topY,
    cup,
    r: R_SMALL,
    cx: cup.x,
    cy: cup.y - R_SMALL,
    state: B.GROWING,
    timer: 0,
    rider: null,
    blowing: false,
    rimRgb: getRGB(k, CAVE_PAL.bubble.rim),
    fillRgb: getRGB(k, CAVE_PAL.bubble.fill),
    glintRgb: getRGB(k, CAVE_PAL.bubble.glint),
    coreRgb: getRGB(k, CAVE_PAL.bubble.core)
  }
}

/**
 * Air from the air plant reaching the bubble (swells it).
 * @param {Object} inst - Bubble instance
 * @param {boolean} on - Air is blowing now
 */
export function setBlowing(inst, on) {
  inst.blowing = on
}

/**
 * Grows the bubble, catches the hero, carries and pops it. Returns 'pop'
 * on the frame it bursts and 'catch' when it takes the hero in.
 * @param {Object} inst - Bubble instance
 * @param {Object|null} heroInst - Hero instance
 * @returns {string|null}
 */
export function onUpdate(inst, heroInst) {
  const dt = inst.k.dt()
  inst.timer += dt
  if (inst.state === B.POPPED) {
    inst.timer >= REGROW_DELAY && reset(inst)
    return null
  }
  if (inst.state === B.GROWING) {
    const target = inst.blowing ? R_BIG : R_SMALL
    inst.r += Math.sign(target - inst.r) * Math.min(Math.abs(target - inst.r), (inst.blowing ? GROW_SPEED : SHRINK_SPEED) * dt)
    inst.cx = inst.cup.x
    inst.cy = inst.cup.y - inst.r
    return tryCatch(inst, heroInst) ? 'catch' : null
  }
  if (inst.state === B.RISING) {
    inst.cy = Math.max(inst.topY, inst.cy - RISE_SPEED * dt)
    inst.cy > inst.topY && (inst.timer = 0)
  } else {
    inst.cy += SINK_SPEED * dt
  }
  holdRider(inst)
  const limit = inst.state === B.RISING ? TOP_HOLD : SINK_TIME
  if (inst.timer < limit) return null
  pop(inst, false)
  return 'pop'
}

/**
 * Lets the rider jump out of the bubble (which then pops).
 * @param {Object} inst - Bubble instance
 * @returns {boolean} True when there was a rider
 */
export function jumpOut(inst) {
  if (!inst.rider) return false
  pop(inst, true)
  return true
}

/**
 * Frees the rider without a jump (death, respawn).
 * @param {Object} inst - Bubble instance
 */
export function drop(inst) {
  inst.rider && pop(inst, false)
}

/**
 * Draws the stalk (world pass).
 * @param {Object} inst - Bubble instance
 */
export function onDraw(inst) {
  inst.k.drawSprite({ sprite: SPRITE, pos: inst.k.vec2(inst.x - FOOT_X, inst.y + BAKE_PAD), anchor: 'botleft' })
}

/**
 * Draws the bubble over the hero (front effects pass).
 * @param {Object} inst - Bubble instance
 */
export function onDrawBubble(inst) {
  if (inst.state === B.POPPED) return
  const k = inst.k
  const r = inst.r + Math.sin(k.time() * R_WOBBLE_SPEED) * R_WOBBLE
  if (r < MIN_DRAW_R) return
  const pos = k.vec2(inst.cx, inst.cy)
  Glow.drawGlow(k, inst.cx, inst.cy + r * GLINT_SHIFT, r * CORE_GLOW_R, inst.coreRgb, CORE_GLOW_OPACITY)
  k.drawCircle({ pos, radius: r, color: inst.fillRgb, opacity: FILL_OPACITY, outline: { width: RIM_W, color: inst.rimRgb, opacity: RIM_OPACITY } })
  k.drawCircle({ pos: k.vec2(inst.cx - r * GLINT_SHIFT, inst.cy - r * GLINT_SHIFT), radius: r * GLINT_R, color: inst.glintRgb, opacity: GLINT_OPACITY })
}
//
// A hero in the air whose centre enters the bubble is taken in: it lifts
// him when swollen, otherwise sinks with him.
//
function tryCatch(inst, heroInst) {
  const char = heroInst?.character
  if (!char?.exists?.() || char.isGrounded?.()) return false
  if (Math.hypot(char.pos.x - inst.cx, char.pos.y - inst.cy) > inst.r * CATCH_SHARE) return false
  inst.rider = heroInst
  heroInst.controllable = false
  char.gravityScale = 0
  inst.state = inst.r >= R_LIFT ? B.RISING : B.SINKING
  inst.timer = 0
  holdRider(inst)
  return true
}
function holdRider(inst) {
  const char = inst.rider?.character
  if (!char?.exists?.()) return
  char.vel.x = 0
  char.vel.y = 0
  char.moveTo(inst.cx, inst.cy + inst.r * HERO_IN_BUBBLE_DY)
}
function pop(inst, withJump) {
  const hero = inst.rider
  const char = hero?.character
  if (char?.exists?.()) {
    hero.controllable = true
    char.gravityScale = 1
    withJump && char.jump(Math.round(CFG.game.jumpForce * EXIT_JUMP_MULT))
  }
  inst.rider = null
  inst.state = B.POPPED
  inst.timer = 0
}
function reset(inst) {
  inst.state = B.GROWING
  inst.r = 0
  inst.timer = 0
}
//
// Curved stalk from the foot leaf up to the cup.
//
function bake(k) {
  const pal = CAVE_PAL.bubble.stem
  const w = STALK_CURVE + CUP_W + FOOT_LEAF_W + BAKE_PAD * 2
  const h = STALK_H + CUP_H + BAKE_PAD * 2
  const fx = FOOT_X
  const groundY = h - BAKE_PAD
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.lineCap = 'round'
  const pts = Array.from({ length: STALK_STEPS + 1 }, (_, i) => {
    const t = i / STALK_STEPS
    return { x: fx + STALK_CURVE * Math.sin(t * Math.PI / 2), y: groundY - STALK_H * t }
  })
  const stroke = (color, width) => {
    ctx.strokeStyle = css(color)
    ctx.lineWidth = width
    ctx.beginPath()
    pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
    ctx.stroke()
  }
  stroke(pal[0], STALK_W + CONTOUR_W * 2)
  stroke(pal[2], STALK_W)
  stroke(pal[3], 1)
  const top = pts[pts.length - 1]
  ctx.beginPath()
  ctx.moveTo(top.x - CUP_W / 2, top.y - CUP_H)
  ctx.quadraticCurveTo(top.x, top.y + CUP_H, top.x + CUP_W / 2, top.y - CUP_H)
  ctx.closePath()
  ctx.fillStyle = css(pal[2])
  ctx.fill()
  ctx.strokeStyle = css(pal[0])
  ctx.lineWidth = CONTOUR_W
  ctx.stroke()
  ctx.beginPath()
  ctx.ellipse(fx - FOOT_LEAF_W / 4, groundY - FOOT_LEAF_H / 2, FOOT_LEAF_W / 2, FOOT_LEAF_H / 2, FOOT_LEAF_TILT, 0, Math.PI * 2)
  ctx.fillStyle = css(CAVE_PAL.leaf[2])
  ctx.fill()
  ctx.strokeStyle = css(CAVE_PAL.leaf[0])
  ctx.stroke()
  applyForestFilmGrainToCanvas(canvas, GRAIN_SEED)
  k.loadSprite(SPRITE, canvas)
}
