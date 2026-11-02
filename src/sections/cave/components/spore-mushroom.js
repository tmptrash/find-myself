import { CFG } from '../../../cfg.js'
import { applyForestFilmGrainToCanvas } from '../../forest/utils/forest-parallax-grain.js'
import { createSeededRandom } from '../../../utils/seeded-random.js'
import { getRGB } from '../../../utils/helper.js'
import * as Glow from '../utils/cave-glow.js'
import { CAVE_PAL, css } from '../utils/cave-paint.js'
//
// Spore mushroom: a bell-shaped cap of blue-grey skin (cracked and mottled
// like old leather, its rim flaring out) pierced with deep holes glowing
// warm inside, a pale lit underside with gills and a crooked stem rising
// into its centre. Landing on its cap lets a swarm
// of spores out to hover above it. Jumping into the swarm moves it:
//   - straight up from below: it scatters up, then flies home;
//   - from its right, moving left: it drifts up-left, then flies home;
//   - from its left, moving right: it steps one station to the right; at the
//     last station it flies into the trap leaf there (the level snaps it).
// A hovering swarm left alone flies home after a while.
//
const SPRITE = 'cave0-spore-mushroom-v7'
const GRAIN_SEED = 9950
const BAKE_PAD = 8
//
// Shape: cap size; the bell (its half-width at a height share v from the
// rim up: BELL_BODY * (1 - v^BELL_POW)^BELL_ROUND, plus the rim flaring out
// by BELL_FLARE, fading up over the lowest part, power BELL_FLARE_POW); the
// underside seen from below (an ellipse with gills from the stem), the stem.
//
const SIZE = 0.82
const CAP_SIZE = 0.68
const CAP_W = Math.round(168 * CAP_SIZE)
const CAP_H = Math.round(74 * CAP_SIZE)
const BELL_BODY = 0.86
const BELL_POW = 2.4
const BELL_ROUND = 0.5
const BELL_FLARE = 0.14
const BELL_FLARE_POW = 6
const UNDER_RY = Math.round(13 * CAP_SIZE)
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
// Lumpy bell: the outline swells and dips a little (bumps along it, share
// of the cap height).
//
const DOME_STEPS = 48
const DOME_BUMPS = 9
const DOME_BUMP = 0.04
const DOME_BUMP_SEED = 1.7
//
// Old-leather skin: soft lighter and darker patches, then a net of fine
// dark cracks wandering over it and forking (each crack a few steps of
// random turns, forking with a chance, down to a depth), each with a pale
// lip on its lower side.
//
const MOTTLES = 26
const MOTTLE_R_MIN = 3
const MOTTLE_R_RANGE = 7
const MOTTLE_FLAT = 0.6
const MOTTLE_ALPHA = 0.35
const CRACKS = 22
const CRACK_STEPS = 5
const CRACK_STEP = 4
const CRACK_TURN = 1.1
const CRACK_FORK_CHANCE = 0.45
const CRACK_DEPTH = 2
const CRACK_W = 0.9
const CRACK_ALPHA = 0.55
const CRACK_LIP_ALPHA = 0.3
const CRACK_SPAN = 0.95
//
// Crooked stem like a little tree trunk: its centre line bends side to
// side (two waves) on its way up.
//
const STEM_BEND = 5
const STEM_BEND_TURNS = 1.3
const STEM_BEND_FINE = 1.5
const STEM_BEND_FINE_TURNS = 3.1
const STEM_STEPS = 16
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
// its height from the top, r: radius), big and small in rows down the
// bell. Toward its sides they are foreshortened (narrower) and tilt with
// the surface. Each is deep: a dark lip, the shadowed upper inner wall,
// the lit lower wall, a glowing heart low in it, a bright crescent at its
// lower edge and the cap's lit edge just under it.
//
const HOLES = [
  { u: -0.07, v: 0.18, r: 10 }, { u: 0.12, v: 0.2, r: 8 },
  { u: -0.25, v: 0.38, r: 11 }, { u: 0.02, v: 0.4, r: 15 }, { u: 0.26, v: 0.37, r: 10 },
  { u: -0.34, v: 0.6, r: 9 }, { u: -0.12, v: 0.62, r: 12 }, { u: 0.14, v: 0.6, r: 13 }, { u: 0.34, v: 0.62, r: 8 },
  { u: -0.4, v: 0.8, r: 6 }, { u: -0.23, v: 0.82, r: 8 }, { u: 0.02, v: 0.84, r: 9 }, { u: 0.25, v: 0.82, r: 9 }, { u: 0.4, v: 0.8, r: 5 }
]
const HOLE_SQUASH = 0.8
const HOLE_SIZE = CAP_SIZE
const HOLE_EDGE_SQUEEZE = 0.9
const HOLE_TILT = 1.1
const HOLE_RIM = 1.6
const HOLE_WALL = 0.88
const HOLE_WALL_DROP = 0.14
const HOLE_INNER = 0.6
const HOLE_INNER_DROP = 0.22
const HOLE_CRESCENT = 0.42
const HOLE_EDGE_LIT_W = 1.2
const HOLE_EDGE_LIT_ALPHA = 0.7
const SPORE_HALO_SHARE = 0.6
const HOLE_GLOW_R = 1.3
const HOLE_GLOW_OPACITY = 0.35
const HALF = 0.5
//
// Collider across the cap top, one-way: it appears only once the hero is
// over the cap with his feet above its top and not rising (dropping onto it
// from a jump or from a higher ledge), and stays while he stands on it; it
// goes away when he jumps up, steps off its sides or ends up below its top,
// so under or beside the mushroom he walks and jumps as if it were not
// there (it is also tagged so the hero never takes it for a ceiling). Feet:
// the bottom of the hero's live hitbox (it tucks and lifts in a jump).
// CAP_COLLIDE_TOL: how far the feet may sink into the cap and still count
// as on top when it appears; CAP_COLLIDE_DROP: how far below its top they
// must be for it to go (a fast fall sinks in a whole physics step before
// it is pushed out, so this is deeper). The collider is thick so such a
// fall cannot tunnel through it.
//
const CAP_COLLIDE_W = 0.62
const CAP_COLLIDE_H = 64
const CAP_COLLIDE_SINK = 6
const CAP_COLLIDE_TOL = 6
const CAP_COLLIDE_DROP = 48
//
// Swarm: spore count, speeds, hit radius, moves, hover timeout.
//
const SPORES = 16
//
// Each spore wanders on its own over a patch around the swarm centre: it
// heads for a spot of its own somewhere in its range (picked again every
// GOAL_MIN … GOAL_MIN + GOAL_RANGE s), with a jittery push and damping; the
// patch is flatter than tall.
//
const WANDER_PUSH = 900
const GOAL_PULL = 6
const GOAL_MIN = 0.6
const GOAL_RANGE = 1.4
const WANDER_DAMP = 2.2
const WANDER_R_MIN = 34
const WANDER_R_RANGE = 56
const WANDER_FLATTEN = 0.75
//
// How fast each spore catches up with its spot in the swarm (its own rate
// in this range), so a moving swarm strings out and every spore travels at
// its own pace; and how far each wanders (its own share of the push).
//
const FOLLOW_MIN = 1.8
const FOLLOW_RANGE = 7
const PUSH_MIN = 0.5
const PUSH_RANGE = 1
const MAX_DT = 0.05
//
// Flying home, the spores steer from the swarm toward their own holes as
// the swarm nears the mushroom, still wandering a little; inside, a spore
// is hidden once it is this close to its hole.
//
const SETTLE_DIST = 2.5
//
// Each spore leaves and comes back on its own: out of its hole after a
// random wait (up to RELEASE_SPREAD s), and home it keeps wandering a
// random while (up to RETURN_SPREAD s) before slipping in at its own pace.
//
const RELEASE_SPREAD = 1.6
const RETURN_SPREAD = 2.2
const PACE_MIN = 0.25
const PACE_RANGE = 0.75
//
// Spores swerve round the hero's sides instead of through him: within this
// reach of his body (flattened: taller than wide) they are pushed sideways,
// each to the side it is already on (or its own preferred side).
//
const AVOID_R = 46
const AVOID_FLAT = 0.55
const AVOID_PUSH = 900
const CENTER_SPEED = 260
const HOME_SPEED = 110
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
//
// The mushroom gives under the hero: landing on the cap kicks a damped
// spring that squashes the whole mushroom from the ground (shorter, a bit
// wider) and lets it settle a little lower while he stands on it; it
// springs back when he leaves. SAG_H / SAG_W: height / width change per
// unit of sag (SAG_REST under his weight); the cap collider follows the
// cap's top, so the hero sinks with it.
//
const SAG_H = 0.05
const SAG_W = 0.03
const SAG_REST = 1
const SAG_KICK = 14
const SAG_STIFF = 180
const SAG_DAMP = 14
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
  const inst = {
    k,
    x,
    y,
    capTopY,
    stations,
    home,
    body: null,
    spores: Array.from({ length: SPORES }, (_, i) => {
      const hole = HOLES[Math.floor(rng() * HOLES.length)]
      const at = { x: x + hole.u * CAP_W, y: capTopY + hole.v * CAP_H }
      return { ...at, hole, ox: 0, oy: 0, vx: 0, vy: 0, range: WANDER_R_MIN + rng() * WANDER_R_RANGE, side: rng() < HALF ? -1 : 1, inside: true, wait: 0, pace: 1, gx: 0, gy: 0, goalT: 0, follow: FOLLOW_MIN + rng() * FOLLOW_RANGE, push: PUSH_MIN + rng() * PUSH_RANGE }
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
    onCap: false,
    sag: 0,
    sagV: 0,
    capY: capTopY + CAP_COLLIDE_SINK,
    prey: null,
    homeFrom: 1,
    glowRgb: getRGB(k, CAVE_PAL.spore.holeGlow),
    swarmRgb: getRGB(k, CAVE_PAL.spore.swarm),
    swarmCoreRgb: getRGB(k, CAVE_PAL.spore.swarmCore)
  }
  return inst
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
  inst.prey = char?.exists?.() ? { x: char.pos.x, y: char.pos.y } : null
  let event = null
  if (char?.exists?.()) {
    const vx = inst.prevHeroX === null ? 0 : (char.pos.x - inst.prevHeroX) / Math.max(dt, 1e-3)
    inst.prevHeroX = char.pos.x
    gateCap(inst, heroInst)
    const onCap = char.isGrounded?.() && char.curPlatform?.() === inst.body
    const landed = onCap && !inst.onCap
    inst.onCap = onCap
    landed && (inst.sagV += SAG_KICK)
    if (landed && inst.state === W.INSIDE) {
      flyTo(inst, inst.stations[0], W.HOVER, 0)
      inst.spores.forEach(sp => (sp.wait = Math.random() * RELEASE_SPREAD))
      event = 'released'
    }
    !char.isGrounded?.() && tryHit(inst, char, vx)
  } else {
    inst.prevHeroX = null
    inst.onCap = false
    dropCap(inst)
  }
  sagStep(inst, dt)
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
  const s = bodyScale(inst)
  inst.k.drawSprite({ sprite: SPRITE, pos: inst.k.vec2(inst.x, inst.y + BAKE_PAD), anchor: 'bot', scale: inst.k.vec2(s.x, s.y) })
}

/**
 * Whether a body is the mushroom's cap collider.
 * @param {Object} inst - Spore mushroom instance
 * @param {Object|null} body - Kaplay object
 * @returns {boolean}
 */
export function isCap(inst, body) {
  return Boolean(body) && body === inst.body
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
  const opacity = inst.state === W.TRAPPED ? TRAPPED_OPACITY : SPORE_OPACITY
  inst.spores.forEach(sp => {
    if (sp.inside) return
    Glow.drawGlow(k, sp.x, sp.y, SPORE_GLOW_R, inst.swarmRgb, opacity * SPORE_HALO_SHARE)
    Glow.drawGlow(k, sp.x, sp.y, SPORE_CORE_R, inst.swarmCoreRgb, opacity)
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
//
// The swarm flies home; every spore picks a random hole to slip back into
// (several may share one).
//
function goHome(inst) {
  inst.state = W.HOME
  inst.target = { ...inst.home }
  inst.homeFrom = Math.max(1, Math.hypot(inst.center.x - inst.home.x, inst.center.y - inst.home.y))
  inst.spores.forEach(sp => (sp.hole = HOLES[Math.floor(Math.random() * HOLES.length)]))
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
    inst.spores.forEach(sp => {
      sp.wait = sp.inside ? 0 : Math.random() * RETURN_SPREAD
      sp.pace = PACE_MIN + Math.random() * PACE_RANGE
    })
    return null
  }
  inst.state = inst.then
  return inst.state === W.HOVER && inst.station === inst.stations.length - 1 ? 'trap' : null
}
//
// Spores inside sit in their holes (hidden once settled) and come out one
// by one after their own wait; out, each wanders randomly around the swarm
// centre (random pushes, a pull back, damping), its range shrunk when
// trapped; flying home they steer from the swarm to their own holes, linger
// a random while and slip in at their own pace. They swerve round the hero.
//
function moveSpores(inst, dt) {
  const step = Math.min(dt, MAX_DT)
  const scale = inst.state === W.TRAPPED ? TRAPPED_ORBIT : 1
  const homing = inst.state === W.HOME ? 1 - Math.min(1, Math.hypot(inst.center.x - inst.home.x, inst.center.y - inst.home.y) / inst.homeFrom) : 0
  inst.spores.forEach(sp => {
    const ease = Math.min(1, step * sp.follow)
    if (sp.inside && inst.state !== W.INSIDE) {
      sp.wait -= step
      const at = holeAt(inst, sp.hole)
      sp.x = at.x
      sp.y = at.y
      sp.ox = sp.x - inst.center.x
      sp.oy = sp.y - inst.center.y
      sp.inside = sp.wait > 0
      return
    }
    if (inst.state === W.INSIDE && sp.wait > 0) sp.wait -= step
    else if (inst.state === W.INSIDE) {
      const at = holeAt(inst, sp.hole)
      sp.x += (at.x - sp.x) * ease * sp.pace
      sp.y += (at.y - sp.y) * ease * sp.pace
      sp.inside = sp.inside || Math.hypot(at.x - sp.x, at.y - sp.y) < SETTLE_DIST
      sp.ox = sp.x - inst.center.x
      sp.oy = sp.y - inst.center.y
      sp.vx = 0
      sp.vy = 0
      return
    }
    const range = sp.range * scale * (1 - homing * homing)
    pickGoal(sp, step)
    sp.vx += ((Math.random() - HALF) * WANDER_PUSH * sp.push + (sp.gx * range - sp.ox) * GOAL_PULL - sp.vx * WANDER_DAMP) * step
    sp.vy += ((Math.random() - HALF) * WANDER_PUSH * sp.push * WANDER_FLATTEN + (sp.gy * range * WANDER_FLATTEN - sp.oy) * GOAL_PULL - sp.vy * WANDER_DAMP) * step
    sp.ox += sp.vx * step
    sp.oy += sp.vy * step
    const hole = holeAt(inst, sp.hole)
    const baseX = inst.center.x + (hole.x - inst.center.x) * homing
    const baseY = inst.center.y + (hole.y - inst.center.y) * homing
    sp.x += (baseX + sp.ox - sp.x) * ease
    sp.y += (baseY + sp.oy - sp.y) * ease
    inst.prey && avoidPrey(sp, inst.prey, step)
  })
}
//
// The cap collider appears when the hero drops onto the cap from above and
// goes when he jumps off, steps off a side or is below the cap's top.
//
function gateCap(inst, heroInst) {
  const char = heroInst.character
  const box = char.worldArea().bbox()
  const feet = box.pos.y + box.height
  const over = Math.abs(box.pos.x + box.width * HALF - inst.x) < (CAP_W * CAP_COLLIDE_W + box.width) * HALF
  const rising = char.vel.y < 0
  const depth = inst.body ? CAP_COLLIDE_DROP : CAP_COLLIDE_TOL
  const want = over && !rising && feet <= liveCapY(inst) + depth
  want && !inst.body && (inst.body = addCap(inst))
  !want && dropCap(inst)
}
//
// Static collider across the cap's top.
//
function addCap(inst) {
  const k = inst.k
  return k.add([
    k.rect(CAP_W * CAP_COLLIDE_W, CAP_COLLIDE_H),
    k.pos(inst.x - CAP_W * CAP_COLLIDE_W / 2, liveCapY(inst)),
    k.area(),
    k.body({ isStatic: true }),
    k.opacity(0),
    CFG.game.platformName,
    CFG.game.noCeilingTag
  ])
}
function dropCap(inst) {
  inst.body?.exists() && inst.k.destroy(inst.body)
  inst.body = null
}
//
// One step of the sag spring (toward resting under the hero's weight
// while he stands on the cap, else upright); the collider rides the cap.
//
function sagStep(inst, dt) {
  const target = inst.onCap ? SAG_REST : 0
  inst.sagV += (-SAG_STIFF * (inst.sag - target) - SAG_DAMP * inst.sagV) * dt
  inst.sag += inst.sagV * dt
  inst.body?.exists() && (inst.body.pos = inst.k.vec2(inst.body.pos.x, liveCapY(inst)))
}
//
// Collider top: the resting cap top lowered by the sag.
//
function liveCapY(inst) {
  return inst.capY + (inst.y - inst.capTopY) * SAG_H * inst.sag
}
//
// Sprite scale from the ground: breathing swells it, the sag squashes it.
//
function bodyScale(inst) {
  return { x: 1 + BREATH_W * inst.breath + SAG_W * inst.sag, y: 1 + BREATH_H * inst.breath - SAG_H * inst.sag }
}
//
// Every so often a spore picks a new spot to head for: a random point in
// the unit disc (scaled by its range when used), spread evenly over it.
//
function pickGoal(sp, step) {
  sp.goalT -= step
  if (sp.goalT > 0) return
  const a = Math.random() * FULL_TURN
  const d = Math.sqrt(Math.random())
  sp.gx = Math.cos(a) * d
  sp.gy = Math.sin(a) * d
  sp.goalT = GOAL_MIN + Math.random() * GOAL_RANGE
}
//
// Pushes a spore sideways out of the hero's body, so the swarm streams
// round his sides.
//
function avoidPrey(sp, prey, step) {
  const dx = sp.x - prey.x
  const d = Math.hypot(dx, (sp.y - prey.y) * AVOID_FLAT)
  if (d >= AVOID_R) return
  const side = Math.abs(dx) > 1 ? Math.sign(dx) : sp.side
  sp.x += side * AVOID_PUSH * (1 - d / AVOID_R) * step
}
//
// World position of a hole on the cap, moving with the breath and sag.
//
function holeAt(inst, h) {
  const s = bodyScale(inst)
  return { x: inst.x + h.u * CAP_W * s.x, y: inst.y - (inst.y - inst.capTopY - h.v * CAP_H) * s.y }
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
  ctx.strokeStyle = css(pal.gillLine, GILL_ALPHA)
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
// Crooked stem from a wider foot up into the underside's centre, bending
// like a little trunk, with a dark collar under the gills, a lit streak on
// its left and fibres following it.
//
function paintStem(ctx, cx, rimY, groundY) {
  const [dark, mid, light] = CAVE_PAL.spore.stem
  const at = y => cx + stemBend(y, rimY, groundY)
  const halfW = y => {
    const t = (y - rimY) / (groundY - rimY)
    return (STEM_TOP_W + (STEM_W - STEM_TOP_W) * Math.sin(Math.PI * t * HALF) + (STEM_FOOT_W - STEM_W) * Math.pow(t, 4)) / 2
  }
  const left = []
  const right = []
  for (let i = 0; i <= STEM_STEPS; i++) {
    const y = rimY + (groundY - rimY) * i / STEM_STEPS
    left.push({ x: at(y) - halfW(y), y })
    right.push({ x: at(y) + halfW(y), y })
  }
  const path = new Path2D()
  ;[...left, ...right.reverse()].forEach((q, i) => (i ? path.lineTo(q.x, q.y) : path.moveTo(q.x, q.y)))
  path.closePath()
  ctx.fillStyle = css(mid)
  ctx.fill(path)
  ctx.save()
  ctx.clip(path)
  ctx.strokeStyle = css(light)
  ctx.lineWidth = STEM_LIT_W
  ctx.beginPath()
  left.slice().reverse().forEach((q, i) => {
    const x = at(q.y) - halfW(q.y) * STEM_LIT_X * 2
    i ? ctx.lineTo(x, q.y) : ctx.moveTo(x, q.y)
  })
  ctx.stroke()
  paintStemFibres(ctx, at, halfW, rimY, groundY, createSeededRandom(GRAIN_SEED + 1))
  ctx.restore()
  ctx.strokeStyle = css(dark)
  ctx.lineWidth = CONTOUR_W
  ctx.stroke(path)
  ctx.fillStyle = css(dark)
  ctx.beginPath()
  ctx.ellipse(at(rimY), rimY, STEM_TOP_W / 2, STEM_COLLAR, 0, 0, FULL_TURN)
  ctx.fill()
}
//
// Sideways bend of the stem at a height (none at the foot or the top).
//
function stemBend(y, rimY, groundY) {
  const t = (y - rimY) / (groundY - rimY)
  return Math.sin(Math.PI * t) * (Math.sin(t * Math.PI * 2 * STEM_BEND_TURNS) * STEM_BEND + Math.sin(t * Math.PI * 2 * STEM_BEND_FINE_TURNS) * STEM_BEND_FINE)
}
//
// Fibres running up the stem, wandering and forking, with lit lips, and a
// few pale specks.
//
function paintStemFibres(ctx, at, halfW, rimY, groundY, rng) {
  const [dark, , light] = CAVE_PAL.spore.stem
  for (let i = 0; i < STEM_FIBRES; i++) {
    const share = (i + HALF) / STEM_FIBRES * 2 - 1
    const pts = wander({ x: 0, y: groundY }, { x: 0, y: rimY }, rng).map(q => ({ x: at(q.y) + share * halfW(q.y) + q.x, y: q.y }))
    fibre(ctx, pts, dark, light)
    const from = pts[Math.floor(pts.length * (STEM_FIBRE_FORK_FROM + rng() * STEM_FIBRE_FORK_SPAN))]
    const len = (groundY - rimY) * STEM_FIBRE_FORK_LEN
    fibre(ctx, wander(from, { x: from.x + (rng() - HALF) * STEM_FIBRE_FORK_LEAN * 2, y: from.y - len }, rng), dark, light)
  }
  ctx.fillStyle = css(light, STEM_SPECK_ALPHA)
  for (let i = 0; i < STEM_SPECKS; i++) {
    const y = rimY + rng() * (groundY - rimY)
    ctx.fillRect(Math.round(at(y) + (rng() - HALF) * halfW(y) * 2), Math.round(y), 1, 1)
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
// The bell: skin, shade lower right, light upper left, mottles and cracks,
// the deep glowing holes, then the contour.
//
function paintCap(ctx, cx, capTop, rimY) {
  const [contour, shade, skin, light] = CAVE_PAL.spore.cap
  const dome = domePath(cx, capTop, rimY)
  ctx.save()
  ctx.fillStyle = css(skin)
  ctx.fill(dome)
  ctx.clip(dome)
  ctx.fillStyle = css(shade)
  ctx.beginPath()
  ctx.ellipse(cx + CAP_W * CAP_SHADE_SHIFT, rimY, CAP_W * CAP_SHADE_W, CAP_H * CAP_SHADE_H, 0, 0, FULL_TURN)
  ctx.fill()
  ctx.fillStyle = css(light)
  ctx.beginPath()
  ctx.ellipse(cx - CAP_W * CAP_LIGHT_SHIFT, capTop + CAP_H * CAP_LIGHT_Y, CAP_W * CAP_LIGHT_W, CAP_H * CAP_LIGHT_H, 0, 0, FULL_TURN)
  ctx.fill()
  const rng = createSeededRandom(GRAIN_SEED + 2)
  paintMottles(ctx, cx, capTop, rng)
  paintCracks(ctx, cx, capTop, rng)
  HOLES.forEach(hl => paintHole(ctx, cx + hl.u * CAP_W, capTop + hl.v * CAP_H, hl))
  ctx.restore()
  ctx.strokeStyle = css(contour)
  ctx.lineWidth = CONTOUR_W
  ctx.stroke(dome)
}
//
// Bell outline: its half-width at each height (body rounding up to the
// top, the rim flaring out at the bottom), pushed in and out in lumps.
//
function domePath(cx, capTop, rimY) {
  const half = CAP_W / 2
  const pts = []
  for (let i = 0; i <= DOME_STEPS; i++) {
    const v = i / DOME_STEPS
    pts.push({ x: cx - bellHalf(v) * half, y: rimY - v * (rimY - capTop) })
  }
  for (let i = DOME_STEPS - 1; i >= 0; i--) {
    const v = i / DOME_STEPS
    pts.push({ x: cx + bellHalf(v) * half, y: rimY - v * (rimY - capTop) })
  }
  const bumped = pts.map((q, i) => {
    const s = i / (pts.length - 1)
    const lump = Math.sin(s * Math.PI * DOME_BUMPS + DOME_BUMP_SEED) * Math.sin(Math.PI * s) * CAP_H * DOME_BUMP
    const dx = q.x - cx
    const dy = q.y - rimY
    const len = Math.hypot(dx, dy) || 1
    return { x: q.x + dx / len * lump, y: q.y + dy / len * lump }
  })
  const path = new Path2D()
  bumped.forEach((q, i) => (i ? path.lineTo(q.x, q.y) : path.moveTo(q.x, q.y)))
  path.closePath()
  return path
}
//
// Half-width of the bell (share of the cap's) at a height share from the rim.
//
function bellHalf(v) {
  return BELL_BODY * Math.pow(Math.max(0, 1 - Math.pow(v, BELL_POW)), BELL_ROUND) + BELL_FLARE * Math.pow(1 - v, BELL_FLARE_POW)
}
//
// Soft lighter and darker patches over the skin.
//
function paintMottles(ctx, cx, capTop, rng) {
  const [, shade, , , high] = CAVE_PAL.spore.cap
  for (let i = 0; i < MOTTLES; i++) {
    const r = MOTTLE_R_MIN + rng() * MOTTLE_R_RANGE
    ctx.fillStyle = css(i % 2 ? high : shade, MOTTLE_ALPHA)
    ctx.beginPath()
    ctx.ellipse(cx + (rng() - HALF) * CAP_W * CRACK_SPAN, capTop + rng() * CAP_H, r, r * MOTTLE_FLAT, rng() * Math.PI, 0, FULL_TURN)
    ctx.fill()
  }
}
//
// A net of fine cracks over the skin: each wanders a few steps from a
// random spot and forks now and then (thinner, shorter), with a pale lip
// below it.
//
function paintCracks(ctx, cx, capTop, rng) {
  const [contour, , , , high] = CAVE_PAL.spore.cap
  ctx.lineCap = 'round'
  for (let i = 0; i < CRACKS; i++) {
    const from = { x: cx + (rng() - HALF) * CAP_W * CRACK_SPAN, y: capTop + rng() * CAP_H }
    crack(ctx, from, rng() * FULL_TURN, CRACK_W, CRACK_DEPTH, rng, contour, high)
  }
}
function crack(ctx, from, heading, w, depth, rng, color, lip) {
  const pts = [from]
  let h = heading
  for (let i = 0; i < CRACK_STEPS; i++) {
    h += (rng() - HALF) * CRACK_TURN
    const p = pts[pts.length - 1]
    pts.push({ x: p.x + Math.cos(h) * CRACK_STEP, y: p.y + Math.sin(h) * CRACK_STEP })
  }
  ctx.lineWidth = w
  ctx.strokeStyle = css(lip, CRACK_LIP_ALPHA)
  ctx.beginPath()
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y + w) : ctx.moveTo(p.x, p.y + w)))
  ctx.stroke()
  ctx.strokeStyle = css(color, CRACK_ALPHA)
  ctx.beginPath()
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)))
  ctx.stroke()
  depth > 0 && rng() < CRACK_FORK_CHANCE && crack(ctx, pts[Math.floor(pts.length * HALF)], h + (rng() < HALF ? 1 : -1) * CRACK_TURN, w * HALF, depth - 1, rng, color, lip)
  depth > 0 && crack(ctx, pts[pts.length - 1], h, w, depth - 1, rng, color, lip)
}
//
// A tilted oval in a hole, dropped toward the hole's lower side.
//
function fillOval(ctx, x, y, tilt, fill, rx, ry, drop) {
  ctx.fillStyle = css(fill)
  ctx.beginPath()
  ctx.ellipse(x - Math.sin(tilt) * drop, y + Math.cos(tilt) * drop, rx, ry, tilt, 0, FULL_TURN)
  ctx.fill()
}
//
// One deep hole (tilted and narrowed toward the bell's sides): dark lip,
// the shadowed upper wall, the lit lower wall, the glowing heart low in it,
// a bright crescent at its lower edge and the cap's lit edge under it.
//
function paintHole(ctx, x, y, hl) {
  const pal = CAVE_PAL.spore
  const [contour, , , , high] = pal.cap
  const r = hl.r * HOLE_SIZE
  const rx = r * (1 - Math.abs(hl.u) * 2 * HOLE_EDGE_SQUEEZE * HALF)
  const ry = r * HOLE_SQUASH
  const tilt = hl.u * HOLE_TILT
  fillOval(ctx, x, y, tilt, contour, rx + HOLE_RIM, ry + HOLE_RIM, 0)
  fillOval(ctx, x, y, tilt, pal.holeRim, rx, ry, 0)
  fillOval(ctx, x, y, tilt, pal.hole, rx * HOLE_WALL, ry * HOLE_WALL, ry * HOLE_WALL_DROP)
  fillOval(ctx, x, y, tilt, pal.holeGlow, rx * HOLE_INNER, ry * HOLE_INNER, ry * HOLE_INNER_DROP)
  ctx.fillStyle = css(pal.spark)
  ctx.beginPath()
  ctx.ellipse(x, y + ry * HOLE_INNER * HALF, rx * HOLE_CRESCENT, ry * HOLE_CRESCENT * HALF, tilt, 0, Math.PI)
  ctx.fill()
  ctx.strokeStyle = css(high, HOLE_EDGE_LIT_ALPHA)
  ctx.lineWidth = HOLE_EDGE_LIT_W
  ctx.beginPath()
  ctx.ellipse(x, y, rx + HOLE_RIM + HOLE_EDGE_LIT_W, ry + HOLE_RIM + HOLE_EDGE_LIT_W, tilt, 0, Math.PI)
  ctx.stroke()
}
