import { CFG } from '../../../cfg.js'
import * as PolyBatch from '../../../utils/poly-batch.js'
import { createSeededRandom } from '../../../utils/seeded-random.js'
import { closeness, creatureColors, eyeVeins, addVeinedEye, addStalk, addThorns, addBlade, fillArc, makePoints } from '../utils/cave-creature-paint.js'
//
// The stalk-eye on the right ledge past the exit: the forest's stalk-eye
// grown hostile. A tall blood-red contoured stalk with a lit line — thorns
// along it instead of the forest one's little side buds — out of a tuft of
// blades, topped by one big bloodshot eye whose red veins run in deep
// toward its iris. Each joint sways a little behind the one below it. The
// eye watches the hero within WATCH_REACH (else looks about); as he comes
// closer (TENSE_FAR → TENSE_NEAR, eased at TENSE_EASE per second) it rears
// up straight, sways faster and its pupil shrinks to a point. Drawn live in
// one polygon batch, just behind the hero.
//
const Z = CFG.visual.zIndex.player - 0.5
const WATCH_REACH = 800
const TENSE_FAR = 600
const TENSE_NEAR = 200
const TENSE_EASE = 2
//
// Stalk: segments, segment length, widths, contour, lit line; at rest it
// leans REST_LEAN rad (toward the exit, where the hero comes from) and
// bows REST_BEND; tense, it stands up straight. Sway SWAY rad at
// SWAY_SPEED (faster by TENSE_SWAY_SPEED when tense), each joint
// SWAY_LAG behind the one below.
//
const SEGMENTS = 9
const SEG_LEN = 28
const W_BASE = 11
const W_TIP = 6
const CONTOUR_PAD = 2.4
const LIGHT_FRAC = 0.35
const REST_LEAN = -0.18
const REST_BEND = 0.3
const SWAY = 0.08
const SWAY_SPEED = 1.1
const TENSE_SWAY_SPEED = 2.4
const SWAY_LAG = 0.55
const THORNS = { step: 16, len: 15, tipLen: 9, from: 0.08, to: 0.9 }
//
// The eye: radius, contour, veins (reaching in to VEIN_INNER of the
// radius), pupil share (relaxed → tense), how far the pupil moves off
// centre, wander clock, look easing, blink clock.
//
const EYE_R = 22
const EYE_CONTOUR = 1.8
const EYE_VEINS = 4
const VEIN_INNER = 0.3
const PUPIL_RELAXED = 0.34
const PUPIL_TENSE = 0.2
const LOOK_FRAC = 0.42
const WANDER_MIN = 1.5
const WANDER_RANGE = 3
const LOOK_EASE = 6
const BLINK_MIN = 5
const BLINK_RANGE = 8
const BLINK_SEC = 0.26
const SEED = 4251
//
// Tuft of blades at its foot (`dx` off it, `angle`, `len`, widest `w`).
//
const BLADES = [
  { dx: -10, angle: -2.5, len: 44, w: 8, phase: 0.6 },
  { dx: -4, angle: -2, len: 60, w: 9, phase: 1.7 },
  { dx: 3, angle: -1.25, len: 54, w: 9, phase: 2.5 },
  { dx: 9, angle: -0.7, len: 38, w: 7, phase: 0.2 }
]
const BLADE_SEGMENTS = 8
const BLADE_BEND = 0.3
const BLADE_SWAY = 0.05
const BLADE_SWAY_SPEED = 1.2
const CULL_PAD = 80

/**
 * Creates the stalk-eye standing on the ground at a point.
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay instance
 * @param {number} cfg.x - Foot X (world)
 * @param {number} cfg.y - Foot Y (ground line)
 * @param {() => ({x: number, y: number}|null)} cfg.getHeroPos - Hero centre, null when there is none
 * @param {() => {left: number, top: number, right: number, bottom: number}} cfg.getView - Visible world rect
 * @returns {Object} Stalk-eye inst
 */
export function create(cfg) {
  const { k, x, y } = cfg
  const rng = createSeededRandom(SEED)
  const inst = {
    k,
    x,
    y,
    getHeroPos: cfg.getHeroPos,
    getView: cfg.getView,
    tension: 0,
    time: rng() * Math.PI * 2,
    pts: makePoints(SEGMENTS),
    blades: BLADES.map(def => ({ ...def, pts: makePoints(BLADE_SEGMENTS) })),
    eye: { x: 0, y: 0, r: EYE_R, lookX: 0, lookY: 0, pupilR: 0, close: 0, lidFromSide: true, veins: eyeVeins(rng, EYE_VEINS, VEIN_INNER) },
    wanderAt: 0,
    wanderX: 0,
    wanderY: 0,
    blinkWait: BLINK_MIN + rng() * BLINK_RANGE,
    blinkT: -1,
    batch: PolyBatch.create(),
    colors: creatureColors(k)
  }
  k.add([
    k.z(Z),
    {
      draw() {
        onDraw(inst)
      }
    }
  ])
  return inst
}

/**
 * Sways the stalk and turns the eye. Call once per frame.
 * @param {Object} inst - Stalk-eye inst
 */
export function onUpdate(inst) {
  const dt = inst.k.dt()
  const hero = inst.getHeroPos()
  const dist = hero ? Math.hypot(hero.x - inst.x, hero.y - inst.y) : Infinity
  inst.tension += (closeness(TENSE_FAR, TENSE_NEAR, dist) - inst.tension) * Math.min(1, dt * TENSE_EASE)
  inst.time += dt * (1 + (TENSE_SWAY_SPEED - 1) * inst.tension)
  poseStalk(inst)
  inst.blades.forEach(blade => poseBlade(inst, blade))
  aimEye(inst, hero, dist, dt)
  tickBlink(inst, dt)
}
//
// Joint by joint from the foot: each turns by its share of the bow and
// sways a little behind the one below; tension straightens it up.
//
function poseStalk(inst) {
  const pts = inst.pts
  const relax = 1 - inst.tension
  pts[0].x = inst.x
  pts[0].y = inst.y
  for (let i = 1; i <= SEGMENTS; i++) {
    const u = i / SEGMENTS
    const sway = Math.sin(inst.time * SWAY_SPEED - i * SWAY_LAG) * SWAY * u
    const a = -Math.PI / 2 + (REST_LEAN + REST_BEND * u) * relax + sway
    pts[i].x = pts[i - 1].x + Math.cos(a) * SEG_LEN
    pts[i].y = pts[i - 1].y + Math.sin(a) * SEG_LEN
  }
  inst.eye.x = pts[SEGMENTS].x
  inst.eye.y = pts[SEGMENTS].y
}
function poseBlade(inst, blade) {
  const sway = Math.sin(inst.time * BLADE_SWAY_SPEED + blade.phase) * BLADE_SWAY
  fillArc(blade.pts, inst.x + blade.dx, inst.y, blade.angle + sway, BLADE_BEND * Math.sign(Math.cos(blade.angle)), 1, blade.len / BLADE_SEGMENTS)
}
//
// The pupil glides onto the hero (in reach) or to a spot it looks at.
//
function aimEye(inst, hero, dist, dt) {
  const eye = inst.eye
  const reach = EYE_R * LOOK_FRAC
  let tx = inst.wanderX
  let ty = inst.wanderY
  if (hero && dist < WATCH_REACH) {
    const d = Math.hypot(hero.x - eye.x, hero.y - eye.y) || 1
    tx = (hero.x - eye.x) / d * reach
    ty = (hero.y - eye.y) / d * reach
  } else {
    tickWander(inst, reach)
  }
  const ease = Math.min(1, dt * LOOK_EASE)
  eye.lookX += (tx - eye.lookX) * ease
  eye.lookY += (ty - eye.lookY) * ease
  eye.pupilR = EYE_R * (PUPIL_RELAXED + (PUPIL_TENSE - PUPIL_RELAXED) * inst.tension)
}
function tickWander(inst, reach) {
  if (inst.k.time() < inst.wanderAt) return
  const a = Math.random() * Math.PI * 2
  const r = Math.random() * reach
  inst.wanderX = Math.cos(a) * r
  inst.wanderY = Math.sin(a) * r
  inst.wanderAt = inst.k.time() + WANDER_MIN + Math.random() * WANDER_RANGE
}
function tickBlink(inst, dt) {
  if (inst.blinkT >= 0) {
    inst.blinkT += dt / BLINK_SEC
    inst.blinkT >= 1 && (inst.blinkT = -1, inst.blinkWait = BLINK_MIN + Math.random() * BLINK_RANGE)
  } else {
    inst.blinkWait -= dt
    inst.blinkWait <= 0 && (inst.blinkT = 0)
  }
  inst.eye.close = inst.blinkT >= 0 ? Math.sin(Math.PI * inst.blinkT) : 0
}
//
// Blades, the stalk, its thorns, then the eye — one batch.
//
function onDraw(inst) {
  const view = inst.getView()
  if (inst.x + CULL_PAD < view.left || inst.x - CULL_PAD > view.right || inst.y < view.top || inst.y - SEGMENTS * SEG_LEN - CULL_PAD > view.bottom) return
  const { batch, colors } = inst
  addStalk(batch, inst.pts, W_BASE, W_TIP, colors, CONTOUR_PAD, LIGHT_FRAC)
  addThorns(batch, inst.pts, W_BASE, W_TIP, THORNS, colors)
  inst.blades.forEach(blade => addBlade(batch, blade.pts, blade.w, colors))
  addVeinedEye(batch, inst.eye, colors, EYE_CONTOUR)
  PolyBatch.flush(batch, inst.k)
}
