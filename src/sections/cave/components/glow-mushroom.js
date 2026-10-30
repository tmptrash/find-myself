import { CFG } from '../../../cfg.js'
import { applyForestFilmGrainToCanvas } from '../../forest/utils/forest-parallax-grain.js'
import { createSeededRandom } from '../../../utils/seeded-random.js'
import { CAVE_PAL, css } from '../utils/cave-paint.js'
import { getRGB } from '../../../utils/helper.js'
import * as Glow from '../utils/cave-glow.js'
//
// Fluorescent cave mushroom. A dormant one shows only a faint glowing
// contour; landing on its cap springs the hero up and lights it like a
// lantern, then it dims a step every second until the next landing. Lit
// ones of the lower cave glow all the time with a slow breathing halo.
//
export const MUSHROOM_KIND = {
  DORMANT: 'dormant',
  LIT: 'lit'
}
const BASE_CAP_W = 64
const BASE_H = 92
const BAKE_PAD = 6
const SPRITE_PREFIX = 'cave0-mushroom-v7'
const GRAIN_SEED_BASE = 8700
const SHAPE_SEED_MULT = 97
const PHASE_PER_SEED = 1.7
//
// Cluster: the main mushroom centred on the canvas, small ones around it
// (cap-width share, height share, X offset in main cap widths).
//
const CLUSTER_W = 2.1
const BABIES = [
  { size: 0.42, height: 0.5, dx: -0.66 },
  { size: 0.3, height: 0.42, dx: 0.6 },
  { size: 0.22, height: 0.26, dx: 0.86 }
]
const BABY_JITTER = 0.08
//
// Shape: wide dome cap with a slightly drooping rim, the lit gill fan seen
// from below, a tall slender stem flaring into its foot, a skirt under the
// cap.
//
const CAP_H_FRAC = 0.4
const CAP_RIM_DROOP = 0.1
const CAP_SHOULDER = 0.12
const UNDER_DEPTH = 0.24
const STEM_TOP_W = 0.15
const STEM_FOOT_W = 0.46
const STEM_FOOT_RISE = 0.3
const STEM_BEND = 0.1
const STEM_SWELL = 1.3
const SKIRT_AT = 0.16
const SKIRT_W = 0.34
const SKIRT_H = 0.1
const SKIRT_NECK = 0.4
const SKIRT_HEM = 0.8
const SKIRT_HEM_LIFT = 0.7
const GILL_COUNT = 15
const GILL_ROOT_DEPTH = 0.3
const STEM_NECK_DEPTH = 0.85
const STEM_TOP_FLARE = 1.6
const GILL_ALPHA = 0.8
const UNDER_CORE_W = 0.5
const UNDER_CORE_ALPHA = 0.7
//
// Cap shading and glints.
//
const CAP_LIGHT_W = 0.62
const CAP_LIGHT_H = 0.55
const CAP_LIGHT_SHIFT = 0.16
const CAP_RIM_BAND = 0.18
const SPECK_COUNT = 9
const SPECK_R_MIN = 0.6
const SPECK_R_RANGE = 1.3
const SPECK_BRIGHT_CHANCE = 0.5
const SPECK_SPREAD_X = 0.78
const SPECK_TOP = 0.15
const SPECK_RANGE_Y = 0.6
const STEM_SHADE_W = 0.36
const STEM_FIBRE_COUNT = 3
const STEM_FIBRE_ALPHA = 0.35
//
// Moss tuft under the cluster.
//
const MOSS_W = 1.2
const MOSS_STEP = 3
const MOSS_R_MIN = 1.5
const MOSS_R_RANGE = 2.5
const MOSS_LIGHT_CHANCE = 0.35
const MOSS_STRETCH = 1.4
const CONTOUR_W = 1.6
const BODY_CONTOUR_W = 1.2
const FULL_TURN = Math.PI * 2
//
// Light: steps per second while dimming, full duration and halo look.
//
const LIGHT_SECONDS = 9
const LIGHT_STEP_EASE = 6
const HALO_RADIUS_FRAC = 2.4
const HALO_LIT_OPACITY = 0.5
const HALO_BREATH_AMP = 0.18
const HALO_BREATH_SPEED = 1.3
const CONTOUR_DORMANT_OPACITY = 0.6
const CONTOUR_PULSE_AMP = 0.18
const CONTOUR_PULSE_SPEED = 1.7
//
// Bounce: the hero falling onto the cap leaves it at his normal jump speed
// but under stronger gravity until he lands again, so the hop is quick and
// half as high. The cap hit zone is a share of the cap width; nothing
// blocks the hero from below.
//
const BOUNCE_JUMP_MULT = 1
const BOUNCE_GRAVITY_SCALE = 2
const BOUNCE_COOLDOWN = 0.35
const CAP_HIT_HALF = 0.45
const CAP_HIT_DEPTH = 14
const HERO_FEET_DY = 38
const SQUASH_MAX = 0.16
const SQUASH_DECAY = 7
const SQUASH_WIDEN = 0.6
const DORMANT_HALO_SCALE = 1.6
//
// Stem foot sinks this far into the ground so it never floats on a moss rim.
//
const GROUND_SINK = 2
//
// Idle: now and then the main mushroom and its small ones (each on its own
// clock) squat a little and rise again.
//
const IDLE_SQUAT_AMP = 0.07
const IDLE_SQUAT_TIME = 0.7
const IDLE_WAIT_MIN = 2.5
const IDLE_WAIT_RANGE = 5
const bakedByK = new WeakMap()

/**
 * Creates a cave mushroom.
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay instance
 * @param {number} cfg.x - Stem base X
 * @param {number} cfg.y - Ground Y under the stem
 * @param {number} [cfg.scale=1] - Size multiplier
 * @param {number} [cfg.seed=1] - Shape seed
 * @param {string} [cfg.kind] - MUSHROOM_KIND value
 * @param {boolean} [cfg.moss=true] - Moss tuft at the feet (off for the menu icon)
 * @param {Object|null} [cfg.tint=null] - Kaplay rgb multiplied over the art (darker background mushrooms)
 * @param {number} [cfg.haloOpacity] - Halo strength (weaker for background mushrooms)
 * @param {number} [cfg.blur=0] - Blur radius baked into the art (background depth)
 * @returns {Object} Mushroom instance
 */
export function create(cfg) {
  const { k, x, y, scale = 1, seed = 1, kind = MUSHROOM_KIND.LIT, moss = true, tint = null, haloOpacity = HALO_LIT_OPACITY, blur = 0 } = cfg
  const sprites = bakeMushroom(k, seed, moss, blur)
  const inst = {
    k,
    x,
    y,
    scale,
    kind,
    sprites,
    w: 0,
    h: 0,
    capW: 0,
    capTopY: 0,
    phase: seed * PHASE_PER_SEED,
    light: kind === MUSHROOM_KIND.LIT ? 1 : 0,
    litAt: -Infinity,
    squash: 0,
    cooldown: 0,
    prevFeet: null,
    floatingChar: null,
    mainIdle: newIdle(),
    babyIdle: newIdle(),
    haloRgb: getRGB(k, CAVE_PAL.glowTint),
    tint,
    haloOpacity,
    fade: 1
  }
  setPose(inst, x, y, scale)
  return inst
}

/**
 * Fades the whole mushroom and its halo (the menu picture cross-fading).
 * @param {Object} inst - Mushroom instance
 * @param {number} fade - 0 … 1
 */
export function setFade(inst, fade) {
  inst.fade = fade
}

/**
 * Moves and rescales a mushroom (the menu icon breathes with its row).
 * @param {Object} inst - Mushroom instance
 * @param {number} x - Stem base X
 * @param {number} y - Ground Y under the stem
 * @param {number} scale - Size multiplier
 */
export function setPose(inst, x, y, scale) {
  inst.x = x
  inst.y = y
  inst.scale = scale
  inst.w = Math.round(inst.sprites.w * scale)
  inst.h = Math.round(inst.sprites.h * scale)
  inst.capW = BASE_CAP_W * scale
  inst.capTopY = y - (inst.sprites.h - BAKE_PAD - inst.sprites.capTop) * scale + GROUND_SINK
}

/**
 * Half width of the whole cluster (small ones and moss included) at a scale.
 * @param {number} scale - Size multiplier
 * @returns {number}
 */
export function clusterHalfWidth(scale) {
  const babiesReach = Math.max(...BABIES.map(b => Math.abs(b.dx) + b.size / 2))
  return BASE_CAP_W * Math.max(babiesReach, MOSS_W / 2) * scale
}

/**
 * Visible height from the cap top to the ground line at a scale (menu
 * icon centring).
 * @param {Object} inst - Mushroom instance
 * @param {number} scale - Size multiplier
 * @returns {number}
 */
export function visibleHeight(inst, scale) {
  return (inst.sprites.h - BAKE_PAD - inst.sprites.capTop) * scale
}

/**
 * Advances light, squash, idle squats and the bounce check.
 * @param {Object} inst - Mushroom instance
 * @param {Object|null} heroInst - Hero instance (bounce target, dormant only)
 * @returns {boolean} True on the frame the hero was bounced
 */
export function onUpdate(inst, heroInst) {
  const dt = inst.k.dt()
  inst.squash = Math.max(0, inst.squash - inst.squash * SQUASH_DECAY * dt)
  inst.cooldown = Math.max(0, inst.cooldown - dt)
  tickIdle(inst.mainIdle, dt)
  tickIdle(inst.babyIdle, dt)
  releaseFloat(inst)
  if (inst.kind !== MUSHROOM_KIND.DORMANT) return false
  updateLight(inst)
  return tryBounce(inst, heroInst)
}

/**
 * Current light level 0..1.
 * @param {Object} inst - Mushroom instance
 * @returns {number}
 */
export function lightLevel(inst) {
  return inst.light
}

/**
 * Whole seconds since the last landing while the lantern is still dimming,
 * or -1 when dark / never lit.
 * @param {Object} inst - Mushroom instance
 * @returns {number}
 */
export function lightStep(inst) {
  const elapsed = inst.k.time() - inst.litAt
  if (!Number.isFinite(elapsed) || elapsed > LIGHT_SECONDS) return -1
  return Math.floor(elapsed)
}

/**
 * Draws the glow halo (additive) — call inside the glow pass.
 * @param {Object} inst - Mushroom instance
 */
export function onDrawHalo(inst) {
  if (inst.light <= 0) return
  const k = inst.k
  const breath = 1 + Math.sin(k.time() * HALO_BREATH_SPEED + inst.phase) * HALO_BREATH_AMP
  const r = inst.capW * HALO_RADIUS_FRAC * (inst.kind === MUSHROOM_KIND.DORMANT ? DORMANT_HALO_SCALE : 1)
  Glow.drawGlow(k, inst.x, inst.capTopY + inst.capW * CAP_H_FRAC, r, inst.haloRgb, inst.haloOpacity * inst.light * breath * inst.fade)
}

/**
 * Draws the small mushrooms and the main one (lit body and / or the
 * dormant contour). Under the hero only the main cap and its gill fan
 * dip and squash — every stem foot stays planted in the ground.
 * @param {Object} inst - Mushroom instance
 */
export function onDraw(inst) {
  const k = inst.k
  const contourOpacity = inst.kind === MUSHROOM_KIND.DORMANT
    ? (1 - inst.light) * (CONTOUR_DORMANT_OPACITY + Math.sin(k.time() * CONTOUR_PULSE_SPEED + inst.phase) * CONTOUR_PULSE_AMP)
    : 0
  const babySquash = idleSquash(inst.babyIdle)
  const capSquash = Math.max(inst.squash, idleSquash(inst.mainIdle))
  drawLayer(inst, inst.sprites.babiesContour, babySquash, 0, contourOpacity)
  drawLayer(inst, inst.sprites.babiesBody, babySquash, 0, inst.light)
  drawLayer(inst, inst.sprites.mainUnderContour, capSquash, SQUASH_WIDEN, contourOpacity)
  drawLayer(inst, inst.sprites.mainStemContour, 0, 0, contourOpacity)
  drawLayer(inst, inst.sprites.mainCapContour, capSquash, SQUASH_WIDEN, contourOpacity)
  drawLayer(inst, inst.sprites.mainUnder, capSquash, SQUASH_WIDEN, inst.light)
  drawLayer(inst, inst.sprites.mainStem, 0, 0, inst.light)
  drawLayer(inst, inst.sprites.mainCap, capSquash, SQUASH_WIDEN, inst.light)
}

/**
 * Restores normal gravity on a hero still floating from a bounce.
 * @param {Object} inst - Mushroom instance
 */
export function destroy(inst) {
  inst.floatingChar?.exists?.() && (inst.floatingChar.gravityScale = 1)
  inst.floatingChar = null
}
//
// One baked layer standing on the ground line: squash shortens it from the
// bottom (so the cap dips), widen spreads it sideways.
//
function drawLayer(inst, sprite, squash, widen, layerOpacity) {
  const opacity = layerOpacity * inst.fade
  if (opacity <= 0) return
  const pad = BAKE_PAD * inst.scale
  inst.k.drawSprite({
    sprite,
    pos: inst.k.vec2(Math.round(inst.x), Math.round(inst.y + GROUND_SINK)),
    anchor: 'bot',
    width: inst.w * (1 + squash * widen),
    height: (inst.h - pad) * (1 - squash) + pad,
    opacity,
    ...(inst.tint ? { color: inst.tint } : {})
  })
}
function newIdle() {
  return { wait: IDLE_WAIT_MIN + Math.random() * IDLE_WAIT_RANGE, t: -1 }
}
//
// Waits a random while, then plays one squat (t runs 0 → 1).
//
function tickIdle(idle, dt) {
  if (idle.t >= 0) {
    idle.t += dt / IDLE_SQUAT_TIME
    idle.t >= 1 && Object.assign(idle, newIdle())
    return
  }
  idle.wait -= dt
  idle.wait <= 0 && (idle.t = 0)
}
function idleSquash(idle) {
  return idle.t >= 0 ? Math.sin(Math.PI * idle.t) * IDLE_SQUAT_AMP : 0
}
//
// Stepped dimming: one step down every second since the last landing, each
// step eased in over a fraction of a second.
//
function updateLight(inst) {
  const elapsed = inst.k.time() - inst.litAt
  if (elapsed < 0 || !Number.isFinite(elapsed)) return
  const steps = Math.floor(elapsed)
  const target = Math.max(0, 1 - steps / LIGHT_SECONDS)
  inst.light += (target - inst.light) * Math.min(1, LIGHT_STEP_EASE * inst.k.dt())
}
//
// Spring the hero when his feet cross the cap top while falling, inside
// the cap span. From below he passes through the cap freely.
//
function tryBounce(inst, heroInst) {
  const char = heroInst?.character
  if (!char?.exists?.()) {
    inst.prevFeet = null
    return false
  }
  const feet = char.pos.y + HERO_FEET_DY
  const prev = inst.prevFeet
  inst.prevFeet = feet
  const falling = (char.vel?.y ?? 0) > 0
  const crossed = prev !== null && prev <= inst.capTopY && feet >= inst.capTopY && feet <= inst.capTopY + CAP_HIT_DEPTH
  const overCap = Math.abs(char.pos.x - inst.x) <= inst.capW * CAP_HIT_HALF
  if (inst.cooldown > 0 || !falling || !crossed || !overCap) return false
  char.vel.y = -Math.round(CFG.game.jumpForce * BOUNCE_JUMP_MULT)
  char.gravityScale = BOUNCE_GRAVITY_SCALE
  inst.floatingChar = char
  heroInst.wasJumping = true
  heroInst.jumpPhase = 'jumping'
  inst.cooldown = BOUNCE_COOLDOWN
  inst.squash = SQUASH_MAX
  inst.litAt = inst.k.time()
  inst.light = Math.max(inst.light, 1)
  return true
}
//
// Weak bounce gravity lasts until the hero stands on something again.
//
function releaseFloat(inst) {
  const char = inst.floatingChar
  if (!char) return
  const landed = !char.exists?.() || (inst.cooldown <= 0 && char.isGrounded?.())
  if (!landed) return
  char.exists?.() && (char.gravityScale = 1)
  inst.floatingChar = null
}
//
// Bakes the small ones and the main mushroom's gill fan, stem and cap as
// separate sprites, plus their contours (same canvas size, so they overlay
// exactly) once per k and blur (background mushrooms are soft).
//
function bakeMushroom(k, seed, moss, blur) {
  let perK = bakedByK.get(k)
  !perK && (perK = new Map(), bakedByK.set(k, perK), Glow.create(k))
  const key = `${seed}-${moss ? 'moss' : 'bare'}-${blur}`
  const cached = perK.get(key)
  if (cached) return cached
  const w = Math.ceil(BASE_CAP_W * CLUSTER_W + BAKE_PAD * 2)
  const h = BASE_H + BAKE_PAD * 2
  const rng = createSeededRandom(seed * SHAPE_SEED_MULT)
  const shape = buildShape(rng, w, h)
  const main = shape.slice(-1)
  const babies = shape.slice(0, -1)
  const bake = (name, paint) => {
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    ctx.lineJoin = 'round'
    paint(ctx)
    blur > 0 && blurCanvas(canvas, blur)
    k.loadSprite(name, canvas)
    return name
  }
  const prefix = `${SPRITE_PREFIX}-${key}`
  const names = {
    w,
    h,
    capTop: main[0].capTop,
    babiesBody: bake(`${prefix}-babies-body`, ctx => {
      paintBody(ctx, babies, rng)
      moss && paintMoss(ctx, rng, w / 2, h - BAKE_PAD)
      applyForestFilmGrainToCanvas(ctx.canvas, GRAIN_SEED_BASE + seed)
    }),
    mainUnder: bake(`${prefix}-main-under`, ctx => {
      paintUnderside(ctx, main[0])
      applyForestFilmGrainToCanvas(ctx.canvas, GRAIN_SEED_BASE + seed + 1)
    }),
    mainStem: bake(`${prefix}-main-stem`, ctx => {
      paintStem(ctx, main[0])
      applyForestFilmGrainToCanvas(ctx.canvas, GRAIN_SEED_BASE + seed + 2)
    }),
    mainCap: bake(`${prefix}-main-cap`, ctx => {
      paintCap(ctx, main[0], rng)
      applyForestFilmGrainToCanvas(ctx.canvas, GRAIN_SEED_BASE + seed + 3)
    }),
    babiesContour: bake(`${prefix}-babies-contour`, ctx => paintContour(ctx, babies)),
    mainUnderContour: bake(`${prefix}-main-under-contour`, ctx => paintUnderContour(ctx, main[0])),
    mainStemContour: bake(`${prefix}-main-stem-contour`, ctx => strokePart(ctx, () => traceStem(ctx, main[0]))),
    mainCapContour: bake(`${prefix}-main-cap-contour`, ctx => strokePart(ctx, () => traceCap(ctx, main[0])))
  }
  perK.set(key, names)
  return names
}
//
// Small mushrooms first (behind), the main one last, all on the canvas
// bottom; the main stem stands on the canvas centre line.
//
function buildShape(rng, w, h) {
  const groundY = h - BAKE_PAD
  const height = BASE_H - BAKE_PAD
  const babies = BABIES.map(b => {
    const jitter = 1 + (rng() - 0.5) * BABY_JITTER * 2
    return oneMushroom(w / 2 + b.dx * BASE_CAP_W, groundY, BASE_CAP_W * b.size * jitter, height * b.height * jitter, rng)
  })
  return [...babies, oneMushroom(w / 2, groundY, BASE_CAP_W, height, rng)]
}
function oneMushroom(x, groundY, capW, height, rng) {
  const capH = capW * CAP_H_FRAC
  const capTop = groundY - height
  const rimY = capTop + capH
  return {
    x,
    groundY,
    capW,
    capH,
    capTop,
    rimY,
    underRy: capW * UNDER_DEPTH,
    bend: (rng() - 0.5) * capW * STEM_BEND
  }
}
//
// Dome from rim to rim with rounded shoulders and a drooping rim.
//
function traceCap(ctx, m) {
  const half = m.capW / 2
  const rim = m.rimY + m.capH * CAP_RIM_DROOP
  ctx.beginPath()
  ctx.moveTo(m.x - half, rim)
  ctx.bezierCurveTo(m.x - half, m.capTop - m.capH * CAP_SHOULDER, m.x + half, m.capTop - m.capH * CAP_SHOULDER, m.x + half, rim)
  ctx.quadraticCurveTo(m.x, m.rimY - m.capH * CAP_RIM_DROOP, m.x - half, rim)
  ctx.closePath()
}
//
// Gill fan under the cap: the lower half of a flat ellipse below the rim.
//
function traceUnderside(ctx, m) {
  ctx.beginPath()
  ctx.ellipse(m.x, m.rimY, m.capW / 2, m.underRy, 0, 0, Math.PI)
  ctx.closePath()
}
//
// Stem rising into the middle of the gill fan: it flares a little where
// it meets the gills (the cap, drawn last, hides its very top), then runs
// down and widens into the foot.
//
function traceStem(ctx, m) {
  const top = m.capW * STEM_TOP_W / 2
  const foot = m.capW * STEM_FOOT_W / 2
  const stemTop = m.rimY
  const neckY = stemTop + m.underRy * STEM_NECK_DEPTH
  const footRise = (m.groundY - neckY) * STEM_FOOT_RISE
  const midY = (neckY + m.groundY) / 2
  ctx.beginPath()
  ctx.moveTo(m.x - top * STEM_TOP_FLARE, stemTop)
  ctx.quadraticCurveTo(m.x - top, stemTop + (neckY - stemTop) / 2, m.x - top, neckY)
  ctx.quadraticCurveTo(m.x - top + m.bend, midY, m.x - top * STEM_SWELL + m.bend / 2, m.groundY - footRise)
  ctx.quadraticCurveTo(m.x - top * STEM_SWELL, m.groundY, m.x - foot, m.groundY)
  ctx.lineTo(m.x + foot, m.groundY)
  ctx.quadraticCurveTo(m.x + top * STEM_SWELL, m.groundY, m.x + top * STEM_SWELL + m.bend / 2, m.groundY - footRise)
  ctx.quadraticCurveTo(m.x + top + m.bend, midY, m.x + top, neckY)
  ctx.quadraticCurveTo(m.x + top, stemTop + (neckY - stemTop) / 2, m.x + top * STEM_TOP_FLARE, stemTop)
  ctx.closePath()
}
//
// Small drooping skirt (annulus) just under the cap.
//
function traceSkirt(ctx, m) {
  const stemTop = m.rimY + m.underRy * STEM_NECK_DEPTH
  const y = stemTop + (m.groundY - stemTop) * SKIRT_AT
  const half = m.capW * SKIRT_W / 2
  const drop = m.capW * SKIRT_H
  ctx.beginPath()
  ctx.moveTo(m.x - half * SKIRT_NECK, y)
  ctx.quadraticCurveTo(m.x - half, y + drop * SKIRT_NECK, m.x - half * SKIRT_HEM, y + drop)
  ctx.quadraticCurveTo(m.x, y + drop * SKIRT_HEM_LIFT, m.x + half * SKIRT_HEM, y + drop)
  ctx.quadraticCurveTo(m.x + half, y + drop * SKIRT_NECK, m.x + half * SKIRT_NECK, y)
  ctx.closePath()
}
//
// Lit body, back to front per mushroom: stem with a shaded side and
// fibres, skirt, the glowing gill fan with radial gills, then the cap with
// a pale top light, darker rim band and bright specks.
//
function paintBody(ctx, shape, rng) {
  ctx.lineJoin = 'round'
  shape.forEach(m => {
    paintUnderside(ctx, m)
    paintStem(ctx, m)
    paintCap(ctx, m, rng)
  })
}
function paintStem(ctx, m) {
  traceStem(ctx, m)
  ctx.fillStyle = css(CAVE_PAL.mushroomStem)
  ctx.fill()
  ctx.save()
  ctx.clip()
  const shadeW = m.capW * STEM_FOOT_W * STEM_SHADE_W
  ctx.fillStyle = css(CAVE_PAL.mushroomStemShade)
  ctx.fillRect(m.x + m.capW * STEM_FOOT_W / 2 - shadeW, m.rimY, shadeW, m.groundY - m.rimY)
  ctx.strokeStyle = css(CAVE_PAL.mushroomStemShade, STEM_FIBRE_ALPHA)
  ctx.lineWidth = 1
  for (let i = 1; i <= STEM_FIBRE_COUNT; i++) {
    const fx = m.x + m.bend / 2 + (i / (STEM_FIBRE_COUNT + 1) - 0.5) * m.capW * STEM_TOP_W
    ctx.beginPath()
    ctx.moveTo(fx, m.rimY)
    ctx.lineTo(fx + m.bend / 2, m.groundY)
    ctx.stroke()
  }
  ctx.restore()
  traceStem(ctx, m)
  ctx.strokeStyle = css(CAVE_PAL.mushroomGill)
  ctx.lineWidth = BODY_CONTOUR_W
  ctx.stroke()
  traceSkirt(ctx, m)
  ctx.fillStyle = css(CAVE_PAL.mushroomStem)
  ctx.fill()
  ctx.stroke()
}
function paintUnderside(ctx, m) {
  traceUnderside(ctx, m)
  ctx.fillStyle = css(CAVE_PAL.glowBright)
  ctx.fill()
  ctx.save()
  ctx.clip()
  ctx.fillStyle = css(CAVE_PAL.glowCore, UNDER_CORE_ALPHA)
  ctx.beginPath()
  ctx.ellipse(m.x, m.rimY, m.capW * UNDER_CORE_W / 2, m.underRy * UNDER_CORE_W, 0, 0, FULL_TURN)
  ctx.fill()
  const rootY = m.rimY + m.underRy * GILL_ROOT_DEPTH
  ctx.strokeStyle = css(CAVE_PAL.mushroomGill, GILL_ALPHA)
  ctx.lineWidth = 1
  for (let i = 0; i <= GILL_COUNT; i++) {
    const a = Math.PI * i / GILL_COUNT
    ctx.beginPath()
    ctx.moveTo(m.x, rootY)
    ctx.lineTo(m.x + Math.cos(a) * m.capW / 2, m.rimY + Math.sin(a) * m.underRy)
    ctx.stroke()
  }
  ctx.restore()
  traceUnderside(ctx, m)
  ctx.strokeStyle = css(CAVE_PAL.mushroomGill)
  ctx.lineWidth = BODY_CONTOUR_W
  ctx.stroke()
}
function paintCap(ctx, m, rng) {
  traceCap(ctx, m)
  ctx.fillStyle = css(CAVE_PAL.glow)
  ctx.fill()
  ctx.save()
  ctx.clip()
  ctx.fillStyle = css(CAVE_PAL.mushroomCap)
  ctx.fillRect(m.x - m.capW / 2, m.rimY - m.capH * CAP_RIM_BAND, m.capW, m.capH)
  ctx.fillStyle = css(CAVE_PAL.glowBright)
  ctx.beginPath()
  ctx.ellipse(m.x - m.capW * CAP_LIGHT_SHIFT, m.capTop + m.capH * CAP_LIGHT_H / 2, m.capW * CAP_LIGHT_W / 2, m.capH * CAP_LIGHT_H / 2, 0, 0, FULL_TURN)
  ctx.fill()
  for (let i = 0; i < SPECK_COUNT; i++) {
    ctx.fillStyle = css(rng() < SPECK_BRIGHT_CHANCE ? CAVE_PAL.glowCore : CAVE_PAL.mushroomCap)
    ctx.beginPath()
    ctx.arc(
      m.x + (rng() - 0.5) * m.capW * SPECK_SPREAD_X,
      m.capTop + m.capH * (SPECK_TOP + rng() * SPECK_RANGE_Y),
      (SPECK_R_MIN + rng() * SPECK_R_RANGE) * m.capW / BASE_CAP_W,
      0,
      FULL_TURN
    )
    ctx.fill()
  }
  ctx.restore()
  traceCap(ctx, m)
  ctx.strokeStyle = css(CAVE_PAL.mushroomGill)
  ctx.lineWidth = BODY_CONTOUR_W
  ctx.stroke()
}
//
// Low moss tuft binding the cluster to the ground.
//
function paintMoss(ctx, rng, cx, groundY) {
  const [base, light] = CAVE_PAL.moss
  const half = BASE_CAP_W * MOSS_W / 2
  for (let x = cx - half; x <= cx + half; x += MOSS_STEP) {
    const edge = 1 - Math.abs(x - cx) / half
    const r = (MOSS_R_MIN + rng() * MOSS_R_RANGE) * edge
    ctx.fillStyle = css(rng() < MOSS_LIGHT_CHANCE ? light : base)
    ctx.beginPath()
    ctx.ellipse(x, groundY, r * MOSS_STRETCH, r, 0, Math.PI, FULL_TURN)
    ctx.fill()
  }
}
//
// Dormant look: only a soft glowing outline of caps, gill fans and stems.
//
function paintContour(ctx, shape) {
  ctx.strokeStyle = css(CAVE_PAL.glowHalo)
  ctx.lineWidth = CONTOUR_W
  ctx.lineJoin = 'round'
  shape.forEach(m => {
    traceUnderside(ctx, m)
    ctx.stroke()
    traceStem(ctx, m)
    strokeOverBehind(ctx)
    traceCap(ctx, m)
    strokeOverBehind(ctx)
  })
}
//
// Outline-only parts of the main mushroom, each in its own sprite so they
// squat together with the lit parts: the gill fan with the stem area
// cleared out of it (the stem stands in front), the stem, the cap.
//
function paintUnderContour(ctx, m) {
  strokePart(ctx, () => traceUnderside(ctx, m))
  traceStem(ctx, m)
  ctx.globalCompositeOperation = 'destination-out'
  ctx.fill()
  ctx.globalCompositeOperation = 'source-over'
}
function strokePart(ctx, trace) {
  ctx.strokeStyle = css(CAVE_PAL.glowHalo)
  ctx.lineWidth = CONTOUR_W
  trace()
  ctx.stroke()
}
//
// Erases whatever the current path covers (lines behind it), then strokes
// the path — keeps the stem in front of the gill fan and the cap in front
// of the stem in the outline-only look.
//
function strokeOverBehind(ctx) {
  ctx.globalCompositeOperation = 'destination-out'
  ctx.fill()
  ctx.globalCompositeOperation = 'source-over'
  ctx.stroke()
}
//
// Softens a baked canvas in place (one copy through a blur filter).
//
function blurCanvas(canvas, radius) {
  const copy = document.createElement('canvas')
  copy.width = canvas.width
  copy.height = canvas.height
  copy.getContext('2d').drawImage(canvas, 0, 0)
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.filter = `blur(${radius}px)`
  ctx.drawImage(copy, 0, 0)
  ctx.filter = 'none'
}
