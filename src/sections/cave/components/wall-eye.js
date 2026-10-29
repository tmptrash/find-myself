import { applyForestFilmGrainToCanvas } from '../../forest/utils/forest-parallax-grain.js'
import { forestEyeBerryColors, addLiddedEyeBerry, addTaperedPass } from '../../forest/utils/forest-eye-berry.js'
import { createSeededRandom } from '../../../utils/seeded-random.js'
import { getRGB } from '../../../utils/helper.js'
import * as PolyBatch from '../../../utils/poly-batch.js'
import * as Layout from '../utils/cave-layout.js'
import * as Parallax from '../utils/cave-parallax.js'
import { plantShape } from '../utils/cave-plant-shape.js'
import { CAVE_PAL, css, caveShadeColor } from '../utils/cave-paint.js'
//
// Stalk eyes in the forest look, grown out of the cave: a knot with thin
// vein-roots in the rock, a contoured stalk bending up and swaying, and at
// its tip the forest eye-berry (white ball, shaded underside, dark pupil,
// blinking lid) — only bigger. Pupils follow the hero. Wall eyes grow from
// both side walls; smaller, darker ones ride the mid parallax row.
//
const SPRITE_PREFIX = 'cave0-eye-knot-v3'
const GRAIN_SEED_BASE = 9600
const BAKE_PAD = 4
const FULL_TURN = Math.PI * 2
//
// Knot at the stalk root: vein-roots crawling into the rock.
//
const ROOT_REACH = 2.2
const ROOT_COUNT = 8
const ROOT_FROM = 0.4
const ROOT_W_BASE = 2.2
const ROOT_W_TIP = 0.6
const ROOT_SEGS = 6
const ROOT_WANDER = 0.35
const ROOT_JITTER = 0.5
const KNOT_R = 0.45
const KNOT_CONTOUR_W = 1
//
// Eyes grown into the plant sit in a dark socket inside a leaf rosette.
//
const SOCKET_R = 1.2
//
// Eye-berry: pupil size and reach, contour, look easing, blink clock.
//
const PUPIL_R = 0.42
const LOOK_REACH = 0.42
const LOOK_EASE = 6
const EYE_CONTOUR_W = 1.6
const BLINK_WAIT_MIN = 2
const BLINK_WAIT_RANGE = 6
const BLINK_TIME = 0.24
//
// White glint on the pupil, upper right (as on the HUD eye): offset and
// radius as shares of the pupil radius; hidden while the eye blinks.
//
const GLINT_X = 0.27
const GLINT_Y = -0.35
const GLINT_R = 0.21
//
// Stalks: length (eye radii), segments, base / tip width, upward bend, sway.
//
const STALK_LEN_WALL = 3
const STALK_LEN_BACK = 3.4
const STALK_SEGS = 7
const STALK_W_BASE = 0.42
const STALK_W_TIP = 0.24
const STALK_CONTOUR_EXTRA = 2.4
const STALK_LIGHT_W = 0.3
const STALK_LIGHT_SHIFT = 0.1
const STALK_TILT = 0.45
const STALK_CURVE = 0.07
const STALK_SWAY_AMP = 0.16
const STALK_SWAY_SPEED_MIN = 0.7
const STALK_SWAY_SPEED_RANGE = 0.6
const STALK_SWAY_LAG = 0.5
//
// Wall eyes sit their root this deep in the rock; back eyes are smaller
// and darkened like their row.
//
const WALL_INSET = 6
const WALL_R_SCALE = 1.35
const BACK_R_MIN = 12
const BACK_R_RANGE = 4
const BACK_SHADE = 0.55
const BACK_ROW = 'mid'
const CULL_PAD = 90
//
// Stalk eyes (on the walls and the back row) are switched off for now;
// only the eyes grown into the plant stay.
//
const STALK_EYES = false
const BYTE = 255
const COLOR_KEYS = ['contour', 'berry', 'berryShade', 'pupil', 'stem', 'stemLight', 'glint']
const knotsByK = new WeakMap()

/**
 * Creates the wall eyes and the back-wall eyes.
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay instance
 * @param {Object} cfg.parallax - Parallax instance (back-wall eye anchors)
 * @returns {Object} Eyes instance
 */
export function create(cfg) {
  const { k, parallax } = cfg
  const wall = (STALK_EYES ? Layout.WALL_EYES : []).map(spot => {
    const side = spot.side === 'left' ? -1 : 1
    const edgeX = spot.side === 'left' ? Layout.leftWallX(spot.y) : Layout.rightWallX(spot.y)
    const angle = spot.side === 'left' ? -STALK_TILT : Math.PI + STALK_TILT
    return newEye(k, edgeX - side * WALL_INSET, spot.y, Math.round(spot.r * WALL_R_SCALE), angle, -side * STALK_CURVE, STALK_LEN_WALL)
  })
  plantShape().eyes.forEach(spot => wall.push({ ...newEye(k, spot.x, spot.y, spot.r, 0, 0, 0), embedded: true }))
  const rng = createSeededRandom(GRAIN_SEED_BASE)
  const back = (STALK_EYES ? Parallax.backEyeAnchors(parallax) : []).map(a => {
    const r = BACK_R_MIN + Math.round(rng() * BACK_R_RANGE)
    return newEye(k, a.x, a.y, r, -Math.PI / 2, 0, STALK_LEN_BACK)
  })
  const backTint = caveShadeColor(k, BACK_SHADE)
  const colors = { ...forestEyeBerryColors(k), glint: getRGB(k, CAVE_PAL.eyeGlint) }
  return {
    k,
    parallax,
    wall,
    back,
    backTint,
    batch: PolyBatch.create(),
    socketRgb: getRGB(k, CAVE_PAL.plantRosette[2]),
    colors,
    backColors: Object.fromEntries(COLOR_KEYS.map(key => [key, shade(k, colors[key], backTint)]))
  }
}

/**
 * Sways the stalks, turns every pupil toward a world point and runs the
 * blink clocks.
 * @param {Object} inst - Eyes instance
 * @param {{x: number, y: number}} target - World point to look at
 * @param {{left: number, top: number}} view - Visible world rect (back eyes ride the parallax)
 */
export function onUpdate(inst, target, view) {
  const dt = inst.k.dt()
  const t = inst.k.time()
  inst.wall.forEach(eye => {
    buildStalk(eye, eye.x, eye.y, t)
    tickEye(eye, target, dt)
  })
  inst.back.forEach(eye => {
    const p = Parallax.toWorld(inst.parallax, BACK_ROW, eye.x, eye.y, view.left, view.top)
    buildStalk(eye, p.x, p.y, t)
    tickEye(eye, target, dt)
  })
}

/**
 * Back-wall eyes, darkened like their row (between the mid and near rows).
 * @param {Object} inst - Eyes instance
 * @param {{top: number, bottom: number}} view - Visible world rect
 */
export function onDrawBack(inst, view) {
  drawEyes(inst, inst.back.filter(eye => inView(eye, view)), inst.backColors, inst.backTint)
}

/**
 * Wall eyes (front world pass).
 * @param {Object} inst - Eyes instance
 * @param {{top: number, bottom: number}} view - Visible world rect
 */
export function onDrawWall(inst, view) {
  drawEyes(inst, inst.wall.filter(eye => inView(eye, view)), inst.colors, null)
}
function inView(eye, view) {
  return eye.tipY > view.top - CULL_PAD && eye.tipY < view.bottom + CULL_PAD
}
function newEye(k, x, y, r, angle, curve, lenRadii) {
  return {
    x,
    y,
    r,
    angle,
    curve,
    segLen: r * lenRadii / STALK_SEGS,
    swaySpeed: STALK_SWAY_SPEED_MIN + Math.random() * STALK_SWAY_SPEED_RANGE,
    phase: Math.random() * FULL_TURN,
    pts: [],
    tipX: x,
    tipY: y,
    knot: bakeKnot(k, r),
    lookX: 0,
    lookY: 0,
    blinkWait: BLINK_WAIT_MIN + Math.random() * BLINK_WAIT_RANGE,
    blinkT: -1
  }
}
//
// Pupil eases toward the target; the lid closes and reopens on a random clock.
//
function tickEye(eye, target, dt) {
  const dx = target.x - eye.tipX
  const dy = target.y - eye.tipY
  const d = Math.hypot(dx, dy) || 1
  const reach = eye.r * LOOK_REACH
  const ease = Math.min(1, dt * LOOK_EASE)
  eye.lookX += (dx / d * reach - eye.lookX) * ease
  eye.lookY += (dy / d * reach - eye.lookY) * ease
  if (eye.blinkT >= 0) {
    eye.blinkT += dt / BLINK_TIME
    eye.blinkT >= 1 && (eye.blinkT = -1, eye.blinkWait = BLINK_WAIT_MIN + Math.random() * BLINK_WAIT_RANGE)
    return
  }
  eye.blinkWait -= dt
  eye.blinkWait <= 0 && (eye.blinkT = 0)
}
//
// Stalk points from the root: each segment bends a little further and
// sways with a lag along the stalk, more toward the tip.
//
function buildStalk(eye, x, y, t) {
  eye.pts.length = 0
  eye.pts.push({ x, y })
  let px = x
  let py = y
  for (let i = 0; i < STALK_SEGS; i++) {
    const sway = Math.sin(t * eye.swaySpeed + eye.phase - i * STALK_SWAY_LAG) * STALK_SWAY_AMP * (i + 1) / STALK_SEGS
    const a = eye.angle + eye.curve * i + sway
    px += Math.cos(a) * eye.segLen
    py += Math.sin(a) * eye.segLen
    eye.pts.push({ x: px, y: py })
  }
  eye.tipX = px
  eye.tipY = py
}
//
// Root knots (sprites), then every stalk and eye-berry in one polygon batch.
//
function drawEyes(inst, eyes, colors, tint) {
  const { k, batch } = inst
  eyes.filter(eye => !eye.embedded).forEach(eye => k.drawSprite({
    sprite: eye.knot,
    pos: k.vec2(Math.round(eye.pts[0].x), Math.round(eye.pts[0].y)),
    anchor: 'center',
    ...(tint ? { color: tint } : {})
  }))
  eyes.forEach(eye => {
    const close = eye.blinkT >= 0 ? Math.sin(Math.PI * eye.blinkT) : 0
    const pupil = [eye.tipX + eye.lookX, eye.tipY + eye.lookY]
    if (eye.embedded) {
      PolyBatch.addDisc(batch, eye.tipX, eye.tipY, eye.r * SOCKET_R + EYE_CONTOUR_W, colors.contour)
      PolyBatch.addDisc(batch, eye.tipX, eye.tipY, eye.r * SOCKET_R, inst.socketRgb)
      addLiddedEyeBerry(batch, eye.tipX, eye.tipY, eye.r, pupil[0], pupil[1], eye.r * PUPIL_R, colors, EYE_CONTOUR_W, close)
      close === 0 && addGlint(batch, pupil, eye.r * PUPIL_R, colors.glint)
      return
    }
    const wBase = eye.r * STALK_W_BASE * 2
    const wTip = eye.r * STALK_W_TIP * 2
    const shift = eye.r * STALK_LIGHT_SHIFT
    addTaperedPass(batch, eye.pts, wBase + STALK_CONTOUR_EXTRA, wTip + STALK_CONTOUR_EXTRA, colors.contour)
    addTaperedPass(batch, eye.pts, wBase, wTip, colors.stem)
    addTaperedPass(batch, eye.pts.map(p => ({ x: p.x - shift, y: p.y - shift })), wBase * STALK_LIGHT_W, wTip * STALK_LIGHT_W, colors.stemLight)
    addLiddedEyeBerry(batch, eye.tipX, eye.tipY, eye.r, pupil[0], pupil[1], eye.r * PUPIL_R, colors, EYE_CONTOUR_W, close)
    close === 0 && addGlint(batch, pupil, eye.r * PUPIL_R, colors.glint)
  })
  PolyBatch.flush(batch, k)
}
//
// Small light glint on the upper right of a pupil.
//
function addGlint(batch, pupil, pupilR, color) {
  PolyBatch.addDisc(batch, pupil[0] + pupilR * GLINT_X, pupil[1] + pupilR * GLINT_Y, pupilR * GLINT_R, color)
}
function shade(k, c, tint) {
  return k.rgb(Math.round(c.r * tint.r / BYTE), Math.round(c.g * tint.g / BYTE), Math.round(c.b * tint.b / BYTE))
}
//
// Knot sprite for one radius, once per live k: thin vein-roots crawling
// into the rock around a small dark knot.
//
function bakeKnot(k, r) {
  let perK = knotsByK.get(k)
  !perK && (perK = new Map(), knotsByK.set(k, perK))
  const cached = perK.get(r)
  if (cached) return cached
  const rng = createSeededRandom(GRAIN_SEED_BASE + r)
  const pal = CAVE_PAL.wallEye
  const size = Math.ceil(r * ROOT_REACH * 2 + BAKE_PAD * 2)
  const c = size / 2
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  ctx.lineCap = 'round'
  ctx.strokeStyle = css(pal.vein)
  for (let i = 0; i < ROOT_COUNT; i++) {
    let a = (i + rng() * ROOT_JITTER) / ROOT_COUNT * FULL_TURN
    let x = c + Math.cos(a) * r * ROOT_FROM
    let y = c + Math.sin(a) * r * ROOT_FROM
    const step = r * (ROOT_REACH - ROOT_FROM) / ROOT_SEGS
    for (let s = 0; s < ROOT_SEGS; s++) {
      a += (rng() - 0.5) * ROOT_WANDER * 2
      const nx = x + Math.cos(a) * step
      const ny = y + Math.sin(a) * step
      ctx.lineWidth = ROOT_W_BASE + (ROOT_W_TIP - ROOT_W_BASE) * s / ROOT_SEGS
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(nx, ny)
      ctx.stroke()
      x = nx
      y = ny
    }
  }
  ctx.fillStyle = css(pal.knot)
  ctx.beginPath()
  ctx.arc(c, c, r * KNOT_R, 0, FULL_TURN)
  ctx.fill()
  ctx.strokeStyle = css(pal.contour)
  ctx.lineWidth = KNOT_CONTOUR_W
  ctx.stroke()
  applyForestFilmGrainToCanvas(canvas, GRAIN_SEED_BASE + r)
  const name = `${SPRITE_PREFIX}-${r}`
  k.loadSprite(name, canvas)
  perK.set(r, name)
  return name
}
