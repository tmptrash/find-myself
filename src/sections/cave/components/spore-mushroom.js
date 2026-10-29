import { CFG } from '../../../cfg.js'
import { applyForestFilmGrainToCanvas } from '../../forest/utils/forest-parallax-grain.js'
import { createSeededRandom } from '../../../utils/seeded-random.js'
import { getRGB } from '../../../utils/helper.js'
import * as Glow from '../utils/cave-glow.js'
import { CAVE_PAL, css } from '../utils/cave-paint.js'
//
// Spore mushroom: a tall dome cap pierced with glowing holes of different
// sizes, a lit underside with golden gills and a slim stem rising into its
// centre. Landing on its cap lets a swarm
// of spores out to hover above it. Jumping into the swarm moves it:
//   - straight up from below: it scatters up, then flies home;
//   - from its right, moving left: it drifts up-left, then flies home;
//   - from its left, moving right: it steps one station to the right; at the
//     last station it flies into the trap leaf there (the level snaps it).
// A hovering swarm left alone flies home after a while.
//
const SPRITE = 'cave0-spore-mushroom-v3'
const GRAIN_SEED = 9950
const BAKE_PAD = 8
//
// Shape: cap size (a rounded dome: control shares for its sides), the
// underside seen from below (an ellipse with gills from the stem), the stem.
//
const SIZE = 0.82
const CAP_W = Math.round(168 * SIZE)
const CAP_H = Math.round(78 * SIZE)
const DOME_SIDE_X = 0.52
const DOME_SIDE_Y = 0.75
const DOME_TOP_X = 0.3
const UNDER_RY = Math.round(13 * SIZE)
const UNDER_INSET = 4
const GILL_COUNT = 22
const GILL_ALPHA = 0.55
const STEM_H = Math.round(44 * SIZE)
const STEM_W = Math.round(16 * SIZE)
const STEM_FOOT_W = Math.round(32 * SIZE)
const STEM_TOP_W = Math.round(20 * SIZE)
//
// Stem detail: fibres wandering up it (midpoint displacement, forking once),
// each a dark groove with a lit lip, plus a few pale specks.
//
const STEM_FIBRES = 6
const STEM_FIBRE_LEVELS = 3
const STEM_FIBRE_WANDER = 0.35
const STEM_FIBRE_FORK_FROM = 0.3
const STEM_FIBRE_FORK_SPAN = 0.4
const STEM_FIBRE_FORK_LEN = 0.45
const STEM_FIBRE_FORK_LEAN = 4
const STEM_FIBRE_ALPHA = 0.6
const STEM_LIP_ALPHA = 0.45
const STEM_SPECKS = 14
const STEM_SPECK_ALPHA = 0.5
const STEM_LIT_X = 0.25
const STEM_LIT_W = 3
const STEM_COLLAR = 3
const CONTOUR_W = 1.8
//
// Cap shading: shade on the lower right, light on the upper left.
//
const CAP_SHADE_SHIFT = 0.22
const CAP_SHADE_W = 0.5
const CAP_SHADE_H = 0.55
const CAP_LIGHT_SHIFT = 0.2
const CAP_LIGHT_Y = 0.32
const CAP_LIGHT_W = 0.28
const CAP_LIGHT_H = 0.3
//
// Holes in the cap (u: share of the cap width from its centre, v: share of
// its height from the top, r: radius). Toward the dome's sides they are
// foreshortened (narrower); each has a dark rim, a glowing inside and a
// bright crescent at its lower edge.
//
const HOLES = [
  { u: -0.08, v: 0.2, r: 12 }, { u: 0.17, v: 0.24, r: 9 }, { u: -0.29, v: 0.4, r: 11 },
  { u: 0.03, v: 0.48, r: 14 }, { u: 0.3, v: 0.45, r: 12 }, { u: -0.12, v: 0.7, r: 8 },
  { u: 0.17, v: 0.72, r: 10 }, { u: -0.38, v: 0.68, r: 7 }, { u: 0.4, v: 0.72, r: 7 },
  { u: -0.22, v: 0.08, r: 5 }, { u: 0.08, v: 0.06, r: 5 }, { u: -0.43, v: 0.88, r: 4 },
  { u: 0.03, v: 0.86, r: 5 }, { u: 0.29, v: 0.9, r: 4 }, { u: -0.3, v: 0.88, r: 5 }
]
const HOLE_SQUASH = 0.8
const HOLE_SIZE = SIZE
const HOLE_EDGE_SQUEEZE = 0.9
const HOLE_RIM = 2
const HOLE_INNER = 0.68
const HOLE_CRESCENT = 0.4
const SPORE_HALO_SHARE = 0.6
const HOLE_GLOW_R = 1.3
const HOLE_GLOW_OPACITY = 0.35
const HALF = 0.5
//
// Collider across the cap top.
//
const CAP_COLLIDE_W = 0.42
const CAP_COLLIDE_H = 12
const CAP_COLLIDE_SINK = 6
//
// Swarm: spore count, speeds, hit radius, moves, hover timeout.
//
const SPORES = 16
//
// Each spore wanders on its own around the swarm centre: a random push
// every frame, a pull back toward the centre (stronger past its range),
// damping; the range is flatter than tall.
//
const WANDER_PUSH = 900
const WANDER_PULL = 3
const WANDER_DAMP = 2.2
const WANDER_R_MIN = 18
const WANDER_R_RANGE = 34
const WANDER_FLATTEN = 0.65
const SPORE_FOLLOW = 7
const MAX_DT = 0.05
const CENTER_SPEED = 260
const HOME_SPEED = 220
const ARRIVE_DIST = 6
const HIT_R = 62
const HIT_COOLDOWN = 0.8
const STILL_VX = 70
const SCATTER_UP = 120
const DRIFT_X = 150
const DRIFT_UP = 70
const WANDER_TIME = 1.6
const HOVER_TIME = 9
const SPORE_GLOW_R = 10
const SPORE_CORE_R = 2.2
const SPORE_OPACITY = 0.9
const TRAPPED_OPACITY = 0.45
const TRAPPED_ORBIT = 0.35
//
// Breathing now and then: the mushroom swells a little (wider, a touch
// taller, feet on the ground) for a breath, then rests a random while.
//
const BREATH_REST_MIN = 3
const BREATH_REST_RANGE = 5
const BREATH_TIME = 1.6
const BREATH_W = 0.05
const BREATH_H = 0.035
const FULL_TURN = Math.PI * 2
const SWARM_STATE = {
  INSIDE: 'inside',
  FLYING: 'flying',
  HOVER: 'hover',
  WANDER: 'wander',
  HOME: 'home',
  TRAPPED: 'trapped'
}
const W = SWARM_STATE
const bakedFor = new WeakSet()

/**
 * Creates the spore mushroom and its swarm.
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay instance
 * @param {number} cfg.x - Stem base X
 * @param {number} cfg.y - Ground Y
 * @param {Array<{x: number, y: number}>} cfg.stations - Hover points (last one sits over the trap leaf)
 * @returns {Object} Spore mushroom instance
 */
export function create(cfg) {
  const { k, x, y, stations } = cfg
  !bakedFor.has(k) && (bake(k), bakedFor.add(k))
  Glow.create(k)
  const capTopY = y - STEM_H - CAP_H
  const home = { x, y: capTopY + CAP_H * HALF }
  const rng = createSeededRandom(GRAIN_SEED)
  return {
    k,
    x,
    y,
    capTopY,
    stations,
    home,
    body: k.add([
      k.rect(CAP_W * CAP_COLLIDE_W, CAP_COLLIDE_H),
      k.pos(x - CAP_W * CAP_COLLIDE_W / 2, capTopY + CAP_COLLIDE_SINK),
      k.area(),
      k.body({ isStatic: true }),
      k.opacity(0),
      CFG.game.platformName
    ]),
    spores: Array.from({ length: SPORES }, (_, i) => {
      const hole = HOLES[i % HOLES.length]
      const at = { x: x + hole.u * CAP_W, y: capTopY + hole.v * CAP_H }
      return { ...at, hole, ox: 0, oy: 0, vx: 0, vy: 0, range: WANDER_R_MIN + rng() * WANDER_R_RANGE }
    }),
    breath: 0,
    breathT: -1,
    breathRest: BREATH_REST_MIN + rng() * BREATH_REST_RANGE,
    state: W.INSIDE,
    center: { ...home },
    target: { ...home },
    station: 0,
    timer: 0,
    cooldown: 0,
    prevHeroX: null,
    sparkRgb: getRGB(k, CAVE_PAL.spore.spark),
    glowRgb: getRGB(k, CAVE_PAL.spore.holeGlow)
  }
}

/**
 * Lets the swarm out after a landing, moves it, and reacts to the hero.
 * Returns 'released' on the frame spores come out and 'trap' when the
 * swarm reaches the last station.
 * @param {Object} inst - Spore mushroom instance
 * @param {Object|null} heroInst - Hero instance
 * @returns {string|null}
 */
export function onUpdate(inst, heroInst) {
  const dt = inst.k.dt()
  inst.cooldown = Math.max(0, inst.cooldown - dt)
  inst.timer += dt
  const char = heroInst?.character
  let event = null
  if (char?.exists?.()) {
    const vx = inst.prevHeroX === null ? 0 : (char.pos.x - inst.prevHeroX) / Math.max(dt, 1e-3)
    inst.prevHeroX = char.pos.x
    const onCap = char.isGrounded?.() && char.curPlatform?.() === inst.body
    if (onCap && inst.state === W.INSIDE) {
      flyTo(inst, inst.stations[0], W.HOVER, 0)
      event = 'released'
    }
    !char.isGrounded?.() && tryHit(inst, char, vx)
  } else {
    inst.prevHeroX = null
  }
  moveCenter(inst, dt) && (event = arrive(inst) ?? event)
  inst.state === W.HOVER && inst.timer > HOVER_TIME && goHome(inst)
  inst.state === W.WANDER && inst.timer > WANDER_TIME && goHome(inst)
  moveSpores(inst, dt)
  breathe(inst, dt)
  return event
}

/**
 * Holds the swarm inside a closed trap leaf at a point.
 * @param {Object} inst - Spore mushroom instance
 * @param {{x: number, y: number}} at - Inside the closed leaf
 */
export function trap(inst, at) {
  inst.state = W.TRAPPED
  inst.center = { ...at }
  inst.target = { ...at }
}

/**
 * Lets a trapped swarm fly home into the mushroom.
 * @param {Object} inst - Spore mushroom instance
 */
export function release(inst) {
  inst.state === W.TRAPPED && goHome(inst)
}

/**
 * Draws the mushroom with its stem foot on the ground (the bake has a pad
 * under the foot) — world pass.
 * @param {Object} inst - Spore mushroom instance
 */
export function onDraw(inst) {
  const b = inst.breath
  inst.k.drawSprite({ sprite: SPRITE, pos: inst.k.vec2(inst.x, inst.y + BAKE_PAD), anchor: 'bot', scale: inst.k.vec2(1 + BREATH_W * b, 1 + BREATH_H * b) })
}

/**
 * Additive glows: holes and the spores — light pass.
 * @param {Object} inst - Spore mushroom instance
 */
export function onDrawGlow(inst) {
  const k = inst.k
  HOLES.forEach(h => {
    const at = holeAt(inst, h)
    Glow.drawGlow(k, at.x, at.y, h.r * HOLE_SIZE * HOLE_GLOW_R, inst.glowRgb, HOLE_GLOW_OPACITY)
  })
  if (inst.state === W.INSIDE) return
  const opacity = inst.state === W.TRAPPED ? TRAPPED_OPACITY : SPORE_OPACITY
  inst.spores.forEach(sp => {
    Glow.drawGlow(k, sp.x, sp.y, SPORE_GLOW_R, inst.glowRgb, opacity * SPORE_HALO_SHARE)
    Glow.drawGlow(k, sp.x, sp.y, SPORE_CORE_R, inst.sparkRgb, opacity)
  })
}
//
// A hero jumping into the hovering swarm pushes it, by his direction.
//
function tryHit(inst, char, vx) {
  if (inst.state !== W.HOVER || inst.cooldown > 0) return
  if (Math.hypot(char.pos.x - inst.center.x, char.pos.y - inst.center.y) > HIT_R) return
  inst.cooldown = HIT_COOLDOWN
  if (vx > STILL_VX && char.pos.x < inst.center.x) {
    const next = inst.station + 1
    flyTo(inst, inst.stations[next], W.HOVER, next)
    return
  }
  if (vx < -STILL_VX) {
    flyTo(inst, { x: inst.center.x - DRIFT_X, y: inst.center.y - DRIFT_UP }, W.WANDER, inst.station)
    return
  }
  flyTo(inst, { x: inst.center.x, y: inst.center.y - SCATTER_UP }, W.WANDER, inst.station)
}
function flyTo(inst, point, then, station) {
  inst.state = W.FLYING
  inst.target = { ...point }
  inst.then = then
  inst.station = station
}
function goHome(inst) {
  inst.state = W.HOME
  inst.target = { ...inst.home }
}
//
// Centre glides to its target; true when it has arrived this frame.
//
function moveCenter(inst, dt) {
  if (inst.state !== W.FLYING && inst.state !== W.HOME) return false
  const dx = inst.target.x - inst.center.x
  const dy = inst.target.y - inst.center.y
  const d = Math.hypot(dx, dy)
  const step = (inst.state === W.HOME ? HOME_SPEED : CENTER_SPEED) * dt
  if (d <= Math.max(step, ARRIVE_DIST)) {
    inst.center = { ...inst.target }
    return true
  }
  inst.center.x += dx / d * step
  inst.center.y += dy / d * step
  return false
}
function arrive(inst) {
  inst.timer = 0
  if (inst.state === W.HOME) {
    inst.state = W.INSIDE
    inst.station = 0
    return null
  }
  inst.state = inst.then
  return inst.state === W.HOVER && inst.station === inst.stations.length - 1 ? 'trap' : null
}
//
// Spores inside sit in their holes; out, each wanders randomly around the
// swarm centre (random pushes, a pull back, damping), its range shrunk
// when trapped. Positions ease after the target, so they stream out of the
// holes and back in.
//
function moveSpores(inst, dt) {
  const step = Math.min(dt, MAX_DT)
  const ease = Math.min(1, step * SPORE_FOLLOW)
  const scale = inst.state === W.TRAPPED ? TRAPPED_ORBIT : 1
  inst.spores.forEach(sp => {
    if (inst.state === W.INSIDE) {
      const at = holeAt(inst, sp.hole)
      sp.x += (at.x - sp.x) * ease
      sp.y += (at.y - sp.y) * ease
      sp.ox = sp.x - inst.center.x
      sp.oy = sp.y - inst.center.y
      sp.vx = 0
      sp.vy = 0
      return
    }
    const range = sp.range * scale
    const far = Math.max(1, Math.hypot(sp.ox, sp.oy / WANDER_FLATTEN) / range)
    sp.vx += ((Math.random() - HALF) * WANDER_PUSH - sp.ox * WANDER_PULL * far - sp.vx * WANDER_DAMP) * step
    sp.vy += ((Math.random() - HALF) * WANDER_PUSH * WANDER_FLATTEN - sp.oy * WANDER_PULL * far - sp.vy * WANDER_DAMP) * step
    sp.ox += sp.vx * step
    sp.oy += sp.vy * step
    sp.x += (inst.center.x + sp.ox - sp.x) * ease
    sp.y += (inst.center.y + sp.oy - sp.y) * ease
  })
}
//
// World position of a hole on the cap, swelling with the breath.
//
function holeAt(inst, h) {
  const b = inst.breath
  return { x: inst.x + h.u * CAP_W * (1 + BREATH_W * b), y: inst.y - (inst.y - inst.capTopY - h.v * CAP_H) * (1 + BREATH_H * b) }
}
//
// Rests a random while, then takes one slow breath (swell and back).
//
function breathe(inst, dt) {
  if (inst.breathT < 0) {
    inst.breathRest -= dt
    if (inst.breathRest > 0) return
    inst.breathT = 0
  }
  inst.breathT += dt
  const u = inst.breathT / BREATH_TIME
  inst.breath = u < 1 ? Math.sin(Math.PI * u) : 0
  if (u < 1) return
  inst.breathT = -1
  inst.breathRest = BREATH_REST_MIN + Math.random() * BREATH_REST_RANGE
}
//
// Underside (lit, gills from the centre), the stem rising into its centre,
// then the dome over them with its glowing holes.
//
function bake(k) {
  const w = CAP_W + BAKE_PAD * 2
  const h = CAP_H + STEM_H + BAKE_PAD * 2
  const cx = w / 2
  const groundY = h - BAKE_PAD
  const rimY = BAKE_PAD + CAP_H
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.lineJoin = 'round'
  paintUnderside(ctx, cx, rimY)
  paintStem(ctx, cx, rimY, groundY)
  paintCap(ctx, cx, BAKE_PAD, rimY)
  applyForestFilmGrainToCanvas(canvas, GRAIN_SEED)
  k.loadSprite(SPRITE, canvas)
}
//
// The cap's underside seen from below: a lit ellipse with gills fanning
// from its centre.
//
function paintUnderside(ctx, cx, rimY) {
  const pal = CAVE_PAL.spore
  const rx = CAP_W / 2 - UNDER_INSET
  ctx.beginPath()
  ctx.ellipse(cx, rimY, rx, UNDER_RY, 0, 0, FULL_TURN)
  ctx.fillStyle = css(pal.gill)
  ctx.fill()
  ctx.strokeStyle = css(pal.hole, GILL_ALPHA)
  ctx.lineWidth = 1
  for (let i = 1; i < GILL_COUNT; i++) {
    const a = Math.PI * i / GILL_COUNT
    ctx.beginPath()
    ctx.moveTo(cx, rimY)
    ctx.lineTo(cx + Math.cos(a) * rx, rimY + Math.sin(a) * UNDER_RY)
    ctx.stroke()
  }
  ctx.strokeStyle = css(pal.stem[0])
  ctx.lineWidth = CONTOUR_W
  ctx.beginPath()
  ctx.ellipse(cx, rimY, rx, UNDER_RY, 0, 0, Math.PI)
  ctx.stroke()
}
//
// Slim stem from a wider foot up into the underside's centre, with a dark
// collar where it meets the gills, a lit streak on its left and fibres.
//
function paintStem(ctx, cx, rimY, groundY) {
  const [dark, mid, light] = CAVE_PAL.spore.stem
  ctx.beginPath()
  ctx.moveTo(cx - STEM_TOP_W / 2, rimY)
  ctx.quadraticCurveTo(cx - STEM_W / 2, (rimY + groundY) / 2, cx - STEM_FOOT_W / 2, groundY)
  ctx.lineTo(cx + STEM_FOOT_W / 2, groundY)
  ctx.quadraticCurveTo(cx + STEM_W / 2, (rimY + groundY) / 2, cx + STEM_TOP_W / 2, rimY)
  ctx.closePath()
  ctx.fillStyle = css(mid)
  ctx.fill()
  ctx.strokeStyle = css(dark)
  ctx.lineWidth = CONTOUR_W
  ctx.stroke()
  ctx.fillStyle = css(light)
  ctx.fillRect(cx - STEM_W * STEM_LIT_X - STEM_LIT_W / 2, rimY + STEM_COLLAR, STEM_LIT_W, groundY - rimY - STEM_COLLAR * 3)
  ctx.save()
  ctx.clip()
  paintStemFibres(ctx, cx, rimY, groundY, createSeededRandom(GRAIN_SEED + 1))
  ctx.restore()
  ctx.fillStyle = css(dark)
  ctx.beginPath()
  ctx.ellipse(cx, rimY, STEM_TOP_W / 2, STEM_COLLAR, 0, 0, FULL_TURN)
  ctx.fill()
}
//
// Fibres running up the stem, wandering and forking, with lit lips, and a
// few pale specks.
//
function paintStemFibres(ctx, cx, rimY, groundY, rng) {
  const [dark, , light] = CAVE_PAL.spore.stem
  for (let i = 0; i < STEM_FIBRES; i++) {
    const x = cx + ((i + HALF) / STEM_FIBRES - HALF) * STEM_FOOT_W
    const pts = wander({ x, y: groundY }, { x: cx + (x - cx) * STEM_TOP_W / STEM_FOOT_W, y: rimY }, rng)
    fibre(ctx, pts, dark, light)
    const from = pts[Math.floor(pts.length * (STEM_FIBRE_FORK_FROM + rng() * STEM_FIBRE_FORK_SPAN))]
    const len = (groundY - rimY) * STEM_FIBRE_FORK_LEN
    fibre(ctx, wander(from, { x: from.x + (rng() - HALF) * STEM_FIBRE_FORK_LEAN * 2, y: from.y - len }, rng), dark, light)
  }
  ctx.fillStyle = css(light, STEM_SPECK_ALPHA)
  for (let i = 0; i < STEM_SPECKS; i++) {
    ctx.fillRect(Math.round(cx + (rng() - HALF) * STEM_W), Math.round(rimY + rng() * (groundY - rimY)), 1, 1)
  }
}
//
// One fibre: dark groove with a lit lip on its left.
//
function fibre(ctx, pts, dark, light) {
  ctx.lineWidth = 1
  ;[[light, STEM_LIP_ALPHA, -1], [dark, STEM_FIBRE_ALPHA, 0]].forEach(([tone, alpha, dx]) => {
    ctx.strokeStyle = css(tone, alpha)
    ctx.beginPath()
    pts.forEach((p, i) => (i ? ctx.lineTo(p.x + dx, p.y) : ctx.moveTo(p.x + dx, p.y)))
    ctx.stroke()
  })
}
//
// A line from a to b bent sideways by midpoint displacement.
//
function wander(a, b, rng) {
  let pts = [a, b]
  let amp = Math.abs(b.y - a.y) * STEM_FIBRE_WANDER * HALF
  for (let l = 0; l < STEM_FIBRE_LEVELS; l++) {
    const next = [pts[0]]
    for (let i = 1; i < pts.length; i++) {
      next.push({ x: (pts[i - 1].x + pts[i].x) / 2 + (rng() - HALF) * amp, y: (pts[i - 1].y + pts[i].y) / 2 }, pts[i])
    }
    pts = next
    amp *= HALF
  }
  return pts
}
//
// The dome: rounded sides up to a soft top, shade lower right, light upper
// left, and the glowing holes.
//
function paintCap(ctx, cx, capTop, rimY) {
  const [cDark, cMid, cLight] = CAVE_PAL.spore.cap
  const half = CAP_W / 2
  const dome = new Path2D()
  dome.moveTo(cx - half, rimY)
  dome.bezierCurveTo(cx - half * DOME_SIDE_X * 2, rimY - CAP_H * DOME_SIDE_Y, cx - half * DOME_TOP_X, capTop, cx, capTop)
  dome.bezierCurveTo(cx + half * DOME_TOP_X, capTop, cx + half * DOME_SIDE_X * 2, rimY - CAP_H * DOME_SIDE_Y, cx + half, rimY)
  dome.closePath()
  ctx.save()
  ctx.fillStyle = css(cMid)
  ctx.fill(dome)
  ctx.clip(dome)
  ctx.fillStyle = css(cDark)
  ctx.beginPath()
  ctx.ellipse(cx + CAP_W * CAP_SHADE_SHIFT, rimY, CAP_W * CAP_SHADE_W, CAP_H * CAP_SHADE_H, 0, 0, FULL_TURN)
  ctx.fill()
  ctx.fillStyle = css(cLight)
  ctx.beginPath()
  ctx.ellipse(cx - CAP_W * CAP_LIGHT_SHIFT, capTop + CAP_H * CAP_LIGHT_Y, CAP_W * CAP_LIGHT_W, CAP_H * CAP_LIGHT_H, 0, 0, FULL_TURN)
  ctx.fill()
  HOLES.forEach(hl => paintHole(ctx, cx + hl.u * CAP_W, capTop + hl.v * CAP_H, hl))
  ctx.restore()
  ctx.strokeStyle = css(cDark)
  ctx.lineWidth = CONTOUR_W
  ctx.stroke(dome)
}
//
// One hole: dark rim, glowing inside, a bright crescent at its lower edge
// (the light inside the cap); narrower toward the dome's sides.
//
function paintHole(ctx, x, y, hl) {
  const pal = CAVE_PAL.spore
  const r = hl.r * HOLE_SIZE
  const rx = r * (1 - Math.abs(hl.u) * 2 * HOLE_EDGE_SQUEEZE * HALF)
  const ry = r * HOLE_SQUASH
  ctx.fillStyle = css(CAVE_PAL.spore.cap[0])
  ctx.beginPath()
  ctx.ellipse(x, y, rx + HOLE_RIM, ry + HOLE_RIM, 0, 0, FULL_TURN)
  ctx.fill()
  ctx.fillStyle = css(pal.hole)
  ctx.beginPath()
  ctx.ellipse(x, y, rx, ry, 0, 0, FULL_TURN)
  ctx.fill()
  ctx.fillStyle = css(pal.holeGlow)
  ctx.beginPath()
  ctx.ellipse(x, y + ry * (1 - HOLE_INNER) * HALF, rx * HOLE_INNER, ry * HOLE_INNER, 0, 0, FULL_TURN)
  ctx.fill()
  ctx.fillStyle = css(pal.spark)
  ctx.beginPath()
  ctx.ellipse(x, y + ry * HOLE_INNER * HALF, rx * HOLE_CRESCENT, ry * HOLE_CRESCENT * HALF, 0, 0, Math.PI)
  ctx.fill()
}
