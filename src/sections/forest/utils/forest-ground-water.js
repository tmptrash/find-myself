import * as OrganicMotion from './forest-organic-motion.js'
import * as PolyBatch from '../../../utils/poly-batch.js'
import { forestRgb } from './forest-palette.js'

//
// Water poured onto the forest floor: a few splash drops where it lands, a
// shallow puddle lying on the ground line that spreads a little and soaks
// away, and a darker patch of wet soil under it that dries slower than the
// puddle drains, so the ground stays dark for a while after the water is
// gone. Shapes are lopsided and uneven per puddle (seeded, not per frame).
//
// A whole body of water hitting the ground (slap) flattens into a dome that
// runs out sideways with a crown of lips at its edges, while the crown
// throws drops out and up from the rim and a short jet climbs from the
// middle. Drops streak along their flight, small ones slow down in the air
// sooner, and those that land off the puddle lie as beads that dry up.
//
const PUDDLE_SEGMENTS = 14
const PUDDLE_SINK = 0.8             // World px the puddle's underside sits under the ground line
const PUDDLE_ASYM = 0.22            // How lopsided a puddle spreads
const PUDDLE_EDGE_NOISE = 0.3       // Thickness variation along the puddle
const PUDDLE_SHAPE_POW = 0.6
const PUDDLE_MIN_VOLUME = 0.004
const PUDDLE_FADE_VOLUME = 0.05     // Below this the puddle fades as it shrinks
const PUDDLE_FULL_THICK_VOLUME = 0.3
const PUDDLE_SHRINK_SHARE = 0.45    // Shrinking runs this much slower than spreading
const PUDDLE_OPACITY = 0.88
const PUDDLE_GLINT_OPACITY = 0.6
const PUDDLE_GLINT_FROM = -0.55
const PUDDLE_GLINT_TO = 0.3
const PUDDLE_GLINT_DROP = 0.35      // World px under the puddle's top
const PUDDLE_GLINT_WIDTH = 0.5
//
// Landing water lifts a small crown on the puddle's surface.
//
const CROWN_HEIGHT = 1.1
const CROWN_WIDTH = 3.5
const CROWN_DECAY = 7
//
// Soaking away: the drain speeds up with the water left, plus a floor so
// the last film goes too; the norm makes a full bubble's puddle last about
// soilAbsorptionDuration.
//
const ABSORB_EXP = 3
const ABSORB_FLOOR = 0.1
const ABSORB_NORM = 1.5
//
// Wet soil.
//
const WET_GAIN = 1.6                // Wetness per soaked-in volume
const WET_SPREAD = 1.4              // Wet patch half width per puddle half width
const WET_SEGMENTS = 12
const WET_DEPTH = 6
const WET_OPACITY = 0.5
const WET_INNER_SHARE = 0.6
const WET_INNER_DEPTH = 3.5
const WET_INNER_OPACITY = 0.3
const WET_DRY_UNDER_PUDDLE = 0.2    // Drying pace while water still stands on it
const WET_MIN = 0.01
const SHAPE_SEED_STEP = 17.31
//
// Splash drops: thrown at an angle above the ground (radians) with a speed
// share; the faster a drop, the smaller it is. Drag per second over the
// radius, so fine spray stops first; the streak trails this many seconds of
// flight behind the drop, at this share of its width.
//
const SPLASH_POOL = 64
const SPLASH_CHANCE = 0.4
const SPLASH_POWER_SIZE = 0.6       // Drop size gained per unit of extra splash power
const SPLASH_SPEED = 100
const SPLASH_SPEED_MIN_SHARE = 0.45
const SPLASH_ANGLE_MIN = 0.5
const SPLASH_ANGLE_MAX = 1.35
const SPLASH_GRAVITY = 900
const SPLASH_DRAG = 0.9
const SPLASH_RADIUS_MIN = 0.45
const SPLASH_RADIUS_MAX = 1
const SPLASH_RIM_FROM = 0.55        // Drops leave the outer part of the span (share of its half width)
const SPLASH_STREAK_TIME = 0.018
const SPLASH_STREAK_MAX = 7         // World px
const SPLASH_STREAK_WIDTH = 1.4
const SPLASH_OPACITY = 0.85
const SPLASH_HASH_CHANCE = 2.17
const SPLASH_HASH_SIDE = 5.93
const SPLASH_HASH_UP = 8.41
const SPLASH_HASH_SPEED = 3.77
//
// The jet out of the middle of a slap: a few drops nearly straight up.
//
const JET_DROPS = 3
const JET_ANGLE_MIN = 1.38
const JET_ANGLE_MAX = 1.52
const JET_POWER = 0.75              // Share of the splash power
const JET_SPREAD = 0.15             // Share of the span's half width
//
// Beads: drops lying where they land off the puddle, drying over BEAD_LIFE
// s (flat, BEAD_LENGTH radii wide and BEAD_HEIGHT radii high).
//
const BEAD_POOL = 40
const BEAD_LIFE = 1.4
const BEAD_LENGTH = 1.6
const BEAD_HEIGHT = 0.7
const BEAD_MID = 0.5                // Beads sit on the ground line (their middle this share up)
const BEAD_OPACITY = 0.75
//
// Slap: the dome starts as wide (SLAP_START_W radii) and tall (SLAP_START_H)
// as the hit water and runs out to SLAP_END_W (fast at first, easing out),
// sinking flat, its crown lips rising up to SLAP_LIP radii at the edges
// (outside the SLAP_LIP_FROM share) and falling back.
//
const SLAP_DURATION = 0.26
const SLAP_EASE_POW = 3
const SLAP_SINK_POW = 1.5
const SLAP_START_W = 0.9
const SLAP_END_W = 2.6
const SLAP_START_H = 0.75
const SLAP_LIP = 0.55
const SLAP_LIP_FROM = 0.55
const SLAP_SEGMENTS = 16
const SLAP_OPACITY = 0.85
const SLAP_RIM_WIDTH = 0.7
const SLAP_RIM_OPACITY = 0.8

/**
 * Creates the ground water layer (dry ground, no puddle).
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay instance
 * @param {number} cfg.groundY - World Y of the ground line
 * @param {Object} cfg.params - Tunables (FOREST_CFG.waterFlower)
 * @param {Object} cfg.colors - Palette hex group (palette.waterFlower)
 * @returns {Object} Ground water inst
 */
export function create(cfg) {
  const { k, groundY, params, colors } = cfg
  return {
    k,
    groundY,
    params,
    colors: {
      puddle: kColor(k, colors.puddle),
      puddleGlint: kColor(k, colors.puddleGlint),
      wetSoil: kColor(k, colors.wetSoil),
      splash: kColor(k, colors.droplet),
      water: kColor(k, colors.water)
    },
    volume: 0,
    cx: 0,
    halfW: 0,
    thickness: 0,
    crownX: 0,
    crown: 0,
    wet: 0,
    wetCx: 0,
    wetHalfW: 0,
    shapeSeed: 0,
    hitSerial: 0,
    splash: Array.from({ length: SPLASH_POOL }, newSplash),
    nextSplash: 0,
    beads: Array.from({ length: BEAD_POOL }, newBead),
    nextBead: 0,
    slap: { x: 0, r: 0, t: 1 },
    slapShape: { halfW: 0, h: 0, lip: 0 },
    poly: { pts: [], indices: [], count: 0 },
    batch: PolyBatch.create()
  }
}

/**
 * Water reaching the ground at x: feeds the puddle (a new one if the ground
 * is dry) and now and then throws a splash drop.
 * @param {Object} inst - Ground water inst
 * @param {number} x - World X of the hit
 * @param {number} amount - Volume (share of one full bubble)
 */
export function addWater(inst, x, amount) {
  if (amount <= 0) return
  if (inst.volume < PUDDLE_MIN_VOLUME && inst.wet < WET_MIN) {
    inst.shapeSeed += SHAPE_SEED_STEP
    inst.cx = x
    inst.wetCx = x
    inst.halfW = 0
  }
  inst.cx = (inst.cx * inst.volume + x * amount) / (inst.volume + amount)
  inst.volume += amount
  inst.crownX = x
  inst.crown = 1
  inst.hitSerial++
  if (OrganicMotion.hash01(inst.hitSerial * SPLASH_HASH_CHANCE) >= SPLASH_CHANCE) return
  const side = OrganicMotion.hash01(inst.hitSerial * SPLASH_HASH_SIDE) * 2 - 1 < 0 ? -1 : 1
  spawnSplash(inst, x, side, 1, SPLASH_ANGLE_MIN, SPLASH_ANGLE_MAX)
}

/**
 * Throws splash drops out of the rim of a span, half to each side, with a
 * short jet climbing from its middle.
 * @param {Object} inst - Ground water inst
 * @param {number} x - World X of the middle of the span
 * @param {number} count - Number of drops
 * @param {number} halfW - Half width of the span the drops leave from
 * @param {number} [power=1] - Speed share of the drops (bigger drops fly with more)
 */
export function splash(inst, x, count, halfW, power = 1) {
  for (let i = 0; i < count; i++) {
    inst.hitSerial++
    const side = i % 2 ? 1 : -1
    const jet = i < JET_DROPS
    const reach = jet ? JET_SPREAD : SPLASH_RIM_FROM + (1 - SPLASH_RIM_FROM) * OrganicMotion.hash01(inst.hitSerial * SPLASH_HASH_CHANCE)
    jet
      ? spawnSplash(inst, x + side * halfW * reach, side, power * JET_POWER, JET_ANGLE_MIN, JET_ANGLE_MAX)
      : spawnSplash(inst, x + side * halfW * reach, side, power, SPLASH_ANGLE_MIN, SPLASH_ANGLE_MAX)
  }
}

/**
 * A body of water slapping onto the ground at x: it flattens into a dome
 * that runs out sideways and lifts a crown at its edges.
 * @param {Object} inst - Ground water inst
 * @param {number} x - World X of the hit
 * @param {number} r - Radius of the water body
 */
export function slap(inst, x, r) {
  inst.slap.x = x
  inst.slap.r = r
  inst.slap.t = 0
}

/**
 * Spreads, soaks and dries the water; runs the slap, moves splash drops,
 * dries beads.
 * @param {Object} inst - Ground water inst
 * @param {number} dt - Frame time (s)
 */
export function onUpdate(inst, dt) {
  const { params } = inst
  const target = params.puddleWidth * Math.sqrt(inst.volume)
  const speed = params.puddleSpreadSpeed * (target > inst.halfW ? 1 : PUDDLE_SHRINK_SHARE)
  inst.halfW += Math.max(-speed * dt, Math.min(speed * dt, target - inst.halfW))
  inst.thickness = params.puddleThickness * Math.sqrt(Math.min(1, inst.volume / PUDDLE_FULL_THICK_VOLUME))
  const absorbed = Math.min(inst.volume,
    dt * (ABSORB_EXP * inst.volume + ABSORB_FLOOR) / (ABSORB_NORM * params.soilAbsorptionDuration))
  inst.volume -= absorbed
  inst.volume < PUDDLE_MIN_VOLUME && (inst.volume = 0)
  inst.wet = Math.min(1, inst.wet + absorbed * WET_GAIN)
  const dryPace = inst.volume > 0 ? WET_DRY_UNDER_PUDDLE : 1
  inst.wet = Math.max(0, inst.wet - dt * dryPace / params.soilDryingDuration)
  inst.wetHalfW = inst.wet > 0 ? Math.max(inst.wetHalfW, inst.halfW * WET_SPREAD) : 0
  inst.wetCx += (inst.cx - inst.wetCx) * Math.min(1, dt)
  inst.crown *= Math.exp(-CROWN_DECAY * dt)
  inst.slap.t = Math.min(1, inst.slap.t + dt / SLAP_DURATION)
  moveSplash(inst, dt)
  dryBeads(inst, dt)
}

/**
 * Draws the wet soil, the puddle and the beads lying round it.
 * @param {Object} inst - Ground water inst
 */
export function drawSoil(inst) {
  if (inst.wet > 0 && inst.wetHalfW > 0) {
    drawWetPatch(inst, inst.wetHalfW, WET_DEPTH, WET_OPACITY * inst.wet)
    drawWetPatch(inst, inst.wetHalfW * WET_INNER_SHARE, WET_INNER_DEPTH, WET_INNER_OPACITY * inst.wet)
  }
  inst.halfW > 0.5 && drawPuddle(inst)
  drawBeads(inst)
}

/**
 * Draws the slap's dome and the airborne splash drops.
 * @param {Object} inst - Ground water inst
 */
export function drawSplash(inst) {
  inst.slap.t < 1 && drawSlap(inst)
  const { batch } = inst
  for (let i = 0; i < SPLASH_POOL; i++) {
    const s = inst.splash[i]
    s.alive && addStreak(inst, s)
  }
  PolyBatch.flush(batch, inst.k, SPLASH_OPACITY)
}

//
// Darker soil: a lens hanging under the ground line, ragged at the bottom.
//
function drawWetPatch(inst, halfW, depth, opacity) {
  const poly = resetPoly(inst)
  for (let i = 0; i <= WET_SEGMENTS; i++) {
    const u = -1 + 2 * i / WET_SEGMENTS
    const x = inst.wetCx + u * halfW
    const ragged = 1 + PUDDLE_EDGE_NOISE * (OrganicMotion.hash01(inst.shapeSeed + i) * 2 - 1)
    pushPoint(poly, x, inst.groundY)
    pushPoint(poly, x, inst.groundY + depth * Math.pow(1 - u * u, PUDDLE_SHAPE_POW) * ragged)
  }
  stripIndices(poly, WET_SEGMENTS)
  drawPoly(inst, poly, inst.colors.wetSoil, opacity)
}
//
// Puddle: a thin lopsided lens on the ground line, a crown where water
// lands, a short glint along its top.
//
function drawPuddle(inst) {
  const fade = OrganicMotion.smootherstep(inst.volume / PUDDLE_FADE_VOLUME)
  if (fade <= 0) return
  const lean = PUDDLE_ASYM * (OrganicMotion.hash01(inst.shapeSeed) * 2 - 1)
  const poly = resetPoly(inst)
  for (let i = 0; i <= PUDDLE_SEGMENTS; i++) {
    const u = -1 + 2 * i / PUDDLE_SEGMENTS
    const x = puddleX(inst, u, lean)
    pushPoint(poly, x, puddleTop(inst, u, i, x))
    pushPoint(poly, x, inst.groundY + PUDDLE_SINK)
  }
  stripIndices(poly, PUDDLE_SEGMENTS)
  drawPoly(inst, poly, inst.colors.puddle, PUDDLE_OPACITY * fade)
  const glint = resetPoly(inst)
  for (let i = 0; i <= PUDDLE_SEGMENTS; i++) {
    const u = -1 + 2 * i / PUDDLE_SEGMENTS
    if (u < PUDDLE_GLINT_FROM || u > PUDDLE_GLINT_TO) continue
    const x = puddleX(inst, u, lean)
    const y = puddleTop(inst, u, i, x) + PUDDLE_GLINT_DROP
    pushPoint(glint, x, y)
    pushPoint(glint, x, y + PUDDLE_GLINT_WIDTH)
  }
  stripIndices(glint, glint.count / 2 - 1)
  drawPoly(inst, glint, inst.colors.puddleGlint, PUDDLE_GLINT_OPACITY * fade)
}
function puddleX(inst, u, lean) {
  return inst.cx + u * inst.halfW * (1 + lean * Math.sign(u))
}
function puddleTop(inst, u, i, x) {
  const ragged = 1 + PUDDLE_EDGE_NOISE * (OrganicMotion.hash01(inst.shapeSeed + i * SHAPE_SEED_STEP) * 2 - 1)
  const d = (x - inst.crownX) / CROWN_WIDTH
  const crown = CROWN_HEIGHT * inst.crown * Math.exp(-d * d)
  return inst.groundY - inst.thickness * Math.pow(1 - u * u, PUDDLE_SHAPE_POW) * ragged - crown
}
//
// The dome of a slap: a lens on the ground line that flattens as it runs
// out, its edges lifted into the crown's lips, with a light top edge.
//
function drawSlap(inst) {
  const { slap, groundY } = inst
  const e = 1 - Math.pow(1 - slap.t, SLAP_EASE_POW)
  const shape = inst.slapShape
  shape.halfW = slap.r * (SLAP_START_W + (SLAP_END_W - SLAP_START_W) * e)
  shape.h = slap.r * SLAP_START_H * Math.pow(1 - e, SLAP_SINK_POW)
  shape.lip = slap.r * SLAP_LIP * Math.sin(Math.PI * slap.t)
  const fade = 1 - slap.t * slap.t
  const dome = resetPoly(inst)
  for (let i = 0; i <= SLAP_SEGMENTS; i++) {
    const u = -1 + 2 * i / SLAP_SEGMENTS
    pushPoint(dome, slap.x + u * shape.halfW, slapTop(inst, u))
    pushPoint(dome, slap.x + u * shape.halfW, groundY + PUDDLE_SINK)
  }
  stripIndices(dome, SLAP_SEGMENTS)
  drawPoly(inst, dome, inst.colors.water, SLAP_OPACITY * fade)
  const rim = resetPoly(inst)
  for (let i = 0; i <= SLAP_SEGMENTS; i++) {
    const u = -1 + 2 * i / SLAP_SEGMENTS
    const top = slapTop(inst, u)
    pushPoint(rim, slap.x + u * shape.halfW, top)
    pushPoint(rim, slap.x + u * shape.halfW, top + SLAP_RIM_WIDTH)
  }
  stripIndices(rim, SLAP_SEGMENTS)
  drawPoly(inst, rim, inst.colors.splash, SLAP_RIM_OPACITY * fade)
}
function slapTop(inst, u) {
  const { h, lip } = inst.slapShape
  const rise = OrganicMotion.smootherstep((Math.abs(u) - SLAP_LIP_FROM) / (1 - SLAP_LIP_FROM))
  return inst.groundY - h * Math.sqrt(1 - u * u) - lip * rise
}
//
// A drop and the streak it leaves along its flight.
//
function addStreak(inst, s) {
  const speed = Math.hypot(s.vx, s.vy) || 1
  const len = Math.min(SPLASH_STREAK_MAX, speed * SPLASH_STREAK_TIME)
  const tx = s.x - s.vx / speed * len
  const ty = s.y - s.vy / speed * len
  PolyBatch.addLine(inst.batch, tx, ty, s.x, s.y, s.r * SPLASH_STREAK_WIDTH, inst.colors.splash)
  PolyBatch.addDisc(inst.batch, s.x, s.y, s.r, inst.colors.splash)
}
//
// Beads shrink as they dry; ones the puddle has run over join it.
//
function drawBeads(inst) {
  const { batch, groundY } = inst
  for (let i = 0; i < BEAD_POOL; i++) {
    const b = inst.beads[i]
    if (!b.alive) continue
    const size = b.r * Math.sqrt(b.life)
    const y = groundY - size * BEAD_HEIGHT * BEAD_MID
    PolyBatch.addLine(batch, b.x - size * BEAD_LENGTH, y, b.x + size * BEAD_LENGTH, y, size * BEAD_HEIGHT,
      inst.colors.puddle)
  }
  PolyBatch.flush(batch, inst.k, BEAD_OPACITY)
}
function dryBeads(inst, dt) {
  for (let i = 0; i < BEAD_POOL; i++) {
    const b = inst.beads[i]
    if (!b.alive) continue
    b.life -= dt / BEAD_LIFE
    b.alive = b.life > 0 && !onPuddle(inst, b.x)
  }
}
//
// Thrown at an angle above the ground between angleMin and angleMax towards
// side; the faster share of drops are the smaller ones.
//
function spawnSplash(inst, x, side, power, angleMin, angleMax) {
  const s = inst.splash[inst.nextSplash]
  inst.nextSplash = (inst.nextSplash + 1) % SPLASH_POOL
  const up = OrganicMotion.hash01(inst.hitSerial * SPLASH_HASH_UP)
  const fast = OrganicMotion.hash01(inst.hitSerial * SPLASH_HASH_SPEED)
  const angle = angleMin + (angleMax - angleMin) * up
  const speed = SPLASH_SPEED * power * (SPLASH_SPEED_MIN_SHARE + (1 - SPLASH_SPEED_MIN_SHARE) * fast)
  s.alive = true
  s.x = x
  s.y = inst.groundY - 1
  s.vx = side * Math.cos(angle) * speed
  s.vy = -Math.sin(angle) * speed
  s.r = (SPLASH_RADIUS_MAX - (SPLASH_RADIUS_MAX - SPLASH_RADIUS_MIN) * fast) *
    (1 + SPLASH_POWER_SIZE * (power - 1))
}
function moveSplash(inst, dt) {
  for (let i = 0; i < SPLASH_POOL; i++) {
    const s = inst.splash[i]
    if (!s.alive) continue
    const drag = Math.exp(-SPLASH_DRAG * dt / s.r)
    s.vx *= drag
    s.vy *= drag
    s.x += s.vx * dt
    s.y += s.vy * dt + 0.5 * SPLASH_GRAVITY * dt * dt
    s.vy += SPLASH_GRAVITY * dt
    s.vy > 0 && s.y >= inst.groundY && landSplash(inst, s)
  }
}
//
// A drop back on the ground joins the puddle, or lies as a bead off it.
//
function landSplash(inst, s) {
  s.alive = false
  if (onPuddle(inst, s.x)) return
  const b = inst.beads[inst.nextBead]
  inst.nextBead = (inst.nextBead + 1) % BEAD_POOL
  b.alive = true
  b.x = s.x
  b.r = s.r
  b.life = 1
}
function onPuddle(inst, x) {
  return inst.volume > 0 && Math.abs(x - inst.cx) < inst.halfW
}
function resetPoly(inst) {
  const poly = inst.poly
  poly.count = 0
  poly.indices.length = 0
  return poly
}
function pushPoint(poly, x, y) {
  const p = poly.pts[poly.count] ?? (poly.pts[poly.count] = { x: 0, y: 0 })
  p.x = x
  p.y = y
  poly.count++
}
function stripIndices(poly, rows) {
  for (let i = 0; i < rows; i++) {
    const a = i * 2
    poly.indices.push(a, a + 1, a + 3, a, a + 3, a + 2)
  }
}
function drawPoly(inst, poly, color, opacity) {
  if (opacity <= 0 || poly.count < 3 || !poly.indices.length) return
  poly.pts.length = poly.count
  inst.k.drawPolygon({ pts: poly.pts, indices: poly.indices, color, opacity })
}
function kColor(k, hex) {
  const c = forestRgb(hex)
  return k.rgb(c.r, c.g, c.b)
}
function newSplash() {
  return { alive: false, x: 0, y: 0, vx: 0, vy: 0, r: 0 }
}
function newBead() {
  return { alive: false, x: 0, r: 0, life: 0 }
}
