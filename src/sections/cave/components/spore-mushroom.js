import { CFG } from '../../../cfg.js'
import { applyForestFilmGrainToCanvas } from '../../forest/utils/forest-parallax-grain.js'
import { createSeededRandom } from '../../../utils/seeded-random.js'
import { getRGB } from '../../../utils/helper.js'
import * as Glow from '../utils/cave-glow.js'
import { CAVE_PAL, css } from '../utils/cave-paint.js'
//
// Spore mushroom: a wide dome cap pierced with glowing holes, golden gills
// and swaying tendrils with glowing beads. Landing on its cap lets a swarm
// of spores out to hover above it. Jumping into the swarm moves it:
//   - straight up from below: it scatters up, then flies home;
//   - from its right, moving left: it drifts up-left, then flies home;
//   - from its left, moving right: it steps one station to the right; at the
//     last station it flies into the trap leaf there (the level snaps it).
// A hovering swarm left alone flies home after a while.
//
const SPRITE = 'cave0-spore-mushroom-v1'
const GRAIN_SEED = 9950
const BAKE_PAD = 8
//
// Shape: cap size, stem, holes, gills.
//
const CAP_W = 150
const CAP_H = 64
const CAP_RIM_DROP = 10
const STEM_H = 34
const STEM_W = 26
const STEM_FOOT_W = 40
const HOLES = [
  { u: -0.32, v: 0.55, r: 9 }, { u: -0.05, v: 0.3, r: 11 }, { u: 0.26, v: 0.45, r: 10 },
  { u: 0.12, v: 0.72, r: 7 }, { u: -0.22, v: 0.8, r: 6 }, { u: 0.38, v: 0.78, r: 6 }, { u: 0.02, v: 0.06, r: 6 }
]
const HOLE_SQUASH = 0.62
const HOLE_INNER = 0.62
const GILL_COUNT = 13
const GILL_DEPTH = 12
const CONTOUR_W = 1.8
const CAP_SHADE_SHIFT = 0.2
const CAP_LIGHT_SHIFT = 0.25
const CAP_LIGHT_W = 0.5
const CAP_LIGHT_H = 0.35
const CAP_LIGHT_Y = 0.35
const CAP_SHADE_W = 0.45
const CAP_SHADE_H = 0.5
const CAP_DOME_LIFT = 0.15
const HOLE_RIM = 2
const HOLE_RIM_LIFT = 1.5
const SPORE_HALO_SHARE = 0.6
const HALF = 0.5
//
// Tendrils: count, length, sway, bead glow.
//
const TENDRILS = 9
const TENDRIL_LEN_MIN = 26
const TENDRIL_LEN_RANGE = 34
const TENDRIL_SEGS = 5
const TENDRIL_W = 1.6
const TENDRIL_SWAY = 4
const TENDRIL_SWAY_SPEED = 1.3
const BEAD_R = 2.6
const BEAD_GLOW_R = 9
const BEAD_GLOW_OPACITY = 0.6
const HOLE_GLOW_R = 14
const HOLE_GLOW_OPACITY = 0.35
//
// Collider across the cap top.
//
const CAP_COLLIDE_W = 0.62
const CAP_COLLIDE_H = 12
const CAP_COLLIDE_SINK = 6
//
// Swarm: spore count, orbit, speeds, hit radius, moves, hover timeout.
//
const SPORES = 16
const ORBIT_R_MIN = 12
const ORBIT_R_RANGE = 34
const ORBIT_SPEED_MIN = 1.2
const ORBIT_SPEED_RANGE = 1.8
const ORBIT_FLATTEN = 0.6
const SPORE_FOLLOW = 5
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
  const home = { x, y: capTopY + CAP_H * 0.5 }
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
    tendrils: Array.from({ length: TENDRILS }, (_, i) => ({
      u: (i + HALF) / TENDRILS - HALF,
      len: TENDRIL_LEN_MIN + rng() * TENDRIL_LEN_RANGE,
      phase: rng() * FULL_TURN
    })),
    spores: Array.from({ length: SPORES }, () => ({
      x: home.x,
      y: home.y,
      angle: rng() * FULL_TURN,
      r: ORBIT_R_MIN + rng() * ORBIT_R_RANGE,
      speed: (ORBIT_SPEED_MIN + rng() * ORBIT_SPEED_RANGE) * (rng() < HALF ? -1 : 1)
    })),
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
 * Draws the mushroom (cap, tendrils, beads) — world pass.
 * @param {Object} inst - Spore mushroom instance
 */
export function onDraw(inst) {
  const k = inst.k
  const t = k.time()
  const underY = inst.capTopY + CAP_H
  inst.tendrils.forEach(td => {
    const x0 = inst.x + td.u * CAP_W * 0.85
    const pts = []
    for (let i = 0; i <= TENDRIL_SEGS; i++) {
      const s = i / TENDRIL_SEGS
      pts.push(k.vec2(x0 + Math.sin(t * TENDRIL_SWAY_SPEED + td.phase + s * 2) * TENDRIL_SWAY * s, underY + td.len * s))
    }
    k.drawLines({ pts, width: TENDRIL_W, color: getRGB(k, CAVE_PAL.spore.tendril) })
  })
  k.drawSprite({ sprite: SPRITE, pos: k.vec2(inst.x, inst.y), anchor: 'bot' })
}

/**
 * Additive glows: holes, tendril beads and the spores — light pass.
 * @param {Object} inst - Spore mushroom instance
 */
export function onDrawGlow(inst) {
  const k = inst.k
  const t = k.time()
  const underY = inst.capTopY + CAP_H
  HOLES.forEach(h => Glow.drawGlow(k, inst.x + h.u * CAP_W, inst.capTopY + h.v * CAP_H, HOLE_GLOW_R, inst.glowRgb, HOLE_GLOW_OPACITY))
  inst.tendrils.forEach(td => {
    const bx = inst.x + td.u * CAP_W * 0.85 + Math.sin(t * TENDRIL_SWAY_SPEED + td.phase + 2) * TENDRIL_SWAY
    Glow.drawGlow(k, bx, underY + td.len, BEAD_GLOW_R, inst.glowRgb, BEAD_GLOW_OPACITY)
    Glow.drawGlow(k, bx, underY + td.len, BEAD_R, inst.sparkRgb, 1)
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
// Each spore circles the swarm centre on its own orbit (shrunk inside a
// trap, collapsed into the cap when home) and eases toward its place.
//
function moveSpores(inst, dt) {
  const ease = Math.min(1, dt * SPORE_FOLLOW)
  const orbitScale = inst.state === W.TRAPPED ? TRAPPED_ORBIT : inst.state === W.INSIDE ? 0 : 1
  inst.spores.forEach(sp => {
    sp.angle += sp.speed * dt
    const tx = inst.center.x + Math.cos(sp.angle) * sp.r * orbitScale
    const ty = inst.center.y + Math.sin(sp.angle) * sp.r * ORBIT_FLATTEN * orbitScale
    sp.x += (tx - sp.x) * ease
    sp.y += (ty - sp.y) * ease
  })
}
//
// Cap (dome, mottled shading, glowing holes, golden gills) on a short stem.
//
function bake(k) {
  const pal = CAVE_PAL.spore
  const w = CAP_W + BAKE_PAD * 2
  const h = CAP_H + STEM_H + BAKE_PAD * 2
  const cx = w / 2
  const groundY = h - BAKE_PAD
  const capTop = BAKE_PAD
  const rimY = capTop + CAP_H
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.lineJoin = 'round'
  const [sDark, sMid, sLight] = pal.stem
  ctx.beginPath()
  ctx.moveTo(cx - STEM_W / 2, rimY - 4)
  ctx.quadraticCurveTo(cx - STEM_W / 2, groundY - 6, cx - STEM_FOOT_W / 2, groundY)
  ctx.lineTo(cx + STEM_FOOT_W / 2, groundY)
  ctx.quadraticCurveTo(cx + STEM_W / 2, groundY - 6, cx + STEM_W / 2, rimY - 4)
  ctx.closePath()
  ctx.fillStyle = css(sMid)
  ctx.fill()
  ctx.strokeStyle = css(sDark)
  ctx.lineWidth = CONTOUR_W
  ctx.stroke()
  ctx.fillStyle = css(sLight)
  ctx.fillRect(cx - STEM_W / 2 + 4, rimY, 3, STEM_H - 10)
  ctx.beginPath()
  ctx.ellipse(cx, rimY - 2, CAP_W / 2 - 4, GILL_DEPTH, 0, 0, Math.PI)
  ctx.fillStyle = css(pal.gill)
  ctx.fill()
  ctx.strokeStyle = css(pal.hole)
  ctx.lineWidth = 1
  for (let i = 1; i < GILL_COUNT; i++) {
    const a = Math.PI * i / GILL_COUNT
    ctx.beginPath()
    ctx.moveTo(cx, rimY - 2)
    ctx.lineTo(cx + Math.cos(a) * (CAP_W / 2 - 4), rimY - 2 + Math.sin(a) * GILL_DEPTH)
    ctx.stroke()
  }
  const [cDark, cMid, cLight, cHigh] = pal.cap
  const dome = new Path2D()
  dome.moveTo(cx - CAP_W / 2, rimY)
  dome.bezierCurveTo(cx - CAP_W / 2, capTop - CAP_H * CAP_DOME_LIFT, cx + CAP_W / 2, capTop - CAP_H * CAP_DOME_LIFT, cx + CAP_W / 2, rimY)
  dome.quadraticCurveTo(cx, rimY - CAP_RIM_DROP, cx - CAP_W / 2, rimY)
  dome.closePath()
  ctx.save()
  ctx.fillStyle = css(cMid)
  ctx.fill(dome)
  ctx.clip(dome)
  ctx.fillStyle = css(cDark)
  ctx.beginPath()
  ctx.ellipse(cx + CAP_W * CAP_SHADE_SHIFT, rimY, CAP_W * CAP_SHADE_W, CAP_H * CAP_SHADE_H, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = css(cLight)
  ctx.beginPath()
  ctx.ellipse(cx - CAP_W * CAP_LIGHT_SHIFT, capTop + CAP_H * CAP_LIGHT_Y, CAP_W * CAP_LIGHT_W / 2, CAP_H * CAP_LIGHT_H, 0, 0, Math.PI * 2)
  ctx.fill()
  HOLES.forEach(hl => {
    const hx = cx + hl.u * CAP_W
    const hy = capTop + hl.v * CAP_H
    ctx.fillStyle = css(cHigh)
    ctx.beginPath()
    ctx.ellipse(hx, hy - HOLE_RIM_LIFT, hl.r + HOLE_RIM, (hl.r + HOLE_RIM) * HOLE_SQUASH, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = css(pal.hole)
    ctx.beginPath()
    ctx.ellipse(hx, hy, hl.r, hl.r * HOLE_SQUASH, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = css(pal.holeGlow)
    ctx.beginPath()
    ctx.ellipse(hx, hy + 1, hl.r * HOLE_INNER, hl.r * HOLE_INNER * HOLE_SQUASH, 0, 0, Math.PI * 2)
    ctx.fill()
  })
  ctx.restore()
  ctx.strokeStyle = css(cDark)
  ctx.lineWidth = CONTOUR_W
  ctx.stroke(dome)
  applyForestFilmGrainToCanvas(canvas, GRAIN_SEED)
  k.loadSprite(SPRITE, canvas)
}
